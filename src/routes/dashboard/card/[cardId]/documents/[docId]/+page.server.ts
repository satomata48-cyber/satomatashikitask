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
}

export const load: PageServerLoad = async ({ locals, platform, params }) => {
	// 未ログインならログインページへリダイレクト
	if (!locals.userId) {
		throw redirect(303, '/login');
	}

	const db = getDB(platform);
	const cardId = parseInt(params.cardId);
	const docId = parseInt(params.docId);

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

		// ドキュメントを取得
		const document = await db.prepare(
			'SELECT id, card_id, title, content, created_at, updated_at FROM documents WHERE id = ? AND card_id = ?'
		)
			.bind(docId, cardId)
			.first<Document>();

		if (!document) {
			throw error(404, 'ドキュメントが見つかりません');
		}

		return {
			card: {
				id: cardResult.id,
				title: cardResult.title,
				list_id: cardResult.list_id
			},
			listTitle: cardResult.list_title,
			boardId: cardResult.board_id,
			boardTitle: cardResult.board_title,
			document
		};
	} catch (err) {
		console.error('Document load error:', err);
		throw error(500, 'ドキュメントの読み込みに失敗しました');
	}
};

export const actions = {
	save: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			throw redirect(303, '/login');
		}

		const db = getDB(platform);
		const cardId = parseInt(params.cardId);
		const docId = parseInt(params.docId);
		const formData = await request.formData();
		const title = formData.get('title') as string;
		const content = formData.get('content') as string;

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

			// ドキュメントを更新
			await db.prepare(
				'UPDATE documents SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND card_id = ?'
			)
				.bind(title, content, docId, cardId)
				.run();

			return { success: true };
		} catch (err) {
			console.error('Document save error:', err);
			return { success: false, error: 'ドキュメントの保存に失敗しました' };
		}
	},

	delete: async ({ locals, platform, params }) => {
		if (!locals.userId) {
			throw redirect(303, '/login');
		}

		const db = getDB(platform);
		const cardId = parseInt(params.cardId);
		const docId = parseInt(params.docId);

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

			// ドキュメントを削除
			await db.prepare('DELETE FROM documents WHERE id = ? AND card_id = ?')
				.bind(docId, cardId)
				.run();
		} catch (err) {
			console.error('Document delete error:', err);
			throw error(500, 'ドキュメントの削除に失敗しました');
		}

		throw redirect(303, `/dashboard/card/${cardId}/documents`);
	}
} satisfies Actions;
