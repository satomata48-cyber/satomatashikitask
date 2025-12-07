import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDB } from '$lib/server/db';

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
			.prepare('SELECT id, title FROM projects WHERE id = ? AND user_id = ?')
			.bind(projectId, userId)
			.first<{ id: number; title: string }>();

		if (!project) {
			throw redirect(303, '/dashboard');
		}

		// Instagram設定を取得
		const settings = await db
			.prepare('SELECT * FROM instagram_settings WHERE project_id = ?')
			.bind(projectId)
			.first<{
				id: number;
				access_token: string | null;
				instagram_business_account_id: string | null;
				facebook_page_id: string | null;
				enabled: number;
			}>();

		// Instagramアカウント情報を取得
		let instagramAccount = null;
		let instagramStats = null;
		let instagramPosts: any[] = [];

		if (settings?.instagram_business_account_id) {
			instagramAccount = await db
				.prepare('SELECT * FROM instagram_accounts WHERE project_id = ? ORDER BY created_at DESC LIMIT 1')
				.bind(projectId)
				.first();

			if (instagramAccount) {
				// 最新の統計を取得
				instagramStats = await db
					.prepare('SELECT * FROM instagram_stats WHERE account_id = ? ORDER BY recorded_date DESC LIMIT 1')
					.bind(instagramAccount.id)
					.first();

				// 最新の投稿を取得（トップ10）
				const postsResult = await db
					.prepare(`
						SELECT p.*, ps.like_count, ps.comment_count, ps.impressions, ps.reach
						FROM instagram_posts p
						LEFT JOIN instagram_post_stats ps ON p.id = ps.post_id
							AND ps.recorded_date = (SELECT MAX(recorded_date) FROM instagram_post_stats WHERE post_id = p.id)
						WHERE p.account_id = ?
						ORDER BY p.timestamp DESC
						LIMIT 10
					`)
					.bind(instagramAccount.id)
					.all();

				instagramPosts = postsResult.results;
			}
		}

		// Facebookページ情報を取得
		let facebookPage = null;
		let facebookStats = null;
		let facebookPosts: any[] = [];

		if (settings?.facebook_page_id) {
			facebookPage = await db
				.prepare('SELECT * FROM facebook_pages WHERE project_id = ? ORDER BY created_at DESC LIMIT 1')
				.bind(projectId)
				.first();

			if (facebookPage) {
				// 最新の統計を取得
				facebookStats = await db
					.prepare('SELECT * FROM facebook_stats WHERE page_id = ? ORDER BY recorded_date DESC LIMIT 1')
					.bind(facebookPage.id)
					.first();

				// 最新の投稿を取得（トップ10）
				const postsResult = await db
					.prepare(`
						SELECT p.*, ps.reactions_count, ps.comments_count, ps.shares_count, ps.impressions, ps.reach
						FROM facebook_posts p
						LEFT JOIN facebook_post_stats ps ON p.id = ps.post_id
							AND ps.recorded_date = (SELECT MAX(recorded_date) FROM facebook_post_stats WHERE post_id = p.id)
						WHERE p.page_id = ?
						ORDER BY p.created_time DESC
						LIMIT 10
					`)
					.bind(facebookPage.id)
					.all();

				facebookPosts = postsResult.results;
			}
		}

		return {
			project,
			settings: settings ? {
				...settings,
				enabled: Boolean(settings.enabled)
			} : null,
			instagramAccount,
			instagramStats,
			instagramPosts,
			facebookPage,
			facebookStats,
			facebookPosts
		};
	} catch (err) {
		console.error('Instagram page load error:', err);
		throw redirect(303, '/dashboard');
	}
};

export const actions: Actions = {
	saveAccessToken: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const accessToken = data.get('access_token')?.toString();

		if (!accessToken) {
			return fail(400, { error: 'アクセストークンを入力してください' });
		}

		try {
			// 既存の設定を確認
			const existing = await db
				.prepare('SELECT id FROM instagram_settings WHERE project_id = ?')
				.bind(projectId)
				.first<{ id: number }>();

			if (existing) {
				// 更新
				await db
					.prepare('UPDATE instagram_settings SET access_token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
					.bind(accessToken, existing.id)
					.run();
			} else {
				// 新規作成
				await db
					.prepare('INSERT INTO instagram_settings (user_id, project_id, access_token) VALUES (?, ?, ?)')
					.bind(locals.userId, projectId, accessToken)
					.run();
			}

			return { success: true };
		} catch (err) {
			console.error('Save access token error:', err);
			return fail(500, { error: 'アクセストークンの保存に失敗しました' });
		}
	},

	connectInstagram: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const instagramBusinessAccountId = data.get('instagram_business_account_id')?.toString();

		if (!instagramBusinessAccountId) {
			return fail(400, { error: 'Instagramビジネスアカウント IDを入力してください' });
		}

		try {
			// 設定を更新
			const existing = await db
				.prepare('SELECT id FROM instagram_settings WHERE project_id = ?')
				.bind(projectId)
				.first<{ id: number }>();

			if (existing) {
				await db
					.prepare('UPDATE instagram_settings SET instagram_business_account_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
					.bind(instagramBusinessAccountId, existing.id)
					.run();
			} else {
				await db
					.prepare('INSERT INTO instagram_settings (user_id, project_id, instagram_business_account_id) VALUES (?, ?, ?)')
					.bind(locals.userId, projectId, instagramBusinessAccountId)
					.run();
			}

			return { success: true };
		} catch (err) {
			console.error('Connect Instagram error:', err);
			return fail(500, { error: 'Instagramアカウントの接続に失敗しました' });
		}
	},

	connectFacebook: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const facebookPageId = data.get('facebook_page_id')?.toString();

		if (!facebookPageId) {
			return fail(400, { error: 'FacebookページIDを入力してください' });
		}

		try {
			// 設定を更新
			const existing = await db
				.prepare('SELECT id FROM instagram_settings WHERE project_id = ?')
				.bind(projectId)
				.first<{ id: number }>();

			if (existing) {
				await db
					.prepare('UPDATE instagram_settings SET facebook_page_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
					.bind(facebookPageId, existing.id)
					.run();
			} else {
				await db
					.prepare('INSERT INTO instagram_settings (user_id, project_id, facebook_page_id) VALUES (?, ?, ?)')
					.bind(locals.userId, projectId, facebookPageId)
					.run();
			}

			return { success: true };
		} catch (err) {
			console.error('Connect Facebook error:', err);
			return fail(500, { error: 'Facebookページの接続に失敗しました' });
		}
	}
};
