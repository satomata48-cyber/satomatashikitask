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
	has_document?: boolean;
}

interface Document {
	id: number;
	card_id: number | null;
	board_id: number | null;
	title: string;
	content: string;
	created_at: string;
	updated_at: string;
	parent_id: number | null;
}

export const load: PageServerLoad = async ({ locals, platform, url, cookies }) => {
	// 未ログインならログインページへリダイレクト
	if (!locals.userId) {
		throw redirect(303, '/login');
	}

	const db = getDB(platform);
	const userId = locals.userId;

	// ユーザーが存在するか確認
	try {
		const user = await db
			.prepare('SELECT id FROM users WHERE id = ?')
			.bind(userId)
			.first();

		// ユーザーが存在しない場合はセッションをクリアしてログインページへ
		if (!user) {
			cookies.delete('session', { path: '/' });
			throw redirect(303, '/login');
		}
	} catch (error) {
		// リダイレクトの場合は再スロー
		if (error instanceof Response) {
			throw error;
		}
		// その他のエラーの場合はセッションをクリアしてログインへ
		cookies.delete('session', { path: '/' });
		throw redirect(303, '/login');
	}

	try {
		// ユーザーのボードを取得
		const boards = await db
			.prepare('SELECT id, title, position FROM boards WHERE user_id = ? ORDER BY position')
			.bind(userId)
			.all<Board>();

		const boardId = url.searchParams.get('board')
			? parseInt(url.searchParams.get('board')!)
			: boards.results[0]?.id;

		let lists: List[] = [];
		let cards: Card[] = [];
		let boardDocuments: Document[] = [];

		if (boardId) {
			// 選択されたボードのリストを取得
			const listsResult = await db
				.prepare('SELECT id, board_id, title, position FROM lists WHERE board_id = ? ORDER BY position')
				.bind(boardId)
				.all<List>();
			lists = listsResult.results;

			// 選択されたボードのカードを取得
			if (lists.length > 0) {
				const listIds = lists.map((l) => l.id).join(',');
				const cardsResult = await db
					.prepare(
						`SELECT
							c.id, c.list_id, c.title, c.description, c.due_date, c.position,
							c.title_color, c.description_color, c.due_date_color,
							c.title_bg_color, c.description_bg_color, c.border_color,
							c.discord_notify,
							CASE WHEN EXISTS (SELECT 1 FROM documents d WHERE d.card_id = c.id) THEN 1 ELSE 0 END as has_document
						FROM cards c
						WHERE c.list_id IN (${listIds})
						ORDER BY c.position`
					)
					.all<Card>();
				cards = cardsResult.results;
			}

			// ボードのルートドキュメント（parent_id = NULL）を取得
			const documentsResult = await db
				.prepare('SELECT id, board_id, card_id, title, content, created_at, updated_at, parent_id FROM documents WHERE board_id = ? AND parent_id IS NULL ORDER BY created_at ASC LIMIT 3')
				.bind(boardId)
				.all<Document>();
			boardDocuments = documentsResult.results;
		}

		return {
			boards: boards.results,
			lists,
			cards,
			currentBoardId: boardId,
			boardDocuments
		};
	} catch (error) {
		console.error('Dashboard load error:', error);
		throw new Error('データの読み込みに失敗しました');
	}
};

