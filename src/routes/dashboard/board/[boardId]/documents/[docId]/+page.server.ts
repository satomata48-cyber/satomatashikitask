import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/server/db';

interface Document {
	id: number;
	board_id: number;
	title: string;
	content: string;
	created_at: string;
	updated_at: string;
	parent_id: number | null;
}

export const load: PageServerLoad = async ({ locals, platform, params }) => {
	// 未ログインならログインページへリダイレクト
	if (!locals.userId) {
		throw redirect(303, '/login');
	}

	const db = getDB(platform);
	const boardId = parseInt(params.boardId);
	const docId = parseInt(params.docId);

	try {
		// ボードの所有権を確認
		const boardResult = await db.prepare(`
			SELECT id, title
			FROM boards
			WHERE id = ? AND user_id = ?
		`)
			.bind(boardId, locals.userId)
			.first<{ id: number; title: string }>();

		if (!boardResult) {
			throw error(403, 'このボードへのアクセス権限がありません');
		}

		// 指定されたドキュメントが存在し、このボードに属しているか確認
		const targetDoc = await db.prepare(
			'SELECT id FROM documents WHERE id = ? AND board_id = ?'
		)
			.bind(docId, boardId)
			.first<{ id: number }>();

		if (!targetDoc) {
			throw error(404, 'ドキュメントが見つかりません');
		}

		// ボードに関連するすべてのドキュメントを取得
		const documentsResult = await db.prepare(
			'SELECT id, board_id, title, content, created_at, updated_at, parent_id FROM documents WHERE board_id = ? ORDER BY parent_id NULLS FIRST, created_at ASC'
		)
			.bind(boardId)
			.all<Document>();

		return {
			board: {
				id: boardResult.id,
				title: boardResult.title
			},
			documents: documentsResult.results,
			currentDocId: docId
		};
	} catch (err) {
		console.error('Board document load error:', err);
		if (err instanceof Response) {
			throw err;
		}
		throw error(500, 'ドキュメントの読み込みに失敗しました');
	}
};

export const actions = {
	create: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			throw redirect(303, '/login');
		}

		const db = getDB(platform);
		const boardId = parseInt(params.boardId);
		const formData = await request.formData();
		const title = formData.get('title') as string;
		const content = formData.get('content') as string;
		const parentIdStr = formData.get('parentId') as string | null;
		const parentId = parentIdStr ? parseInt(parentIdStr) : null;

		// parent_idが必須（ルートドキュメントは作成できない）
		if (!parentId) {
			return { success: false, error: 'サブページのみ作成できます' };
		}

		try {
			// ボードの所有権を確認
			const boardResult = await db.prepare(`
				SELECT id
				FROM boards
				WHERE id = ? AND user_id = ?
			`)
				.bind(boardId, locals.userId)
				.first<{ id: number }>();

			if (!boardResult) {
				throw error(403, 'このボードへのアクセス権限がありません');
			}

			// ルートドキュメント配下の直接の子ドキュメント数をカウント
			const rootDoc = await db.prepare(
				'SELECT id FROM documents WHERE board_id = ? AND parent_id IS NULL'
			)
				.bind(boardId)
				.first<{ id: number }>();

			if (rootDoc && parentId === rootDoc.id) {
				const childCount = await db.prepare(
					'SELECT COUNT(*) as count FROM documents WHERE board_id = ? AND parent_id = ?'
				)
					.bind(boardId, rootDoc.id)
					.first<{ count: number }>();

				if (childCount && childCount.count >= 3) {
					return { success: false, error: 'ボードドキュメントは最大3つまでです' };
				}
			}

			// ドキュメントを作成
			const result = await db.prepare(
				'INSERT INTO documents (board_id, card_id, title, content, parent_id) VALUES (?, NULL, ?, ?, ?)'
			)
				.bind(boardId, title, content, parentId)
				.run();

			return { success: true, documentId: result.meta.last_row_id };
		} catch (err) {
			console.error('Board document create error:', err);
			return { success: false, error: 'ドキュメントの作成に失敗しました' };
		}
	},

	save: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			throw redirect(303, '/login');
		}

		const db = getDB(platform);
		const boardId = parseInt(params.boardId);
		const formData = await request.formData();
		const docId = parseInt(formData.get('docId') as string);
		const title = formData.get('title') as string;
		const content = formData.get('content') as string;

		console.log('========== BOARD SAVE ACTION ==========');
		console.log('Board ID:', boardId);
		console.log('Doc ID:', docId);
		console.log('Title:', title);
		console.log('Content:', content);
		console.log('Content length:', content?.length);

		try {
			// ボードの所有権を確認
			const boardResult = await db.prepare(`
				SELECT id
				FROM boards
				WHERE id = ? AND user_id = ?
			`)
				.bind(boardId, locals.userId)
				.first<{ id: number }>();

			if (!boardResult) {
				throw error(403, 'このボードへのアクセス権限がありません');
			}

			console.log('Before update - checking current state:');
			const before = await db.prepare('SELECT * FROM documents WHERE id = ?')
				.bind(docId)
				.first();
			console.log('Before:', before);

			// ドキュメントを更新
			const result = await db.prepare(
				'UPDATE documents SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND board_id = ?'
			)
				.bind(title, content, docId, boardId)
				.run();

			console.log('Update result:', result);

			console.log('After update - checking new state:');
			const after = await db.prepare('SELECT * FROM documents WHERE id = ?')
				.bind(docId)
				.first();
			console.log('After:', after);
			console.log('=================================');

			return { success: true };
		} catch (err) {
			console.error('Board document save error:', err);
			return { success: false, error: 'ドキュメントの保存に失敗しました' };
		}
	},

	delete: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			throw redirect(303, '/login');
		}

		const db = getDB(platform);
		const boardId = parseInt(params.boardId);
		const formData = await request.formData();
		const docId = parseInt(formData.get('docId') as string);

		try {
			// ボードの所有権を確認
			const boardResult = await db.prepare(`
				SELECT id
				FROM boards
				WHERE id = ? AND user_id = ?
			`)
				.bind(boardId, locals.userId)
				.first<{ id: number }>();

			if (!boardResult) {
				throw error(403, 'このボードへのアクセス権限がありません');
			}

			// ルートドキュメントかどうか確認
			const doc = await db.prepare('SELECT parent_id FROM documents WHERE id = ? AND board_id = ?')
				.bind(docId, boardId)
				.first<{ parent_id: number | null }>();

			if (doc && doc.parent_id === null) {
				return { success: false, error: 'ルートページは削除できません' };
			}

			// ドキュメントを削除（子ドキュメントも一緒に削除される）
			await db.prepare('DELETE FROM documents WHERE id = ? AND board_id = ?')
				.bind(docId, boardId)
				.run();

			return { success: true };
		} catch (err) {
			console.error('Board document delete error:', err);
			return { success: false, error: 'ドキュメントの削除に失敗しました' };
		}
	}
} satisfies Actions;
