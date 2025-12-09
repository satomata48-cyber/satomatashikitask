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

		// Twitter統計を取得（直近30日分）
		const twitterStats = await db
			.prepare(`
				SELECT ts.*, ta.username, ta.display_name
				FROM twitter_stats ts
				INNER JOIN twitter_accounts ta ON ts.account_id = ta.id
				WHERE ta.project_id = ?
				ORDER BY ts.recorded_date DESC
				LIMIT 30
			`)
			.bind(projectId)
			.all();

		// Instagram統計を取得（直近30日分）
		const instagramStats = await db
			.prepare(`
				SELECT ist.*, ia.username, ia.display_name
				FROM instagram_stats ist
				INNER JOIN instagram_accounts ia ON ist.account_id = ia.id
				WHERE ia.project_id = ?
				ORDER BY ist.recorded_date DESC
				LIMIT 30
			`)
			.bind(projectId)
			.all();

		// TikTok統計を取得（直近30日分）
		const tiktokStats = await db
			.prepare(`
				SELECT ts.*, ta.username, ta.display_name
				FROM tiktok_stats ts
				INNER JOIN tiktok_accounts ta ON ts.account_id = ta.id
				WHERE ta.project_id = ?
				ORDER BY ts.recorded_date DESC
				LIMIT 30
			`)
			.bind(projectId)
			.all();

		// YouTube統計を取得（直近30日分）
		const youtubeStats = await db
			.prepare(`
				SELECT ys.*, yc.channel_title, yc.channel_id
				FROM youtube_stats ys
				INNER JOIN youtube_channels yc ON ys.channel_id = yc.id
				WHERE yc.project_id = ?
				ORDER BY ys.recorded_date DESC
				LIMIT 30
			`)
			.bind(projectId)
			.all();

		// 各SNSの最新統計を取得
		const twitterLatest = await db
			.prepare(`
				SELECT ts.*, ta.username, ta.display_name
				FROM twitter_stats ts
				INNER JOIN twitter_accounts ta ON ts.account_id = ta.id
				WHERE ta.project_id = ?
				ORDER BY ts.recorded_date DESC
				LIMIT 1
			`)
			.bind(projectId)
			.first();

		const instagramLatest = await db
			.prepare(`
				SELECT ist.*, ia.username, ia.display_name
				FROM instagram_stats ist
				INNER JOIN instagram_accounts ia ON ist.account_id = ia.id
				WHERE ia.project_id = ?
				ORDER BY ist.recorded_date DESC
				LIMIT 1
			`)
			.bind(projectId)
			.first();

		const tiktokLatest = await db
			.prepare(`
				SELECT ts.*, ta.username, ta.display_name
				FROM tiktok_stats ts
				INNER JOIN tiktok_accounts ta ON ts.account_id = ta.id
				WHERE ta.project_id = ?
				ORDER BY ts.recorded_date DESC
				LIMIT 1
			`)
			.bind(projectId)
			.first();

		const youtubeLatest = await db
			.prepare(`
				SELECT ys.*, yc.channel_title, yc.channel_id
				FROM youtube_stats ys
				INNER JOIN youtube_channels yc ON ys.channel_id = yc.id
				WHERE yc.project_id = ?
				ORDER BY ys.recorded_date DESC
				LIMIT 1
			`)
			.bind(projectId)
			.first();

		return {
			project,
			twitter: {
				stats: twitterStats.results || [],
				latest: twitterLatest
			},
			instagram: {
				stats: instagramStats.results || [],
				latest: instagramLatest
			},
			tiktok: {
				stats: tiktokStats.results || [],
				latest: tiktokLatest
			},
			youtube: {
				stats: youtubeStats.results || [],
				latest: youtubeLatest
			}
		};
	} catch (err) {
		console.error('Analytics load error:', err);
		throw error(500, 'データの読み込みに失敗しました');
	}
};
