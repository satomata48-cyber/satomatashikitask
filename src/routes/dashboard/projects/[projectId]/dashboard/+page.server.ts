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

		// ボード統計
		const boardStats = await db
			.prepare(`
				SELECT
					COUNT(*) as total_boards,
					(SELECT COUNT(*) FROM project_lists pl
					 JOIN project_boards pb ON pl.project_board_id = pb.id
					 WHERE pb.project_id = ?) as total_lists,
					(SELECT COUNT(*) FROM project_cards pc
					 JOIN project_lists pl ON pc.project_list_id = pl.id
					 JOIN project_boards pb ON pl.project_board_id = pb.id
					 WHERE pb.project_id = ?) as total_cards
				FROM project_boards
				WHERE project_id = ?
			`)
			.bind(projectId, projectId, projectId)
			.first();

		// ドキュメント統計
		const documentStats = await db
			.prepare(`
				SELECT
					COUNT(*) as total_documents,
					COUNT(CASE WHEN content IS NOT NULL AND LENGTH(content) > 0 THEN 1 END) as with_content
				FROM project_documents
				WHERE project_id = ?
			`)
			.bind(projectId)
			.first();

		// 最近のボード（3件）
		const recentBoards = await db
			.prepare(`
				SELECT
					pb.id,
					pb.title,
					pb.created_at,
					(SELECT COUNT(*) FROM project_lists pl WHERE pl.project_board_id = pb.id) as list_count,
					(SELECT COUNT(*) FROM project_cards pc
					 JOIN project_lists pl ON pc.project_list_id = pl.id
					 WHERE pl.project_board_id = pb.id) as card_count
				FROM project_boards pb
				WHERE pb.project_id = ?
				ORDER BY pb.created_at DESC
				LIMIT 3
			`)
			.bind(projectId)
			.all();

		// 最近のドキュメント（3件）
		const recentDocuments = await db
			.prepare(`
				SELECT id, title, updated_at
				FROM project_documents
				WHERE project_id = ?
				ORDER BY updated_at DESC
				LIMIT 3
			`)
			.bind(projectId)
			.all();

		// YouTube統計（存在する場合）
		const youtubeStats = await db
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

		return {
			project,
			boardStats,
			documentStats,
			recentBoards: recentBoards.results,
			recentDocuments: recentDocuments.results,
			youtubeStats
		};
	} catch (err) {
		console.error('Dashboard load error:', err);
		throw error(500, 'データの読み込みに失敗しました');
	}
};
