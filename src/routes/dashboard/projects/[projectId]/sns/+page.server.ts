import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/server/db';
import {
	getFacebookPages,
	getInstagramAccounts,
	getInstagramMedia,
	getThreadsPosts,
	debugToken
} from '$lib/server/meta';

export const load: PageServerLoad = async ({ locals, platform, params }) => {
	if (!locals.userId) {
		throw redirect(303, '/login');
	}

	const db = getDB(platform);
	const userId = locals.userId;
	const projectId = parseInt(params.projectId);

	try {
		// プロジェクト情報を取得
		const project = await db
			.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
			.bind(projectId, userId)
			.first();

		if (!project) {
			throw error(404, 'プロジェクトが見つかりません');
		}

		// YouTube統計を取得
		let youtubeChannel = null;
		try {
			youtubeChannel = await db
				.prepare(`
					SELECT yc.*, ys.subscriber_count, ys.view_count, ys.video_count
					FROM youtube_channels yc
					LEFT JOIN youtube_stats ys ON yc.id = ys.channel_id
					WHERE yc.project_id = ?
					ORDER BY ys.recorded_date DESC
					LIMIT 1
				`)
				.bind(projectId)
				.first();
		} catch {
			// Table may not exist
		}

		// Instagram統計を取得（存在する場合）
		let instagramAccount = null;
		try {
			instagramAccount = await db
				.prepare(`
					SELECT ia.*, ist.followers_count, ist.media_count
					FROM instagram_accounts ia
					LEFT JOIN instagram_stats ist ON ia.id = ist.account_id
					WHERE ia.project_id = ?
					ORDER BY ist.recorded_date DESC
					LIMIT 1
				`)
				.bind(projectId)
				.first();
		} catch {
			// Table may not exist
		}

		// Twitter/X統計を取得
		let twitterAccount = null;
		try {
			twitterAccount = await db
				.prepare(`
					SELECT ta.*, ts.followers_count, ts.following_count, ts.tweet_count
					FROM twitter_accounts ta
					LEFT JOIN twitter_stats ts ON ta.id = ts.account_id
					WHERE ta.project_id = ?
					ORDER BY ts.recorded_date DESC
					LIMIT 1
				`)
				.bind(projectId)
				.first();
		} catch {
			// Table may not exist
		}

		// TikTok統計を取得
		let tiktokAccount = null;
		try {
			tiktokAccount = await db
				.prepare(`
					SELECT ta.*, ts.followers_count, ts.following_count, ts.likes_count, ts.video_count
					FROM tiktok_accounts ta
					LEFT JOIN tiktok_stats ts ON ta.id = ts.account_id
					WHERE ta.project_id = ?
					ORDER BY ts.recorded_date DESC
					LIMIT 1
				`)
				.bind(projectId)
				.first();
		} catch {
			// Table may not exist
		}

		// Meta API設定を取得
		let metaSettings: any = null;
		try {
			metaSettings = await db
				.prepare('SELECT id, app_id, enabled FROM meta_api_settings WHERE project_id = ?')
				.bind(projectId)
				.first();
		} catch {
			// Table may not exist
		}

		// Facebook Page情報を取得
		let facebookPage: any = null;
		try {
			facebookPage = await db
				.prepare('SELECT * FROM facebook_pages WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1')
				.bind(projectId)
				.first();
		} catch {
			// Table may not exist
		}

		// Instagram Business Account情報を取得
		let instagramBusinessAccount: any = null;
		try {
			instagramBusinessAccount = await db
				.prepare('SELECT * FROM instagram_business_accounts WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1')
				.bind(projectId)
				.first();
		} catch {
			// Table may not exist
		}

		return {
			project,
			youtubeChannel,
			instagramAccount,
			twitterAccount,
			tiktokAccount,
			metaSettings: metaSettings
				? {
						hasSettings: true,
						app_id_last4: metaSettings.app_id?.slice(-4),
						enabled: metaSettings.enabled === 1
					}
				: { hasSettings: false },
			facebookPage,
			instagramBusinessAccount
		};
	} catch (err) {
		console.error('SNS load error:', err);
		throw error(500, 'データの読み込みに失敗しました');
	}
};

