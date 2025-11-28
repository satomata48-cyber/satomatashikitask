import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDB } from '$lib/server/db';

interface BoardWithCounts {
	id: number;
	title: string;
	position: number;
	list_count: number;
	card_count: number;
}

export const load: PageServerLoad = async ({ locals, platform, cookies }) => {
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
		// ユーザーのボードを取得（リスト数・カード数も含む）
		const boards = await db
			.prepare(`
				SELECT
					b.id,
					b.title,
					b.position,
					(SELECT COUNT(*) FROM lists l WHERE l.board_id = b.id) as list_count,
					(SELECT COUNT(*) FROM cards c JOIN lists l ON c.list_id = l.id WHERE l.board_id = b.id) as card_count
				FROM boards b
				WHERE b.user_id = ?
				ORDER BY b.position
			`)
			.bind(userId)
			.all<BoardWithCounts>();

		return {
			boards: boards.results
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
	}
};
