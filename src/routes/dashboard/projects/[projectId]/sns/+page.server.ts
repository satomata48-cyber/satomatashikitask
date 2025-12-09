import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
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
			.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
			.bind(projectId, userId)
			.first();

		if (!project) {
			throw error(404, 'プロジェクトが見つかりません');
		}

		// YouTube統計を取得
		const youtubeChannel = await db
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

		// Instagram統計を取得（存在する場合）
		const instagramAccount = await db
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

		// Twitter/X統計を取得
		const twitterAccount = await db
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

		// TikTok統計を取得
		const tiktokAccount = await db
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

		return {
			project,
			youtubeChannel,
			instagramAccount,
			twitterAccount,
			tiktokAccount
		};
	} catch (err) {
		console.error('SNS load error:', err);
		throw error(500, 'データの読み込みに失敗しました');
	}
};