export const actions: Actions = {
	// Meta API設定を保存
	saveMetaSettings: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();

		const appId = data.get('app_id')?.toString().trim();
		const appSecret = data.get('app_secret')?.toString().trim();
		const accessToken = data.get('access_token')?.toString().trim();

		if (!appId || !appSecret || !accessToken) {
			return fail(400, { error: 'すべてのフィールドを入力してください' });
		}

		try {
			// トークンの有効性を確認
			const tokenDebug = await debugToken(accessToken, appId, appSecret);
			if (!tokenDebug.valid) {
				return fail(400, { error: 'アクセストークンが無効です' });
			}

			// 設定を保存
			await db
				.prepare(`
					INSERT INTO meta_api_settings (project_id, app_id, app_secret, access_token, token_expires_at, updated_at)
					VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
					ON CONFLICT(project_id) DO UPDATE SET
						app_id = excluded.app_id,
						app_secret = excluded.app_secret,
						access_token = excluded.access_token,
						token_expires_at = excluded.token_expires_at,
						updated_at = CURRENT_TIMESTAMP
				`)
				.bind(
					projectId,
					appId,
					appSecret,
					accessToken,
					tokenDebug.expiresAt ? tokenDebug.expiresAt.toISOString() : null
				)
				.run();

			return { success: true, message: 'Meta API設定を保存しました' };
		} catch (err) {
			console.error('Save Meta settings error:', err);
			return fail(500, { error: '設定の保存に失敗しました' });
		}
	},

	// Facebook/Instagram/Threadsのデータを取得
	fetchMetaData: async ({ locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);

		try {
			// Meta API設定を取得
			const settings = await db
				.prepare('SELECT * FROM meta_api_settings WHERE project_id = ? AND enabled = 1')
				.bind(projectId)
				.first<{ access_token: string; app_id: string; app_secret: string }>();

			if (!settings) {
				return fail(400, { error: 'Meta API設定を先に登録してください' });
			}

			let results = {
				facebook: { success: false, message: '' },
				instagram: { success: false, message: '' },
				threads: { success: false, message: '' }
			};

			// 1. Facebookページを取得
			const pagesResult = await getFacebookPages(settings.access_token);
			if (pagesResult.error) {
				results.facebook.message = `エラー: ${pagesResult.error}`;
			} else if (pagesResult.pages.length > 0) {
				// 最初のページを保存
				const page = pagesResult.pages[0];
				await db
					.prepare(`
						INSERT INTO facebook_pages (project_id, page_id, page_name, page_access_token, category, followers_count, updated_at)
						VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
						ON CONFLICT(project_id, page_id) DO UPDATE SET
							page_name = excluded.page_name,
							page_access_token = excluded.page_access_token,
							category = excluded.category,
							followers_count = excluded.followers_count,
							updated_at = CURRENT_TIMESTAMP
					`)
					.bind(
						projectId,
						page.id,
						page.name,
						page.access_token,
						page.category || null,
						page.followers_count || 0
					)
					.run();

				results.facebook.success = true;
				results.facebook.message = `ページ「${page.name}」を取得しました`;

				// 2. Instagram Business Accountを取得
				const igResult = await getInstagramAccounts(page.access_token, page.id);
				if (igResult.error) {
					results.instagram.message = `エラー: ${igResult.error}`;
				} else if (igResult.account) {
					const igAccount = igResult.account;
					await db
						.prepare(`
							INSERT INTO instagram_business_accounts (
								project_id, instagram_account_id, username,
								followers_count, follows_count, media_count, profile_picture_url, updated_at
							)
							VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
							ON CONFLICT(project_id, instagram_account_id) DO UPDATE SET
								username = excluded.username,
								followers_count = excluded.followers_count,
								follows_count = excluded.follows_count,
								media_count = excluded.media_count,
								profile_picture_url = excluded.profile_picture_url,
								updated_at = CURRENT_TIMESTAMP
						`)
						.bind(
							projectId,
							igAccount.id,
							igAccount.username,
							igAccount.followers_count || 0,
							igAccount.follows_count || 0,
							igAccount.media_count || 0,
							igAccount.profile_picture_url || null
						)
						.run();

					// Instagramメディアを取得
					const mediaResult = await getInstagramMedia(igAccount.id, page.access_token, 25);
					if (!mediaResult.error && mediaResult.media.length > 0) {
						const accountRow = await db
							.prepare('SELECT id FROM instagram_business_accounts WHERE instagram_account_id = ?')
							.bind(igAccount.id)
							.first<{ id: number }>();

						if (accountRow) {
							for (const media of mediaResult.media) {
								await db
									.prepare(`
										INSERT INTO instagram_media (
											account_id, media_id, media_type, media_url, permalink,
											caption, like_count, comments_count, timestamp, created_at
										)
										VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
										ON CONFLICT(account_id, media_id) DO UPDATE SET
											like_count = excluded.like_count,
											comments_count = excluded.comments_count
									`)
									.bind(
										accountRow.id,
										media.id,
										media.media_type || null,
										media.media_url || null,
										media.permalink || null,
										media.caption || null,
										media.like_count || 0,
										media.comments_count || 0,
										media.timestamp || null
									)
									.run();
							}
							results.instagram.success = true;
							results.instagram.message = `@${igAccount.username} (${mediaResult.media.length}件のメディア)`;
						}
					} else {
						results.instagram.success = true;
						results.instagram.message = `@${igAccount.username} (メディアなし)`;
					}
				}
			} else {
				results.facebook.message = 'Facebookページが見つかりません';
			}

			// 3. Threadsの投稿を取得
			const threadsResult = await getThreadsPosts(settings.access_token, 'me', 25);
			if (threadsResult.error) {
				results.threads.message = `エラー: ${threadsResult.error}`;
			} else if (threadsResult.threads.length > 0) {
				for (const thread of threadsResult.threads) {
					await db
						.prepare(`
							INSERT INTO threads_posts (
								project_id, thread_id, text, permalink, timestamp,
								like_count, reply_count, quote_count, repost_count, views, created_at
							)
							VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
							ON CONFLICT(project_id, thread_id) DO UPDATE SET
								like_count = excluded.like_count,
								reply_count = excluded.reply_count,
								quote_count = excluded.quote_count,
								repost_count = excluded.repost_count,
								views = excluded.views
						`)
						.bind(
							projectId,
							thread.id,
							thread.text || null,
							thread.permalink || null,
							thread.timestamp || null,
							thread.like_count || 0,
							thread.reply_count || 0,
							thread.quote_count || 0,
							thread.repost_count || 0,
							thread.views || 0
						)
						.run();
				}
				results.threads.success = true;
				results.threads.message = `${threadsResult.threads.length}件の投稿を取得しました`;
			} else {
				results.threads.message = 'Threads投稿が見つかりません';
			}

			const summary = [
				results.facebook.success ? `Facebook: ${results.facebook.message}` : null,
				results.instagram.success ? `Instagram: ${results.instagram.message}` : null,
				results.threads.success ? `Threads: ${results.threads.message}` : null
			].filter(Boolean).join(' | ');

			return {
				success: true,
				message: summary || 'データを取得しました',
				results
			};
		} catch (err) {
			console.error('Fetch Meta data error:', err);
			return fail(500, { error: 'データの取得に失敗しました' });
		}
	}
};
