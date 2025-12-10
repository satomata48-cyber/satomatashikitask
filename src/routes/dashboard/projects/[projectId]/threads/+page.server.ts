import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/server/db';
import { getThreadsPosts } from '$lib/server/meta';

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

		// Threads投稿を取得
		let threadsPosts: any[] = [];
		try {
			const postsResult = await db
				.prepare(`
					SELECT * FROM threads_posts
					WHERE project_id = ?
					ORDER BY timestamp DESC
					LIMIT 50
				`)
				.bind(projectId)
				.all();
			threadsPosts = postsResult.results || [];
		} catch {
			// Table may not exist
		}

		// 統計データを計算
		let stats = {
			totalPosts: threadsPosts.length,
			totalLikes: 0,
			totalReplies: 0,
			totalViews: 0,
			avgLikes: 0,
			avgReplies: 0
		};

		if (threadsPosts.length > 0) {
			stats.totalLikes = threadsPosts.reduce((sum: number, p: any) => sum + (p.like_count || 0), 0);
			stats.totalReplies = threadsPosts.reduce((sum: number, p: any) => sum + (p.reply_count || 0), 0);
			stats.totalViews = threadsPosts.reduce((sum: number, p: any) => sum + (p.views || 0), 0);
			stats.avgLikes = Math.round(stats.totalLikes / threadsPosts.length);
			stats.avgReplies = Math.round(stats.totalReplies / threadsPosts.length);
		}

		return {
			project,
			hasMetaSettings: !!metaSettings,
			threadsPosts,
			stats
		};
	} catch (err) {
		console.error('Threads analytics load error:', err);
		throw error(500, 'データの読み込みに失敗しました');
	}
};

export const actions: Actions = {
	// Threadsデータを更新
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

			// Threads投稿を取得
			const threadsResult = await getThreadsPosts(settings.access_token, 'me', 50);

			if (threadsResult.error) {
				return fail(400, { error: `Threads Error: ${threadsResult.error}` });
			}

			let savedCount = 0;
			if (threadsResult.threads.length > 0) {
				for (const thread of threadsResult.threads) {
					await db
						.prepare(`
							INSERT INTO threads_posts (
								project_id, thread_id, text, permalink, timestamp,
								like_count, reply_count, quote_count, repost_count, views, created_at
							)
							VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
							ON CONFLICT(project_id, thread_id) DO UPDATE SET
								text = excluded.text,
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
					savedCount++;
				}
			}

			return {
				success: true,
				message: `Threadsデータを更新しました（${savedCount}件の投稿）`
			};
		} catch (err) {
			console.error('Refresh Threads data error:', err);
			return fail(500, { error: 'データの更新に失敗しました' });
		}
	}
};
