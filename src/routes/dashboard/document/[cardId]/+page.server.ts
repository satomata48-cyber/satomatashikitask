import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDB } from '$lib/server/db';

interface Card {
	id: number;
	title: string;
	list_id: number;
}

interface List {
	id: number;
	title: string;
	board_id: number;
}

interface Board {
	id: number;
	title: string;
}

interface Document {
	id: number;
	card_id: number;
	content: string;
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
			.first<Card & { list_title: string; board_id: number; board_title: string }>();

		if (!cardResult) {
			throw error(403, 'このカードへのアクセス権限がありません');
		}

		// ドキュメントを取得（存在しない場合は空）
		const document = await db.prepare(
			'SELECT id, card_id, content FROM documents WHERE card_id = ?'
		)
			.bind(cardId)
			.first<Document>();

		return {
			card: {
				id: cardResult.id,
				title: cardResult.title,
				list_id: cardResult.list_id
			},
			listTitle: cardResult.list_title,
			boardId: cardResult.board_id,
			boardTitle: cardResult.board_title,
			document: document || { id: 0, card_id: cardId, content: '' }
		};
	} catch (err) {
		console.error('Document load error:', err);
		throw error(500, 'ドキュメントの読み込みに失敗しました');
	}
};

export const actions: Actions = {
	save: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const cardId = parseInt(params.cardId);
		const data = await request.formData();
		const content = data.get('content')?.toString() || '';

		try {
			// カードの所有権を確認
			const card = await db.prepare(
				'SELECT c.id FROM cards c JOIN lists l ON c.list_id = l.id JOIN boards b ON l.board_id = b.id WHERE c.id = ? AND b.user_id = ?'
			)
				.bind(cardId, locals.userId)
				.first();

			if (!card) {
				return fail(403, { error: 'このカードへのアクセス権限がありません' });
			}

			// 既存のドキュメントがあるか確認
			const existing = await db.prepare(
				'SELECT id FROM documents WHERE card_id = ?'
			)
				.bind(cardId)
				.first<{ id: number }>();

			if (existing) {
				// 更新
				await db.prepare(
					'UPDATE documents SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE card_id = ?'
				)
					.bind(content, cardId)
					.run();
			} else {
				// 新規作成
				await db.prepare(
					'INSERT INTO documents (card_id, content) VALUES (?, ?)'
				)
					.bind(cardId, content)
					.run();
			}

			return { success: true };
		} catch (error) {
			console.error('Save document error:', error);
			return fail(500, { error: 'ドキュメントの保存に失敗しました' });
		}
	}
};
