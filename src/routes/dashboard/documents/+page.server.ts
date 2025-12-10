import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDB } from '$lib/server/db';

interface StandaloneDocument {
	id: number;
	title: string;
	content: string | null;
	created_at: string;
	updated_at: string;
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.userId) {
		throw redirect(303, '/login');
	}

	const db = getDB(platform);
	const userId = locals.userId;

	try {
		// standalone_documentsテーブルが存在しない場合は作成
		await db
			.prepare(`
				CREATE TABLE IF NOT EXISTS standalone_documents (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					user_id INTEGER NOT NULL,
					title TEXT NOT NULL,
					content TEXT,
					created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
					updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
					FOREIGN KEY (user_id) REFERENCES users(id)
				)
			`)
			.run();

		// ドキュメント一覧を取得
		const documents = await db
			.prepare(`
				SELECT id, title, content, created_at, updated_at
				FROM standalone_documents
				WHERE user_id = ?
				ORDER BY updated_at DESC
			`)
			.bind(userId)
			.all<StandaloneDocument>();

		return {
			documents: documents.results || []
		};
	} catch (error) {
		console.error('Documents load error:', error);
		return {
			documents: []
		};
	}
};

export const actions: Actions = {
	// ドキュメントを作成
	createDocument: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const title = data.get('title')?.toString();

		if (!title) {
			return fail(400, { error: 'ドキュメント名を入力してください' });
		}

		try {
			const result = await db
				.prepare('INSERT INTO standalone_documents (user_id, title) VALUES (?, ?)')
				.bind(locals.userId, title)
				.run();

			return { success: true, newDocId: result.meta?.last_row_id };
		} catch (error) {
			console.error('Create document error:', error);
			return fail(500, { error: 'ドキュメントの作成に失敗しました' });
		}
	},

	// ドキュメントを保存
	saveDocument: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const id = parseInt(data.get('id')?.toString() || '0');
		const title = data.get('title')?.toString();
		const content = data.get('content')?.toString();

		if (!title) {
			return fail(400, { error: 'ドキュメント名を入力してください' });
		}

		try {
			await db
				.prepare(`
					UPDATE standalone_documents
					SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP
					WHERE id = ? AND user_id = ?
				`)
				.bind(title, content, id, locals.userId)
				.run();

			return { success: true };
		} catch (error) {
			console.error('Save document error:', error);
			return fail(500, { error: 'ドキュメントの保存に失敗しました' });
		}
	},

	// ドキュメントを削除
	deleteDocument: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const id = parseInt(data.get('id')?.toString() || '0');

		try {
			await db
				.prepare('DELETE FROM standalone_documents WHERE id = ? AND user_id = ?')
				.bind(id, locals.userId)
				.run();

			return { success: true };
		} catch (error) {
			console.error('Delete document error:', error);
			return fail(500, { error: 'ドキュメントの削除に失敗しました' });
		}
	}
};
