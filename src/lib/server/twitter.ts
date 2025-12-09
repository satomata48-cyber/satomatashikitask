import type { D1Database } from '@cloudflare/workers-types';
import crypto from 'crypto';

interface TwitterSettings {
	api_key: string;
	api_secret: string;
	access_token: string;
	access_token_secret: string;
}

function generateOAuthSignature(
	method: string,
	url: string,
	params: Record<string, string>,
	consumerSecret: string,
	tokenSecret: string
): string {
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

	const hmac = crypto.createHmac('sha1', signingKey);
	hmac.update(signatureBase);
	return hmac.digest('base64');
}

function generateOAuthHeader(
	method: string,
	url: string,
	settings: TwitterSettings
): string {
	const timestamp = Math.floor(Date.now() / 1000).toString();
	const nonce = Math.random().toString(36).substring(2, 15);

	const oauthParams: Record<string, string> = {
		oauth_consumer_key: settings.api_key,
		oauth_token: settings.access_token,
		oauth_signature_method: 'HMAC-SHA1',
		oauth_timestamp: timestamp,
		oauth_nonce: nonce,
		oauth_version: '1.0'
	};

	const signature = generateOAuthSignature(
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

export async function postTweet(
	settings: TwitterSettings,
	text: string
): Promise<{ tweetId?: string; error?: string }> {
	try {
		const url = 'https://api.twitter.com/2/tweets';
		const authHeader = generateOAuthHeader('POST', url, settings);

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

export async function getUserInfo(
	settings: TwitterSettings
): Promise<{ id: string; username: string; name: string; error?: string }> {
	try {
		const url = 'https://api.twitter.com/2/users/me';
		const authHeader = generateOAuthHeader('GET', url, settings);

		const response = await fetch(url, {
			method: 'GET',
			headers: {
				Authorization: authHeader
			}
		});

		const result = (await response.json()) as any;

		if (!response.ok) {
			console.error('Twitter API error:', result);
			return {
				id: '',
				username: '',
				name: '',
				error: result.detail || result.error?.message || `API Error: ${response.status}`
			};
		}

		return {
			id: result.data.id,
			username: result.data.username,
			name: result.data.name || result.data.username
		};
	} catch (err) {
		console.error('Get user info error:', err);
		return {
			id: '',
			username: '',
			name: '',
			error: err instanceof Error ? err.message : 'Unknown error'
		};
	}
}

export async function getTwitterSettings(
	db: D1Database,
	projectId: number
): Promise<TwitterSettings | null> {
	const settings = await db
		.prepare('SELECT * FROM twitter_settings WHERE project_id = ? AND enabled = 1')
		.bind(projectId)
		.first<TwitterSettings>();

	return settings;
}

// OAuth 1.0a Request Token取得
export async function getRequestToken(
	apiKey: string,
	apiSecret: string,
	callbackUrl: string
): Promise<{ requestToken: string; requestTokenSecret: string; error?: string }> {
	try {
		const url = 'https://api.twitter.com/oauth/request_token';
		const timestamp = Math.floor(Date.now() / 1000).toString();
		const nonce = Math.random().toString(36).substring(2, 15);

		const oauthParams: Record<string, string> = {
			oauth_consumer_key: apiKey,
			oauth_signature_method: 'HMAC-SHA1',
			oauth_timestamp: timestamp,
			oauth_nonce: nonce,
			oauth_version: '1.0',
			oauth_callback: callbackUrl
		};

		const signature = generateOAuthSignature('POST', url, oauthParams, apiSecret, '');
		oauthParams.oauth_signature = signature;

		const headerValue = Object.keys(oauthParams)
			.sort()
			.map((key) => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
			.join(', ');

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				Authorization: `OAuth ${headerValue}`
			}
		});

		const text = await response.text();

		if (!response.ok) {
			console.error('Request token error:', text);
			return {
				requestToken: '',
				requestTokenSecret: '',
				error: `Failed to get request token: ${response.status}`
			};
		}

		const params = new URLSearchParams(text);
		const requestToken = params.get('oauth_token') || '';
		const requestTokenSecret = params.get('oauth_token_secret') || '';

		if (!requestToken || !requestTokenSecret) {
			return {
				requestToken: '',
				requestTokenSecret: '',
				error: 'Invalid response from Twitter'
			};
		}

		return { requestToken, requestTokenSecret };
	} catch (err) {
		console.error('Get request token error:', err);
		return {
			requestToken: '',
			requestTokenSecret: '',
			error: err instanceof Error ? err.message : 'Unknown error'
		};
	}
}

// OAuth 1.0a Access Token取得
export async function getAccessToken(
	apiKey: string,
	apiSecret: string,
	requestToken: string,
	requestTokenSecret: string,
	oauthVerifier: string
): Promise<{
	accessToken: string;
	accessTokenSecret: string;
	userId: string;
	screenName: string;
	error?: string;
}> {
	try {
		const url = 'https://api.twitter.com/oauth/access_token';
		const timestamp = Math.floor(Date.now() / 1000).toString();
		const nonce = Math.random().toString(36).substring(2, 15);

		const oauthParams: Record<string, string> = {
			oauth_consumer_key: apiKey,
			oauth_token: requestToken,
			oauth_signature_method: 'HMAC-SHA1',
			oauth_timestamp: timestamp,
			oauth_nonce: nonce,
			oauth_version: '1.0',
			oauth_verifier: oauthVerifier
		};

		const signature = generateOAuthSignature(
			'POST',
			url,
			oauthParams,
			apiSecret,
			requestTokenSecret
		);
		oauthParams.oauth_signature = signature;

		const headerValue = Object.keys(oauthParams)
			.sort()
			.map((key) => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
			.join(', ');

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				Authorization: `OAuth ${headerValue}`
			}
		});

		const text = await response.text();

		if (!response.ok) {
			console.error('Access token error:', text);
			return {
				accessToken: '',
				accessTokenSecret: '',
				userId: '',
				screenName: '',
				error: `Failed to get access token: ${response.status}`
			};
		}

		const params = new URLSearchParams(text);
		const accessToken = params.get('oauth_token') || '';
		const accessTokenSecret = params.get('oauth_token_secret') || '';
		const userId = params.get('user_id') || '';
		const screenName = params.get('screen_name') || '';

		if (!accessToken || !accessTokenSecret) {
			return {
				accessToken: '',
				accessTokenSecret: '',
				userId: '',
				screenName: '',
				error: 'Invalid response from Twitter'
			};
		}

		return { accessToken, accessTokenSecret, userId, screenName };
	} catch (err) {
		console.error('Get access token error:', err);
		return {
			accessToken: '',
			accessTokenSecret: '',
			userId: '',
			screenName: '',
			error: err instanceof Error ? err.message : 'Unknown error'
		};
	}
}

