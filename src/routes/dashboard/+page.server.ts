import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

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
}

export const load: PageServerLoad = async ({ locals, platform, url }) => {
	// 未ログインならログインページへリダイレクト
	if (!locals.userId) {
		throw redirect(303, '/login');
	}

	if (!platform?.env?.DB) {
		throw new Error('データベースに接続できません');
	}

	const db = platform.env.DB;
	const userId = locals.userId;

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
						`SELECT id, list_id, title, description, due_date, position FROM cards WHERE list_id IN (${listIds}) ORDER BY position`
					)
					.all<Card>();
				cards = cardsResult.results;
			}
		}

		return {
			boards: boards.results,
			lists,
			cards,
			currentBoardId: boardId
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
		if (!locals.userId || !platform?.env?.DB) {
			return fail(401, { error: '認証が必要です' });
		}

		const data = await request.formData();
		const title = data.get('title')?.toString();

		if (!title) {
			return fail(400, { error: 'ボード名を入力してください' });
		}

		try {
			// 最大のposition値を取得
			const maxPos = await platform.env.DB.prepare(
				'SELECT COALESCE(MAX(position), -1) as max_pos FROM boards WHERE user_id = ?'
			)
				.bind(locals.userId)
				.first<{ max_pos: number }>();

			await platform.env.DB.prepare(
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
		if (!locals.userId || !platform?.env?.DB) {
			return fail(401, { error: '認証が必要です' });
		}

		const data = await request.formData();
		const title = data.get('title')?.toString();
		const boardId = url.searchParams.get('board');

		if (!title || !boardId) {
			return fail(400, { error: 'リスト名とボードIDが必要です' });
		}

		try {
			// ボードの所有権を確認
			const board = await platform.env.DB.prepare(
				'SELECT id FROM boards WHERE id = ? AND user_id = ?'
			)
				.bind(parseInt(boardId), locals.userId)
				.first();

			if (!board) {
				return fail(403, { error: 'このボードへのアクセス権限がありません' });
			}

			// 最大のposition値を取得
			const maxPos = await platform.env.DB.prepare(
				'SELECT COALESCE(MAX(position), -1) as max_pos FROM lists WHERE board_id = ?'
			)
				.bind(parseInt(boardId))
				.first<{ max_pos: number }>();

			await platform.env.DB.prepare(
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
		if (!locals.userId || !platform?.env?.DB) {
			return fail(401, { error: '認証が必要です' });
		}

		const data = await request.formData();
		const title = data.get('title')?.toString();
		const listId = data.get('list_id')?.toString();

		if (!title || !listId) {
			return fail(400, { error: 'カード名とリストIDが必要です' });
		}

		try {
			// リストとボードの所有権を確認
			const list = await platform.env.DB.prepare(
				'SELECT l.id FROM lists l JOIN boards b ON l.board_id = b.id WHERE l.id = ? AND b.user_id = ?'
			)
				.bind(parseInt(listId), locals.userId)
				.first();

			if (!list) {
				return fail(403, { error: 'このリストへのアクセス権限がありません' });
			}

			// 最大のposition値を取得
			const maxPos = await platform.env.DB.prepare(
				'SELECT COALESCE(MAX(position), -1) as max_pos FROM cards WHERE list_id = ?'
			)
				.bind(parseInt(listId))
				.first<{ max_pos: number }>();

			await platform.env.DB.prepare(
				'INSERT INTO cards (list_id, title, position) VALUES (?, ?, ?)'
			)
				.bind(parseInt(listId), title, (maxPos?.max_pos ?? -1) + 1)
				.run();

			return { success: true };
		} catch (error) {
			console.error('Create card error:', error);
			return fail(500, { error: 'カードの作成に失敗しました' });
		}
	}
};
