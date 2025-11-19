import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/server/db';

interface Document {
	id: number;
	card_id: number;
	title: string;
	content: string;
	created_at: string;
	updated_at: string;
	parent_id: number | null;
}

export const load: PageServerLoad = async ({ locals, platform, params, cookies }) => {
	// 未ログインならログインページへリダイレクト
	if (!locals.userId) {
		throw redirect(303, '/login');
	}

	const db = getDB(platform);
	const cardId = parseInt(params.cardId);

	try {
		// カードの所有権とカード情報を確認
		const cardResult = await db.prepare(`
			SELECT c.id, c.title, c.list_id, l.title as list_title, l.board_id, b.title as board_title
			FROM cards c
			JOIN lists l ON c.list_id = l.id
			JOIN boards b ON l.board_id = b.id
			WHERE c.id = ? AND b.user_id = ?
		`)
			.bind(cardId, locals.userId)
			.first<{ id: number; title: string; list_id: number; list_title: string; board_id: number; board_title: string }>();

		if (!cardResult) {
			throw error(403, 'このカードへのアクセス権限がありません');
		}

		// ルートドキュメントが存在するか確認
		const rootDoc = await db.prepare(
			'SELECT id FROM documents WHERE card_id = ? AND parent_id IS NULL'
		)
			.bind(cardId)
			.first<{ id: number }>();

		// ルートドキュメントがなければ作成
		if (!rootDoc) {
			await db.prepare(
				'INSERT INTO documents (card_id, title, content, parent_id) VALUES (?, ?, ?, NULL)'
			)
				.bind(cardId, cardResult.title, '<p>ここからドキュメントを作成してください...</p>')
				.run();
		}

		// カードに関連するすべてのドキュメントを取得
		const documentsResult = await db.prepare(
			'SELECT id, card_id, title, content, created_at, updated_at, parent_id FROM documents WHERE card_id = ? ORDER BY parent_id NULLS FIRST, created_at ASC'
		)
			.bind(cardId)
			.all<Document>();

		return {
			card: {
				id: cardResult.id,
				title: cardResult.title,
				list_id: cardResult.list_id
			},
			listTitle: cardResult.list_title,
			boardId: cardResult.board_id,
			boardTitle: cardResult.board_title,
			documents: documentsResult.results
		};
	} catch (err) {
		console.error('Documents list load error:', err);
		throw error(500, 'ドキュメント一覧の読み込みに失敗しました');
	}
};

export const actions = {
	create: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			throw redirect(303, '/login');
		}

		const db = getDB(platform);
		const cardId = parseInt(params.cardId);
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
			// カードの所有権を確認
			const cardResult = await db.prepare(`
				SELECT c.id
				FROM cards c
				JOIN lists l ON c.list_id = l.id
				JOIN boards b ON l.board_id = b.id
				WHERE c.id = ? AND b.user_id = ?
			`)
				.bind(cardId, locals.userId)
				.first<{ id: number }>();

			if (!cardResult) {
				throw error(403, 'このカードへのアクセス権限がありません');
			}

			// ドキュメントを作成
			const result = await db.prepare(
				'INSERT INTO documents (card_id, title, content, parent_id) VALUES (?, ?, ?, ?)'
			)
				.bind(cardId, title, content, parentId)
				.run();

			return { success: true, documentId: result.meta.last_row_id };
		} catch (err) {
			console.error('Document create error:', err);
			return { success: false, error: 'ドキュメントの作成に失敗しました' };
		}
	},

	save: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			throw redirect(303, '/login');
		}

		const db = getDB(platform);
		const cardId = parseInt(params.cardId);
		const formData = await request.formData();
		const docId = parseInt(formData.get('docId') as string);
		const title = formData.get('title') as string;
		const content = formData.get('content') as string;

		console.log('========== SAVE ACTION ==========');
		console.log('Card ID:', cardId);
		console.log('Doc ID:', docId);
		console.log('Title:', title);
		console.log('Content:', content);
		console.log('Content length:', content?.length);

		try {
			// カードの所有権を確認
			const cardResult = await db.prepare(`
				SELECT c.id
				FROM cards c
				JOIN lists l ON c.list_id = l.id
				JOIN boards b ON l.board_id = b.id
				WHERE c.id = ? AND b.user_id = ?
			`)
				.bind(cardId, locals.userId)
				.first<{ id: number }>();

			if (!cardResult) {
				throw error(403, 'このカードへのアクセス権限がありません');
			}

			console.log('Before update - checking current state:');
			const before = await db.prepare('SELECT * FROM documents WHERE id = ?')
				.bind(docId)
				.first();
			console.log('Before:', before);

			// ドキュメントを更新
			const result = await db.prepare(
				'UPDATE documents SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND card_id = ?'
			)
				.bind(title, content, docId, cardId)
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
			console.error('Document save error:', err);
			return { success: false, error: 'ドキュメントの保存に失敗しました' };
		}
	},

	delete: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			throw redirect(303, '/login');
		}

		const db = getDB(platform);
		const cardId = parseInt(params.cardId);
		const formData = await request.formData();
		const docId = parseInt(formData.get('docId') as string);

		try {
			// カードの所有権を確認
			const cardResult = await db.prepare(`
				SELECT c.id
				FROM cards c
				JOIN lists l ON c.list_id = l.id
				JOIN boards b ON l.board_id = b.id
				WHERE c.id = ? AND b.user_id = ?
			`)
				.bind(cardId, locals.userId)
				.first<{ id: number }>();

			if (!cardResult) {
				throw error(403, 'このカードへのアクセス権限がありません');
			}

			// ルートドキュメントかどうか確認
			const doc = await db.prepare('SELECT parent_id FROM documents WHERE id = ? AND card_id = ?')
				.bind(docId, cardId)
				.first<{ parent_id: number | null }>();

			if (doc && doc.parent_id === null) {
				return { success: false, error: 'ルートページは削除できません' };
			}

			// ドキュメントを削除（子ドキュメントも一緒に削除される）
			await db.prepare('DELETE FROM documents WHERE id = ? AND card_id = ?')
				.bind(docId, cardId)
				.run();

			return { success: true };
		} catch (err) {
			console.error('Document delete error:', err);
			return { success: false, error: 'ドキュメントの削除に失敗しました' };
		}
	}
} satisfies Actions;