// ユーザーの統計情報を取得 (Twitter API v1.1を使用)
export async function getUserStats(
	settings: TwitterSettings
): Promise<{
	followersCount: number;
	followingCount: number;
	tweetCount: number;
	listedCount: number;
	error?: string;
}> {
	try {
		// Twitter API v1.1のエンドポイント（OAuth 1.0aと完全互換）
		const url = 'https://api.twitter.com/1.1/account/verify_credentials.json';
		const authHeader = generateOAuthHeader('GET', url, settings);

		const response = await fetch(url, {
			method: 'GET',
			headers: {
				Authorization: authHeader
			}
		});

		const result = (await response.json()) as any;

		if (!response.ok) {
			console.error('Twitter API error:', result);
			return {
				followersCount: 0,
				followingCount: 0,
				tweetCount: 0,
				listedCount: 0,
				error: result.errors?.[0]?.message || `API Error: ${response.status}`
			};
		}

		return {
			followersCount: result.followers_count || 0,
			followingCount: result.friends_count || 0,
			tweetCount: result.statuses_count || 0,
			listedCount: result.listed_count || 0
		};
	} catch (err) {
		console.error('Get user stats error:', err);
		return {
			followersCount: 0,
			followingCount: 0,
			tweetCount: 0,
			listedCount: 0,
			error: err instanceof Error ? err.message : 'Unknown error'
		};
	}
}
