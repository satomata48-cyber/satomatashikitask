/**
 * Twitter Auto-Posting Cron Worker
 * Runs every 5 hours: 0:00, 5:00, 10:00, 15:00, 20:00 UTC
 */

import type { D1Database } from '@cloudflare/workers-types';

interface Env {
	DB: D1Database;
}

interface ScheduledPost {
	id: number;
	account_id: number;
	content: string;
	scheduled_at: string;
	project_id: number;
}

interface TwitterSettings {
	api_key: string;
	api_secret: string;
	access_token: string;
	access_token_secret: string;
}

async function generateOAuthSignature(
	method: string,
	url: string,
	params: Record<string, string>,
	consumerSecret: string,
	tokenSecret: string
): Promise<string> {
	const sortedParams = Object.keys(params)
		.sort()
		.map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
		.join('&');

	const signatureBase = [
		method.toUpperCase(),
		encodeURIComponent(url),
		encodeURIComponent(sortedParams)
	].join('&');

	const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

	const encoder = new TextEncoder();
	const keyData = encoder.encode(signingKey);
	const messageData = encoder.encode(signatureBase);

	const cryptoKey = await crypto.subtle.importKey(
		'raw',
		keyData,
		{ name: 'HMAC', hash: 'SHA-1' },
		false,
		['sign']
	);

	const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
	const signatureArray = Array.from(new Uint8Array(signature));
	return btoa(String.fromCharCode(...signatureArray));
}

async function generateOAuthHeader(
	method: string,
	url: string,
	settings: TwitterSettings
): Promise<string> {
	const timestamp = Math.floor(Date.now() / 1000).toString();
	const nonce = crypto.randomUUID().replace(/-/g, '');

	const oauthParams: Record<string, string> = {
		oauth_consumer_key: settings.api_key,
		oauth_token: settings.access_token,
		oauth_signature_method: 'HMAC-SHA1',
		oauth_timestamp: timestamp,
		oauth_nonce: nonce,
		oauth_version: '1.0'
	};

	const signature = await generateOAuthSignature(
		method,
		url,
		oauthParams,
		settings.api_secret,
		settings.access_token_secret
	);

	oauthParams.oauth_signature = signature;

	const headerValue = Object.keys(oauthParams)
		.sort()
		.map((key) => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
		.join(', ');

	return `OAuth ${headerValue}`;
}

async function postTweet(
	settings: TwitterSettings,
	text: string
): Promise<{ tweetId?: string; error?: string }> {
	try {
		const url = 'https://api.twitter.com/2/tweets';
		const authHeader = await generateOAuthHeader('POST', url, settings);

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				Authorization: authHeader,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ text })
		});

		const result = (await response.json()) as any;

		if (!response.ok) {
			console.error('Twitter API error:', result);
			return {
				error: result.detail || result.error?.message || `API Error: ${response.status}`
			};
		}

		return { tweetId: result.data.id };
	} catch (err) {
		console.error('Post tweet error:', err);
		return { error: err instanceof Error ? err.message : 'Unknown error' };
	}
}

async function processScheduledPosts(db: D1Database): Promise<void> {
	console.log('[Twitter Cron] Starting...');

	try {
		const result = await db
			.prepare(
				`
            SELECT
                sp.id, sp.account_id, sp.content, sp.scheduled_at,
                ta.project_id
            FROM twitter_scheduled_posts sp
            INNER JOIN twitter_accounts ta ON sp.account_id = ta.id
            WHERE sp.status = 'pending'
                AND sp.scheduled_at <= datetime('now')
            ORDER BY sp.scheduled_at ASC
            LIMIT 50
        `
			)
			.all<ScheduledPost>();

		const posts = result.results || [];
		console.log(`[Twitter Cron] Found ${posts.length} posts`);

		for (const post of posts) {
			try {
				const settingsResult = await db
					.prepare(
						`
                    SELECT api_key, api_secret, access_token, access_token_secret
                    FROM twitter_settings
                    WHERE project_id = ? AND enabled = 1
                `
					)
					.bind(post.project_id)
					.first<TwitterSettings>();

				if (!settingsResult) {
					await db
						.prepare(
							`
                        UPDATE twitter_scheduled_posts
                        SET status = 'failed',
                            error_message = 'Twitter API設定が見つかりません',
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `
						)
						.bind(post.id)
						.run();
					continue;
				}

				const result = await postTweet(settingsResult, post.content);

				if (result.error) {
					await db
						.prepare(
							`
                        UPDATE twitter_scheduled_posts
                        SET status = 'failed',
                            error_message = ?,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `
						)
						.bind(result.error, post.id)
						.run();
					continue;
				}

				console.log(`[Twitter Cron] Posted tweet ${post.id}, ID: ${result.tweetId}`);

				const insertResult = await db
					.prepare(
						`
                    INSERT INTO twitter_posts (account_id, tweet_id, content, posted_at)
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                `
					)
					.bind(post.account_id, result.tweetId, post.content)
					.run();

				await db
					.prepare(
						`
                    UPDATE twitter_scheduled_posts
                    SET status = 'posted',
                        posted_tweet_id = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `
					)
					.bind(insertResult.meta.last_row_id, post.id)
					.run();
			} catch (err) {
				console.error(`[Twitter Cron] Error processing post ${post.id}:`, err);
				const errorMessage = err instanceof Error ? err.message : 'Unknown error';
				await db
					.prepare(
						`
                    UPDATE twitter_scheduled_posts
                    SET status = 'failed',
                        error_message = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `
					)
					.bind(errorMessage, post.id)
					.run();
			}
		}

		console.log('[Twitter Cron] Completed');
	} catch (err) {
		console.error('[Twitter Cron] Fatal error:', err);
		throw err;
	}
}

export default {
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		console.log('[Twitter Cron] Triggered at:', new Date(event.scheduledTime).toISOString());
		await processScheduledPosts(env.DB);
	}
};
