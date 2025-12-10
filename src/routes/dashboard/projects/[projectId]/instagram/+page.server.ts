import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/server/db';
import { getInstagramAccounts, getInstagramMedia } from '$lib/server/meta';

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

		// Meta API設定を取得
		let metaSettings: any = null;
		try {
			metaSettings = await db
				.prepare('SELECT * FROM meta_api_settings WHERE project_id = ? AND enabled = 1')
				.bind(projectId)
				.first();
		} catch {
			// Table may not exist
		}

		// Instagram Business Account情報を取得
		let instagramAccount: any = null;
		try {
			instagramAccount = await db
				.prepare('SELECT * FROM instagram_business_accounts WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1')
				.bind(projectId)
				.first();
		} catch {
			// Table may not exist
		}

		// Instagramメディア（投稿）を取得
		let instagramMedia: any[] = [];
		if (instagramAccount) {
			try {
				const mediaRows = await db
					.prepare(`
						SELECT * FROM instagram_media
						WHERE account_id = ?
						ORDER BY timestamp DESC
						LIMIT 50
					`)
					.bind(instagramAccount.id)
					.all();
				instagramMedia = mediaRows.results || [];
			} catch {
				// Table may not exist
			}
		}

		// 統計データを計算
		let stats = {
			totalLikes: 0,
			totalComments: 0,
			avgLikes: 0,
			avgComments: 0,
			engagementRate: 0
		};

		if (instagramMedia.length > 0) {
			stats.totalLikes = instagramMedia.reduce((sum: number, m: any) => sum + (m.like_count || 0), 0);
			stats.totalComments = instagramMedia.reduce((sum: number, m: any) => sum + (m.comments_count || 0), 0);
			stats.avgLikes = Math.round(stats.totalLikes / instagramMedia.length);
			stats.avgComments = Math.round(stats.totalComments / instagramMedia.length);
			if (instagramAccount?.followers_count > 0) {
				stats.engagementRate = ((stats.avgLikes + stats.avgComments) / instagramAccount.followers_count * 100);
			}
		}

		return {
			project,
			hasMetaSettings: !!metaSettings,
			instagramAccount,
			instagramMedia,
			stats
		};
	} catch (err) {
		console.error('Instagram analytics load error:', err);
		throw error(500, 'データの読み込みに失敗しました');
	}
};

export const actions: Actions = {
	// Instagramデータを更新
	refreshData: async ({ locals, platform, params }) => {
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
				.first<{ access_token: string }>();

			if (!settings) {
				return fail(400, { error: 'Meta API設定を先に登録してください（SNS管理ページ）' });
			}

			// Facebookページを取得してInstagramアカウントを更新
			const pagesResponse = await fetch(
				`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token&access_token=${settings.access_token}`
			);
			const pagesData = await pagesResponse.json();

			if (pagesData.error) {
				return fail(400, { error: `API Error: ${pagesData.error.message}` });
			}

			if (!pagesData.data || pagesData.data.length === 0) {
				return fail(400, { error: 'Facebookページが見つかりません。SNS管理ページでMeta APIを設定してください。' });
			}

			const page = pagesData.data[0];

			// Instagram Business Accountを取得
			const igResult = await getInstagramAccounts(page.access_token, page.id);

			if (igResult.error) {
				return fail(400, { error: `Instagram Error: ${igResult.error}` });
			}

			if (!igResult.account) {
				return fail(400, { error: 'Instagramビジネスアカウントが見つかりません' });
			}

			const igAccount = igResult.account;

			// アカウント情報を保存
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

			// メディアを取得
			const mediaResult = await getInstagramMedia(igAccount.id, page.access_token, 50);

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
				}
			}

			return {
				success: true,
				message: `@${igAccount.username} のデータを更新しました（${mediaResult.media.length}件のメディア）`
			};
		} catch (err) {
			console.error('Refresh Instagram data error:', err);
			return fail(500, { error: 'データの更新に失敗しました' });
		}
	}
};
