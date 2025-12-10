import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/server/db';
import { getFacebookPages, getPageInsights } from '$lib/server/meta';

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

		return {
			project,
			hasMetaSettings: !!metaSettings,
			facebookPage
		};
	} catch (err) {
		console.error('Facebook analytics load error:', err);
		throw error(500, 'データの読み込みに失敗しました');
	}
};

export const actions: Actions = {
	// Facebookデータを更新
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

			// Facebookページを取得
			const pagesResult = await getFacebookPages(settings.access_token);

			if (pagesResult.error) {
				return fail(400, { error: `Facebook Error: ${pagesResult.error}` });
			}

			if (pagesResult.pages.length === 0) {
				return fail(400, { error: 'Facebookページが見つかりません' });
			}

			const page = pagesResult.pages[0];

			// ページ情報を保存
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

			return {
				success: true,
				message: `Facebookページ「${page.name}」のデータを更新しました`
			};
		} catch (err) {
			console.error('Refresh Facebook data error:', err);
			return fail(500, { error: 'データの更新に失敗しました' });
		}
	}
};
