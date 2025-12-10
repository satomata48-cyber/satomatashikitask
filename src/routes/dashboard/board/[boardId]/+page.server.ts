import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDB } from '$lib/server/db';

interface Board {
	id: number;
	title: string;
	position: number;
}

interface List {
	id: number;
	board_id: number;
	title: string;
	position: number;
}

interface Card {
	id: number;
	list_id: number;
	title: string;
	description: string | null;
	due_date: string | null;
	position: number;
	title_color: string | null;
	description_color: string | null;
	due_date_color: string | null;
	title_bg_color: string | null;
	description_bg_color: string | null;
	border_color: string | null;
	discord_notify: number;
}

interface BoardDocument {
	id: number;
	title: string;
}


export const load: PageServerLoad = async ({ locals, platform, params, cookies }) => {
	if (!locals.userId) {
		throw redirect(303, '/login');
	}

	const db = getDB(platform);
	const userId = locals.userId;
	const boardId = parseInt(params.boardId);

	// ユーザーが存在するか確認
	try {
		const user = await db
			.prepare('SELECT id FROM users WHERE id = ?')
			.bind(userId)
			.first();

		if (!user) {
			cookies.delete('session', { path: '/' });
			throw redirect(303, '/login');
		}
	} catch (error) {
		if (error instanceof Response) {
			throw error;
		}
		cookies.delete('session', { path: '/' });
		throw redirect(303, '/login');
	}

	try {
		// ユーザーのボードを取得
		const boards = await db
			.prepare('SELECT id, title, position FROM boards WHERE user_id = ? ORDER BY position')
			.bind(userId)
			.all<Board>();

		// ボードの所有権を確認
		const currentBoard = boards.results.find(b => b.id === boardId);
		if (!currentBoard) {
			throw redirect(303, '/dashboard');
		}

		// 選択されたボードのリストを取得
		const listsResult = await db
			.prepare('SELECT id, board_id, title, position FROM lists WHERE board_id = ? ORDER BY position')
			.bind(boardId)
			.all<List>();
		const lists = listsResult.results;

		// 選択されたボードのカードを取得
		let cards: Card[] = [];
		if (lists.length > 0) {
			const listIds = lists.map((l) => l.id).join(',');
			const cardsResult = await db
				.prepare(
					`SELECT
						c.id, c.list_id, c.title, c.description, c.due_date, c.position,
						c.title_color, c.description_color, c.due_date_color,
						c.title_bg_color, c.description_bg_color, c.border_color,
						c.discord_notify
					FROM cards c
					WHERE c.list_id IN (${listIds})
					ORDER BY c.position`
				)
				.all<Card>();
			cards = cardsResult.results;
		}

		// ボードのドキュメントを取得（最大3つ）
		const boardDocumentsResult = await db
			.prepare('SELECT id, title FROM documents WHERE board_id = ? ORDER BY id LIMIT 3')
			.bind(boardId)
			.all<BoardDocument>();
		const boardDocuments = boardDocumentsResult.results;

		return {
			boards: boards.results,
			lists,
			cards,
			currentBoardId: boardId,
			currentBoard,
			boardDocuments
		};
	} catch (error) {
		if (error instanceof Response) {
			throw error;
		}
		console.error('Board load error:', error);
		throw new Error('データの読み込みに失敗しました');
	}
};