export const actions: Actions = {
	logout: async ({ cookies }) => {
		cookies.delete('session', { path: '/' });
		throw redirect(303, '/login');
	},

	createBoard: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const title = data.get('title')?.toString();

		if (!title) {
			return fail(400, { error: 'ボード名を入力してください' });
		}

		try {
			// 最大のposition値を取得
			const maxPos = await db.prepare(
				'SELECT COALESCE(MAX(position), -1) as max_pos FROM boards WHERE user_id = ?'
			)
				.bind(locals.userId)
				.first<{ max_pos: number }>();

			await db.prepare(
				'INSERT INTO boards (user_id, title, position) VALUES (?, ?, ?)'
			)
				.bind(locals.userId, title, (maxPos?.max_pos ?? -1) + 1)
				.run();

			return { success: true };
		} catch (error) {
			console.error('Create board error:', error);
			return fail(500, { error: 'ボードの作成に失敗しました' });
		}
	},

	createList: async ({ request, locals, platform, url }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const title = data.get('title')?.toString();
		const boardId = url.searchParams.get('board');

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

	updateBoard: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const title = data.get('title')?.toString();

		if (!id || !title) {
			return fail(400, { error: 'ボードIDと名前が必要です' });
		}

		try {
			// ボードの所有権を確認
			const board = await db.prepare(
				'SELECT id FROM boards WHERE id = ? AND user_id = ?'
			)
				.bind(parseInt(id), locals.userId)
				.first();

			if (!board) {
				return fail(403, { error: 'このボードへのアクセス権限がありません' });
			}

			await db.prepare(
				'UPDATE boards SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
			)
				.bind(title, parseInt(id))
				.run();

			return { success: true };
		} catch (error) {
			console.error('Update board error:', error);
			return fail(500, { error: 'ボードの更新に失敗しました' });
		}
	},

	deleteBoard: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const id = data.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'ボードIDが必要です' });
		}

		try {
			// ボードの所有権を確認
			const board = await db.prepare(
				'SELECT id FROM boards WHERE id = ? AND user_id = ?'
			)
				.bind(parseInt(id), locals.userId)
				.first();

			if (!board) {
				return fail(403, { error: 'このボードへのアクセス権限がありません' });
			}

			await db.prepare('DELETE FROM boards WHERE id = ?')
				.bind(parseInt(id))
				.run();

			return { success: true };
		} catch (error) {
			console.error('Delete board error:', error);
			return fail(500, { error: 'ボードの削除に失敗しました' });
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

	getDocument: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const cardId = data.get('card_id')?.toString();

		if (!cardId) {
			return fail(400, { error: 'カードIDが必要です' });
		}

		try {
			// カードとドキュメントの所有権を確認
			const card = await db.prepare(
				'SELECT c.id FROM cards c JOIN lists l ON c.list_id = l.id JOIN boards b ON l.board_id = b.id WHERE c.id = ? AND b.user_id = ?'
			)
				.bind(parseInt(cardId), locals.userId)
				.first();

			if (!card) {
				return fail(403, { error: 'このカードへのアクセス権限がありません' });
			}

			const document = await db.prepare(
				'SELECT id, card_id, content, created_at, updated_at FROM documents WHERE card_id = ?'
			)
				.bind(parseInt(cardId))
				.first<Document>();

			return { success: true, document };
		} catch (error) {
			console.error('Get document error:', error);
			return fail(500, { error: 'ドキュメントの取得に失敗しました' });
		}
	},

	saveDocument: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const cardId = data.get('card_id')?.toString();
		const content = data.get('content')?.toString() || '';

		if (!cardId) {
			return fail(400, { error: 'カードIDが必要です' });
		}

		try {
			// カードの所有権を確認
			const card = await db.prepare(
				'SELECT c.id FROM cards c JOIN lists l ON c.list_id = l.id JOIN boards b ON l.board_id = b.id WHERE c.id = ? AND b.user_id = ?'
			)
				.bind(parseInt(cardId), locals.userId)
				.first();

			if (!card) {
				return fail(403, { error: 'このカードへのアクセス権限がありません' });
			}

			// 既存のドキュメントがあるか確認
			const existing = await db.prepare(
				'SELECT id FROM documents WHERE card_id = ?'
			)
				.bind(parseInt(cardId))
				.first<{ id: number }>();

			if (existing) {
				// 更新
				await db.prepare(
					'UPDATE documents SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE card_id = ?'
				)
					.bind(content, parseInt(cardId))
					.run();
			} else {
				// 新規作成
				await db.prepare(
					'INSERT INTO documents (card_id, content) VALUES (?, ?)'
				)
					.bind(parseInt(cardId), content)
					.run();
			}

			return { success: true };
		} catch (error) {
			console.error('Save document error:', error);
			return fail(500, { error: 'ドキュメントの保存に失敗しました' });
		}
	},

	createBoardDocument: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const title = data.get('title')?.toString();
		const boardId = data.get('boardId')?.toString();

		if (!title || !boardId) {
			return fail(400, { error: 'タイトルとボードIDが必要です' });
		}

		try {
			// ボードの所有権を確認
			const board = await db
				.prepare('SELECT id FROM boards WHERE id = ? AND user_id = ?')
				.bind(parseInt(boardId), locals.userId)
				.first<{ id: number }>();

			if (!board) {
				return fail(403, { error: 'このボードへのアクセス権限がありません' });
			}

			// 既存のルートドキュメント数を確認（最大3つ）
			const countResult = await db
				.prepare('SELECT COUNT(*) as count FROM documents WHERE board_id = ? AND parent_id IS NULL')
				.bind(parseInt(boardId))
				.first<{ count: number }>();

			if (countResult && countResult.count >= 3) {
				return fail(400, { error: 'ボードドキュメントは最大3つまでです' });
			}

			// ドキュメントを作成
			const result = await db
				.prepare('INSERT INTO documents (board_id, card_id, title, content, parent_id) VALUES (?, NULL, ?, ?, NULL)')
				.bind(parseInt(boardId), title, '<p>ここから入力してください...</p>')
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
					SELECT d.id, d.parent_id
					FROM documents d
					JOIN boards b ON d.board_id = b.id
					WHERE d.id = ? AND b.user_id = ?
				`)
				.bind(parseInt(docId), locals.userId)
				.first<{ id: number; parent_id: number | null }>();

			if (!doc) {
				return fail(403, { error: 'このドキュメントへのアクセス権限がありません' });
			}

			// ルートドキュメント（parent_id = NULL）のみ削除可能
			if (doc.parent_id !== null) {
				return fail(400, { error: 'サブページは削除できません' });
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
	}
};
