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
			.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
			.bind(projectId, userId)
			.first();

		if (!project) {
			throw error(404, 'プロジェクトが見つかりません');
		}

		// Twitter投稿履歴を取得
		let twitterPosts = { results: [] };
		let twitterScheduled = { results: [] };
		let twitterAccount = null;
		let twitterSettings = null;
		try {
			twitterPosts = await db
				.prepare(`
					SELECT tp.*, ta.username
					FROM twitter_posts tp
					INNER JOIN twitter_accounts ta ON tp.account_id = ta.id
					WHERE ta.project_id = ?
					ORDER BY tp.posted_at DESC
					LIMIT 50
				`)
				.bind(projectId)
				.all();
		} catch {
			// Table may not exist
		}

		// Twitter予約投稿を取得
		try {
			twitterScheduled = await db
				.prepare(`
					SELECT tsp.*, ta.username
					FROM twitter_scheduled_posts tsp
					INNER JOIN twitter_accounts ta ON tsp.account_id = ta.id
					WHERE ta.project_id = ?
					ORDER BY tsp.scheduled_at ASC
					LIMIT 50
				`)
				.bind(projectId)
				.all();
		} catch {
			// Table may not exist
		}

		// Twitterアカウント情報を取得
		try {
			twitterAccount = await db
				.prepare('SELECT * FROM twitter_accounts WHERE project_id = ?')
				.bind(projectId)
				.first();
		} catch {
			// Table may not exist
		}

		// Twitter API設定を取得
		try {
			twitterSettings = await db
				.prepare('SELECT id FROM twitter_settings WHERE project_id = ?')
				.bind(projectId)
				.first();
		} catch {
			// Table may not exist
		}

		// Instagram投稿履歴を取得
		let instagramPosts = { results: [] };
		let instagramAccount = null;
		try {
			instagramPosts = await db
				.prepare(`
					SELECT ip.*, ia.username
					FROM instagram_posts ip
					INNER JOIN instagram_accounts ia ON ip.account_id = ia.id
					WHERE ia.project_id = ?
					ORDER BY ip.posted_at DESC
					LIMIT 50
				`)
				.bind(projectId)
				.all();
		} catch {
			// Table may not exist
		}

		// Instagramアカウント情報を取得
		try {
			instagramAccount = await db
				.prepare('SELECT * FROM instagram_accounts WHERE project_id = ?')
				.bind(projectId)
				.first();
		} catch {
			// Table may not exist
		}

		// TikTok動画履歴を取得
		let tiktokVideos = { results: [] };
		let tiktokAccount = null;
		try {
			tiktokVideos = await db
				.prepare(`
					SELECT tv.*, ta.username
					FROM tiktok_videos tv
					INNER JOIN tiktok_accounts ta ON tv.account_id = ta.id
					WHERE ta.project_id = ?
					ORDER BY tv.posted_at DESC
					LIMIT 50
				`)
				.bind(projectId)
				.all();
		} catch {
			// Table may not exist
		}

		// TikTokアカウント情報を取得
		try {
			tiktokAccount = await db
				.prepare('SELECT * FROM tiktok_accounts WHERE project_id = ?')
				.bind(projectId)
				.first();
		} catch {
			// Table may not exist
		}

		// YouTube動画履歴を取得
		let youtubeVideos = { results: [] };
		let youtubeChannel = null;
		try {
			youtubeVideos = await db
				.prepare(`
					SELECT yv.*, yc.channel_title
					FROM youtube_videos yv
					INNER JOIN youtube_channels yc ON yv.channel_id = yc.id
					WHERE yc.project_id = ?
					ORDER BY yv.published_at DESC
					LIMIT 50
				`)
				.bind(projectId)
				.all();
		} catch {
			// Table may not exist
		}

		// YouTubeチャンネル情報を取得
		try {
			youtubeChannel = await db
				.prepare('SELECT * FROM youtube_channels WHERE project_id = ?')
				.bind(projectId)
				.first();
		} catch {
			// Table may not exist
		}

		return {
			project,
			twitter: {
				posts: twitterPosts.results || [],
				scheduled: twitterScheduled.results || [],
				account: twitterAccount,
				hasSettings: !!twitterSettings
			},
			instagram: {
				posts: instagramPosts.results || [],
				account: instagramAccount
			},
			tiktok: {
				videos: tiktokVideos.results || [],
				account: tiktokAccount
			},
			youtube: {
				videos: youtubeVideos.results || [],
				channel: youtubeChannel
			}
		};
	} catch (err) {
		console.error('Posts load error:', err);
		throw error(500, 'データの読み込みに失敗しました');
	}
};

export const actions: Actions = {
	postTwitter: async ({ request, locals, platform, params }) => {
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

	scheduleTwitter: async ({ request, locals, platform, params }) => {
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
			return fail(400, { error: '予約日時を入力してください' });
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

			const scheduledAt = `${scheduledDate}T${scheduledTime}:00`;

			// DBに保存
			await db
				.prepare(`
					INSERT INTO twitter_scheduled_posts (account_id, content, scheduled_at, status)
					VALUES (?, ?, ?, 'pending')
				`)
				.bind(account.id, content, scheduledAt)
				.run();

			return { success: true, message: 'ツイートを予約しました' };
		} catch (err) {
			console.error('Schedule tweet error:', err);
			return fail(500, { error: 'ツイートの予約に失敗しました' });
		}
	},

	deleteScheduledTwitter: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const postId = data.get('post_id')?.toString();

		if (!postId) {
			return fail(400, { error: '投稿IDが指定されていません' });
		}

		try {
			await db
				.prepare('DELETE FROM twitter_scheduled_posts WHERE id = ?')
				.bind(parseInt(postId))
				.run();

			return { success: true, message: '予約投稿を削除しました' };
		} catch (err) {
			console.error('Delete scheduled tweet error:', err);
			return fail(500, { error: '予約投稿の削除に失敗しました' });
		}
	}
};