export const actions: Actions = {
	logout: async ({ cookies }) => {
		cookies.delete('session', { path: '/' });
		throw redirect(303, '/login');
	},

	createList: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const title = data.get('title')?.toString();
		const boardId = params.boardId;

		if (!title || !boardId) {
			return fail(400, { error: 'リスト名とボードIDが必要です' });
		}

		try {
			// ボードの所有権を確認
			const board = await db.prepare(
				'SELECT id FROM boards WHERE id = ? AND user_id = ?'
			)
				.bind(parseInt(boardId), locals.userId)
				.first();

			if (!board) {
				return fail(403, { error: 'このボードへのアクセス権限がありません' });
			}

			// 最大のposition値を取得
			const maxPos = await db.prepare(
				'SELECT COALESCE(MAX(position), -1) as max_pos FROM lists WHERE board_id = ?'
			)
				.bind(parseInt(boardId))
				.first<{ max_pos: number }>();

			await db.prepare(
				'INSERT INTO lists (board_id, title, position) VALUES (?, ?, ?)'
			)
				.bind(parseInt(boardId), title, (maxPos?.max_pos ?? -1) + 1)
				.run();

			return { success: true };
		} catch (error) {
			console.error('Create list error:', error);
			return fail(500, { error: 'リストの作成に失敗しました' });
		}
	},

	createCard: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const title = data.get('title')?.toString();
		const listId = data.get('list_id')?.toString();

		if (!title || !listId) {
			return fail(400, { error: 'カード名とリストIDが必要です' });
		}

		try {
			// リストとボードの所有権を確認
			const list = await db.prepare(
				'SELECT l.id FROM lists l JOIN boards b ON l.board_id = b.id WHERE l.id = ? AND b.user_id = ?'
			)
				.bind(parseInt(listId), locals.userId)
				.first();

			if (!list) {
				return fail(403, { error: 'このリストへのアクセス権限がありません' });
			}

			// 最大のposition値を取得
			const maxPos = await db.prepare(
				'SELECT COALESCE(MAX(position), -1) as max_pos FROM cards WHERE list_id = ?'
			)
				.bind(parseInt(listId))
				.first<{ max_pos: number }>();

			await db.prepare(
				'INSERT INTO cards (list_id, title, position) VALUES (?, ?, ?)'
			)
				.bind(parseInt(listId), title, (maxPos?.max_pos ?? -1) + 1)
				.run();

			return { success: true };
		} catch (error) {
			console.error('Create card error:', error);
			return fail(500, { error: 'カードの作成に失敗しました' });
		}
	},

	updateList: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const title = data.get('title')?.toString();

		if (!id || !title) {
			return fail(400, { error: 'リストIDと名前が必要です' });
		}

		try {
			// リストとボードの所有権を確認
			const list = await db.prepare(
				'SELECT l.id FROM lists l JOIN boards b ON l.board_id = b.id WHERE l.id = ? AND b.user_id = ?'
			)
				.bind(parseInt(id), locals.userId)
				.first();

			if (!list) {
				return fail(403, { error: 'このリストへのアクセス権限がありません' });
			}

			await db.prepare(
				'UPDATE lists SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
			)
				.bind(title, parseInt(id))
				.run();

			return { success: true };
		} catch (error) {
			console.error('Update list error:', error);
			return fail(500, { error: 'リストの更新に失敗しました' });
		}
	},

	deleteList: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const id = data.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'リストIDが必要です' });
		}

		try {
			// リストとボードの所有権を確認
			const list = await db.prepare(
				'SELECT l.id FROM lists l JOIN boards b ON l.board_id = b.id WHERE l.id = ? AND b.user_id = ?'
			)
				.bind(parseInt(id), locals.userId)
				.first();

			if (!list) {
				return fail(403, { error: 'このリストへのアクセス権限がありません' });
			}

			await db.prepare('DELETE FROM lists WHERE id = ?')
				.bind(parseInt(id))
				.run();

			return { success: true };
		} catch (error) {
			console.error('Delete list error:', error);
			return fail(500, { error: 'リストの削除に失敗しました' });
		}
	},

	updateCard: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const title = data.get('title')?.toString();
		const description = data.get('description')?.toString() || null;
		const due_date = data.get('due_date')?.toString() || null;
		const title_color = data.get('title_color')?.toString() || null;
		const description_color = data.get('description_color')?.toString() || null;
		const due_date_color = data.get('due_date_color')?.toString() || null;
		const title_bg_color = data.get('title_bg_color')?.toString() || null;
		const description_bg_color = data.get('description_bg_color')?.toString() || null;
		const border_color = data.get('border_color')?.toString() || null;
		const discord_notify = data.get('discord_notify') === '1' ? 1 : 0;

		if (!id || !title) {
			return fail(400, { error: 'カードIDと名前が必要です' });
		}

		try {
			// カード、リスト、ボードの所有権を確認
			const card = await db.prepare(
				'SELECT c.id FROM cards c JOIN lists l ON c.list_id = l.id JOIN boards b ON l.board_id = b.id WHERE c.id = ? AND b.user_id = ?'
			)
				.bind(parseInt(id), locals.userId)
				.first();

			if (!card) {
				return fail(403, { error: 'このカードへのアクセス権限がありません' });
			}

			await db.prepare(
				'UPDATE cards SET title = ?, description = ?, due_date = ?, title_color = ?, description_color = ?, due_date_color = ?, title_bg_color = ?, description_bg_color = ?, border_color = ?, discord_notify = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
			)
				.bind(title, description, due_date, title_color, description_color, due_date_color, title_bg_color, description_bg_color, border_color, discord_notify, parseInt(id))
				.run();

			return { success: true };
		} catch (error) {
			console.error('Update card error:', error);
			return fail(500, { error: 'カードの更新に失敗しました' });
		}
	},

	deleteCard: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const id = data.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'カードIDが必要です' });
		}

		try {
			// カード、リスト、ボードの所有権を確認
			const card = await db.prepare(
				'SELECT c.id FROM cards c JOIN lists l ON c.list_id = l.id JOIN boards b ON l.board_id = b.id WHERE c.id = ? AND b.user_id = ?'
			)
				.bind(parseInt(id), locals.userId)
				.first();

			if (!card) {
				return fail(403, { error: 'このカードへのアクセス権限がありません' });
			}

			await db.prepare('DELETE FROM cards WHERE id = ?')
				.bind(parseInt(id))
				.run();

			return { success: true };
		} catch (error) {
			console.error('Delete card error:', error);
			return fail(500, { error: 'カードの削除に失敗しました' });
		}
	},

	createBoardDocument: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const title = data.get('title')?.toString();
		const boardId = params.boardId;

		if (!title || !boardId) {
			return fail(400, { error: 'タイトルとボードIDが必要です' });
		}

		try {
			// ボードの所有権を確認
			const board = await db
				.prepare('SELECT id, user_id FROM boards WHERE id = ? AND user_id = ?')
				.bind(parseInt(boardId), locals.userId)
				.first<{ id: number; user_id: number }>();

			if (!board) {
				return fail(403, { error: 'このボードへのアクセス権限がありません' });
			}

			// 既存のドキュメント数を確認（最大3つ）
			const countResult = await db
				.prepare('SELECT COUNT(*) as count FROM documents WHERE board_id = ?')
				.bind(parseInt(boardId))
				.first<{ count: number }>();

			if (countResult && countResult.count >= 3) {
				return fail(400, { error: 'ボードドキュメントは最大3つまでです' });
			}

			// ドキュメントを作成
			const result = await db
				.prepare('INSERT INTO documents (user_id, board_id, title, content) VALUES (?, ?, ?, ?)')
				.bind(locals.userId, parseInt(boardId), title, '<p>ここから入力してください...</p>')
				.run();

			return { success: true, documentId: result.meta.last_row_id };
		} catch (error) {
			console.error('Create board document error:', error);
			return fail(500, { error: 'ドキュメントの作成に失敗しました' });
		}
	},

	updateBoardDocument: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const docId = data.get('docId')?.toString();
		const title = data.get('title')?.toString();

		if (!docId || !title) {
			return fail(400, { error: 'ドキュメントIDとタイトルが必要です' });
		}

		try {
			// ドキュメントの所有権を確認（ボード経由）
			const doc = await db
				.prepare(`
					SELECT d.id
					FROM documents d
					JOIN boards b ON d.board_id = b.id
					WHERE d.id = ? AND b.user_id = ?
				`)
				.bind(parseInt(docId), locals.userId)
				.first<{ id: number }>();

			if (!doc) {
				return fail(403, { error: 'このドキュメントへのアクセス権限がありません' });
			}

			// タイトルを更新
			await db
				.prepare('UPDATE documents SET title = ? WHERE id = ?')
				.bind(title, parseInt(docId))
				.run();

			return { success: true };
		} catch (error) {
			console.error('Update board document error:', error);
			return fail(500, { error: 'ドキュメントの更新に失敗しました' });
		}
	},

	deleteBoardDocument: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const docId = data.get('docId')?.toString();

		if (!docId) {
			return fail(400, { error: 'ドキュメントIDが必要です' });
		}

		try {
			// ドキュメントの所有権を確認（ボード経由）
			const doc = await db
				.prepare(`
					SELECT d.id
					FROM documents d
					JOIN boards b ON d.board_id = b.id
					WHERE d.id = ? AND b.user_id = ?
				`)
				.bind(parseInt(docId), locals.userId)
				.first<{ id: number }>();

			if (!doc) {
				return fail(403, { error: 'このドキュメントへのアクセス権限がありません' });
			}

			// ドキュメントを削除
			await db
				.prepare('DELETE FROM documents WHERE id = ?')
				.bind(parseInt(docId))
				.run();

			return { success: true };
		} catch (error) {
			console.error('Delete board document error:', error);
			return fail(500, { error: 'ドキュメントの削除に失敗しました' });
		}
	},

	moveCard: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const cardId = data.get('cardId')?.toString();
		const newListId = data.get('newListId')?.toString();
		const newPosition = data.get('newPosition')?.toString();

		if (!cardId || !newListId || newPosition === undefined) {
			return fail(400, { error: 'カードID、リストID、位置が必要です' });
		}

		try {
			// カードの所有権を確認
			const card = await db.prepare(
				'SELECT c.id, c.list_id FROM cards c JOIN lists l ON c.list_id = l.id JOIN boards b ON l.board_id = b.id WHERE c.id = ? AND b.user_id = ?'
			)
				.bind(parseInt(cardId), locals.userId)
				.first<{ id: number; list_id: number }>();

			if (!card) {
				return fail(403, { error: 'このカードへのアクセス権限がありません' });
			}

			// 移動先リストの所有権を確認
			const newList = await db.prepare(
				'SELECT l.id FROM lists l JOIN boards b ON l.board_id = b.id WHERE l.id = ? AND b.user_id = ?'
			)
				.bind(parseInt(newListId), locals.userId)
				.first();

			if (!newList) {
				return fail(403, { error: '移動先リストへのアクセス権限がありません' });
			}

			// カードを移動
			await db.prepare(
				'UPDATE cards SET list_id = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
			)
				.bind(parseInt(newListId), parseInt(newPosition), parseInt(cardId))
				.run();

			return { success: true };
		} catch (error) {
			console.error('Move card error:', error);
			return fail(500, { error: 'カードの移動に失敗しました' });
		}
	},

	reorderCards: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const cardsJson = data.get('cards')?.toString();

		if (!cardsJson) {
			return fail(400, { error: 'カードデータが必要です' });
		}

		try {
			const cards: Array<{ id: number; list_id: number; position: number }> = JSON.parse(cardsJson);

			// 各カードの所有権を確認して更新
			for (const card of cards) {
				const existingCard = await db.prepare(
					'SELECT c.id FROM cards c JOIN lists l ON c.list_id = l.id JOIN boards b ON l.board_id = b.id WHERE c.id = ? AND b.user_id = ?'
				)
					.bind(card.id, locals.userId)
					.first();

				if (!existingCard) {
					return fail(403, { error: 'カードへのアクセス権限がありません' });
				}

				await db.prepare(
					'UPDATE cards SET list_id = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
				)
					.bind(card.list_id, card.position, card.id)
					.run();
			}

			return { success: true };
		} catch (error) {
			console.error('Reorder cards error:', error);
			return fail(500, { error: 'カードの並び替えに失敗しました' });
		}
	}
};
