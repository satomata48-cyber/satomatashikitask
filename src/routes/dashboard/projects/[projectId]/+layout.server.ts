import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getDB } from '$lib/server/db';

export const load: LayoutServerLoad = async ({ locals, platform, params }) => {
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

		// 全てのボード一覧（ウィジェット用）
		const allBoards = await db
			.prepare(`
				SELECT
					pb.id,
					pb.project_id,
					pb.title,
					p.title as project_title,
					(SELECT COUNT(*) FROM project_lists pl WHERE pl.project_board_id = pb.id) as list_count,
					(SELECT COUNT(*) FROM project_cards pc
					 JOIN project_lists pl ON pc.project_list_id = pl.id
					 WHERE pl.project_board_id = pb.id) as card_count
				FROM project_boards pb
				JOIN projects p ON pb.project_id = p.id
				WHERE p.user_id = ?
				ORDER BY pb.created_at DESC
			`)
			.bind(userId)
			.all();

		// 全てのドキュメント一覧（ウィジェット用）
		const allDocuments = await db
			.prepare(`
				SELECT pd.id, pd.project_id, pd.title, pd.updated_at, p.title as project_title
				FROM project_documents pd
				LEFT JOIN projects p ON pd.project_id = p.id
				WHERE p.user_id = ?
				ORDER BY pd.updated_at DESC
			`)
			.bind(userId)
			.all();

		return {
			project,
			allBoards: allBoards.results,
			allDocuments: allDocuments.results
		};
	} catch (err) {
		if (err instanceof Response) {
			throw err;
		}
		console.error('Layout load error:', err);
		throw error(500, 'データの読み込みに失敗しました');
	}
};
