import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/server/db';

interface ProjectBoard {
	id: number;
	project_id: number;
	title: string;
	position: number;
	created_at: string;
	list_count: number;
	card_count: number;
	lists?: ProjectList[];
}

interface ProjectList {
	id: number;
	project_board_id: number;
	title: string;
	position: number;
	cards?: ProjectCard[];
}

interface ProjectCard {
	id: number;
	project_list_id: number;
	title: string;
	description: string | null;
	due_date: string | null;
	position: number;
}

export const load: PageServerLoad = async ({ locals, platform, params, url }) => {
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

		// ボード一覧を取得
		const boards = await db
			.prepare(`
				SELECT
					pb.id,
					pb.project_id,
					pb.title,
					pb.position,
					pb.created_at,
					(SELECT COUNT(*) FROM project_lists pl WHERE pl.project_board_id = pb.id) as list_count,
					(SELECT COUNT(*) FROM project_cards pc
					 JOIN project_lists pl ON pc.project_list_id = pl.id
					 WHERE pl.project_board_id = pb.id) as card_count
				FROM project_boards pb
				WHERE pb.project_id = ?
				ORDER BY pb.position
			`)
			.bind(projectId)
			.all<ProjectBoard>();

		// 選択されたボードのIDを取得
		const selectedBoardId = url.searchParams.get('board');
		let selectedBoard = null;
		let lists = [];

		if (selectedBoardId) {
			const boardId = parseInt(selectedBoardId);
			selectedBoard = boards.results.find(b => b.id === boardId) || null;

			if (selectedBoard) {
				// リスト一覧を取得
				const listsResult = await db
					.prepare(`
						SELECT id, project_board_id, title, position
						FROM project_lists
						WHERE project_board_id = ?
						ORDER BY position
					`)
					.bind(boardId)
					.all<ProjectList>();

				lists = listsResult.results;

				// 各リストのカードを取得
				for (const list of lists) {
					const cardsResult = await db
						.prepare(`
							SELECT id, project_list_id, title, description, due_date, position
							FROM project_cards
							WHERE project_list_id = ?
							ORDER BY position
						`)
						.bind(list.id)
						.all<ProjectCard>();

					list.cards = cardsResult.results;
				}
			}
		}

		return {
			project,
			boards: boards.results,
			selectedBoard,
			lists
		};
	} catch (err) {
		console.error('Boards load error:', err);
		throw error(500, 'データの読み込みに失敗しました');
	}
};

export const actions: Actions = {
	createBoard: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const title = data.get('title')?.toString();

		if (!title) {
			return fail(400, { error: 'ボード名を入力してください' });
		}

		try {
			const maxPos = await db.prepare(
				'SELECT COALESCE(MAX(position), -1) as max_pos FROM project_boards WHERE project_id = ?'
			)
			.bind(projectId)
			.first<{ max_pos: number }>();

			await db.prepare(
				'INSERT INTO project_boards (project_id, title, position) VALUES (?, ?, ?)'
			)
			.bind(projectId, title, (maxPos?.max_pos ?? -1) + 1)
			.run();

			return { success: true };
		} catch (err) {
			console.error('Create board error:', err);
			return fail(500, { error: 'ボードの作成に失敗しました' });
		}
	},

	deleteBoard: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const boardId = parseInt(data.get('id')?.toString() || '0');

		try {
			await db.prepare('DELETE FROM project_boards WHERE id = ?')
				.bind(boardId)
				.run();

			return { success: true };
		} catch (err) {
			console.error('Delete board error:', err);
			return fail(500, { error: 'ボードの削除に失敗しました' });
		}
	},

	createList: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const boardId = parseInt(data.get('board_id')?.toString() || '0');
		const title = data.get('title')?.toString();

		if (!title) {
			return fail(400, { error: 'リスト名を入力してください' });
		}

		try {
			const maxPos = await db.prepare(
				'SELECT COALESCE(MAX(position), -1) as max_pos FROM project_lists WHERE project_board_id = ?'
			)
			.bind(boardId)
			.first<{ max_pos: number }>();

			await db.prepare(
				'INSERT INTO project_lists (project_board_id, title, position) VALUES (?, ?, ?)'
			)
			.bind(boardId, title, (maxPos?.max_pos ?? -1) + 1)
			.run();

			return { success: true };
		} catch (err) {
			console.error('Create list error:', err);
			return fail(500, { error: 'リストの作成に失敗しました' });
		}
	},

	deleteList: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const listId = parseInt(data.get('id')?.toString() || '0');

		try {
			await db.prepare('DELETE FROM project_lists WHERE id = ?')
				.bind(listId)
				.run();

			return { success: true };
		} catch (err) {
			console.error('Delete list error:', err);
			return fail(500, { error: 'リストの削除に失敗しました' });
		}
	},

	createCard: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const listId = parseInt(data.get('list_id')?.toString() || '0');
		const title = data.get('title')?.toString();

		if (!title) {
			return fail(400, { error: 'カード名を入力してください' });
		}

		try {
			const maxPos = await db.prepare(
				'SELECT COALESCE(MAX(position), -1) as max_pos FROM project_cards WHERE project_list_id = ?'
			)
			.bind(listId)
			.first<{ max_pos: number }>();

			await db.prepare(
				'INSERT INTO project_cards (project_list_id, title, position) VALUES (?, ?, ?)'
			)
			.bind(listId, title, (maxPos?.max_pos ?? -1) + 1)
			.run();

			return { success: true };
		} catch (err) {
			console.error('Create card error:', err);
			return fail(500, { error: 'カードの作成に失敗しました' });
		}
	},

	updateCard: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const cardId = parseInt(data.get('id')?.toString() || '0');
		const title = data.get('title')?.toString();
		const description = data.get('description')?.toString() || null;
		const dueDate = data.get('due_date')?.toString() || null;

		if (!title) {
			return fail(400, { error: 'カード名を入力してください' });
		}

		try {
			await db.prepare(`
				UPDATE project_cards
				SET title = ?, description = ?, due_date = ?
				WHERE id = ?
			`)
			.bind(title, description, dueDate, cardId)
			.run();

			return { success: true };
		} catch (err) {
			console.error('Update card error:', err);
			return fail(500, { error: 'カードの更新に失敗しました' });
		}
	},

	deleteCard: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const cardId = parseInt(data.get('id')?.toString() || '0');

		try {
			await db.prepare('DELETE FROM project_cards WHERE id = ?')
				.bind(cardId)
				.run();

			return { success: true };
		} catch (err) {
			console.error('Delete card error:', err);
			return fail(500, { error: 'カードの削除に失敗しました' });
		}
	}
};
