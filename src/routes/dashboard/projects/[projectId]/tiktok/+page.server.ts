import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
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

		// TikTokアカウント情報を取得
		const account = await db
			.prepare('SELECT * FROM tiktok_accounts WHERE project_id = ? ORDER BY created_at DESC LIMIT 1')
			.bind(projectId)
			.first();

		// 最新の統計を取得
		let latestStats = null;
		if (account) {
			latestStats = await db
				.prepare('SELECT * FROM tiktok_stats WHERE account_id = ? ORDER BY recorded_date DESC LIMIT 1')
				.bind(account.id)
				.first();
		}

		return {
			project,
			account,
			latestStats
		};
	} catch (err) {
		console.error('TikTok settings load error:', err);
		throw error(500, 'データの読み込みに失敗しました');
	}
};

export const actions: Actions = {
	saveAccount: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const username = data.get('username')?.toString();
		const displayName = data.get('display_name')?.toString() || null;
		const accountId = data.get('account_id')?.toString() || username;

		if (!username) {
			return fail(400, { error: 'ユーザー名を入力してください' });
		}

		try {
			// 既存のアカウントを確認
			const existing = await db
				.prepare('SELECT id FROM tiktok_accounts WHERE project_id = ?')
				.bind(projectId)
				.first<{ id: number }>();

			if (existing) {
				// 更新
				await db
					.prepare(`
						UPDATE tiktok_accounts
						SET username = ?, display_name = ?, account_id = ?, updated_at = CURRENT_TIMESTAMP
						WHERE id = ?
					`)
					.bind(username, displayName, accountId, existing.id)
					.run();
			} else {
				// 新規作成
				await db
					.prepare(`
						INSERT INTO tiktok_accounts (project_id, account_id, username, display_name)
						VALUES (?, ?, ?, ?)
					`)
					.bind(projectId, accountId, username, displayName)
					.run();
			}

			return { success: true };
		} catch (err) {
			console.error('Save TikTok account error:', err);
			return fail(500, { error: 'アカウント情報の保存に失敗しました' });
		}
	},

	updateStats: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const followersCount = parseInt(data.get('followers_count')?.toString() || '0');
		const followingCount = parseInt(data.get('following_count')?.toString() || '0');
		const likesCount = parseInt(data.get('likes_count')?.toString() || '0');
		const videoCount = parseInt(data.get('video_count')?.toString() || '0');

		try {
			// アカウント取得
			const account = await db
				.prepare('SELECT id FROM tiktok_accounts WHERE project_id = ?')
				.bind(projectId)
				.first<{ id: number }>();

			if (!account) {
				return fail(400, { error: 'アカウントを先に登録してください' });
			}

			// 今日の日付
			const today = new Date().toISOString().split('T')[0];

			// 統計を保存（同じ日付の場合は更新）
			await db
				.prepare(`
					INSERT INTO tiktok_stats (account_id, followers_count, following_count, likes_count, video_count, recorded_date)
					VALUES (?, ?, ?, ?, ?, ?)
					ON CONFLICT(account_id, recorded_date) DO UPDATE SET
						followers_count = excluded.followers_count,
						following_count = excluded.following_count,
						likes_count = excluded.likes_count,
						video_count = excluded.video_count
				`)
				.bind(account.id, followersCount, followingCount, likesCount, videoCount, today)
				.run();

			return { success: true };
		} catch (err) {
			console.error('Update TikTok stats error:', err);
			return fail(500, { error: '統計の保存に失敗しました' });
		}
	}
};
