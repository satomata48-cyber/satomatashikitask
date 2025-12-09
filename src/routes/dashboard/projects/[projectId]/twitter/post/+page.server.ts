import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/server/db';
import { postTweet, getTwitterSettings } from '$lib/server/twitter';

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

		// Twitterアカウント情報を取得
		const account = await db
			.prepare('SELECT * FROM twitter_accounts WHERE project_id = ? ORDER BY created_at DESC LIMIT 1')
			.bind(projectId)
			.first<{
				id: number;
				username: string;
				name: string | null;
				access_token: string | null;
			}>();

		if (!account) {
			throw redirect(303, `/dashboard/projects/${projectId}/twitter`);
		}

		// 予約投稿一覧を取得
		const scheduledPosts = await db
			.prepare(`
				SELECT * FROM twitter_scheduled_posts
				WHERE account_id = ? AND status = 'pending'
				ORDER BY scheduled_at ASC
			`)
			.bind(account.id)
			.all();

		// 投稿履歴を取得（最新10件）
		const recentPosts = await db
			.prepare(`
				SELECT * FROM twitter_posts
				WHERE account_id = ?
				ORDER BY posted_at DESC
				LIMIT 10
			`)
			.bind(account.id)
			.all();

		// 今月の投稿数を集計
		const today = new Date();
		const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
			.toISOString()
			.split('T')[0];

		const monthlyCount = await db
			.prepare(`
				SELECT COUNT(*) as count FROM twitter_posts
				WHERE account_id = ? AND posted_at >= ?
			`)
			.bind(account.id, firstDayOfMonth)
			.first<{ count: number }>();

		return {
			project,
			account,
			scheduledPosts: scheduledPosts.results,
			recentPosts: recentPosts.results,
			monthlyPostCount: monthlyCount?.count || 0,
			monthlyLimit: 500 // Twitter API無料プラン
		};
	} catch (err) {
		console.error('Twitter post page load error:', err);
		throw error(500, 'データの読み込みに失敗しました');
	}
};

export const actions: Actions = {
	// リアルタイム投稿
	postNow: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const content = data.get('content')?.toString();

		if (!content || content.trim().length === 0) {
			return fail(400, { error: 'ツイート内容を入力してください' });
		}

		if (content.length > 280) {
			return fail(400, { error: 'ツイートは280文字以内で入力してください' });
		}

		try {
			// アカウント取得
			const account = await db
				.prepare('SELECT * FROM twitter_accounts WHERE project_id = ?')
				.bind(projectId)
				.first<{ id: number }>();

			if (!account) {
				return fail(400, { error: 'Twitterアカウントを先に登録してください' });
			}

			// Twitter API設定取得
			const settings = await getTwitterSettings(db, projectId);

			if (!settings) {
				return fail(400, { error: 'Twitter API設定を先に登録してください' });
			}

			// Twitter APIで投稿
			const result = await postTweet(settings, content);

			if (result.error) {
				return fail(500, { error: `ツイートの投稿に失敗しました: ${result.error}` });
			}

			// DBに保存
			await db
				.prepare(`
					INSERT INTO twitter_posts (account_id, tweet_id, content, posted_at)
					VALUES (?, ?, ?, CURRENT_TIMESTAMP)
				`)
				.bind(account.id, result.tweetId, content)
				.run();

			return { success: true, message: 'ツイートを投稿しました' };
		} catch (err) {
			console.error('Post tweet error:', err);
			return fail(500, { error: 'ツイートの投稿に失敗しました' });
		}
	},

	// 予約投稿作成
	schedulePost: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const content = data.get('content')?.toString();
		const scheduledDate = data.get('scheduled_date')?.toString();
		const scheduledTime = data.get('scheduled_time')?.toString();

		if (!content || content.trim().length === 0) {
			return fail(400, { error: 'ツイート内容を入力してください' });
		}

		if (content.length > 280) {
			return fail(400, { error: 'ツイートは280文字以内で入力してください' });
		}

		if (!scheduledDate || !scheduledTime) {
			return fail(400, { error: '予約日時を指定してください' });
		}

		try {
			// アカウント取得
			const account = await db
				.prepare('SELECT id FROM twitter_accounts WHERE project_id = ?')
				.bind(projectId)
				.first<{ id: number }>();

			if (!account) {
				return fail(400, { error: 'Twitterアカウントを先に登録してください' });
			}

			// 日時を結合
			const scheduledAt = `${scheduledDate}T${scheduledTime}:00`;
			const scheduledDateTime = new Date(scheduledAt);

			// 過去の日時チェック
			if (scheduledDateTime <= new Date()) {
				return fail(400, { error: '未来の日時を指定してください' });
			}

			// 予約投稿を保存
			await db
				.prepare(`
					INSERT INTO twitter_scheduled_posts (account_id, content, scheduled_at, status)
					VALUES (?, ?, ?, 'pending')
				`)
				.bind(account.id, content, scheduledAt)
				.run();

			return { success: true, message: '予約投稿を作成しました' };
		} catch (err) {
			console.error('Schedule post error:', err);
			return fail(500, { error: '予約投稿の作成に失敗しました' });
		}
	},

	// 予約投稿削除
	deleteScheduled: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const postId = parseInt(data.get('post_id')?.toString() || '0');

		try {
			await db
				.prepare('DELETE FROM twitter_scheduled_posts WHERE id = ?')
				.bind(postId)
				.run();

			return { success: true, message: '予約投稿を削除しました' };
		} catch (err) {
			console.error('Delete scheduled post error:', err);
			return fail(500, { error: '予約投稿の削除に失敗しました' });
		}
	}
};
