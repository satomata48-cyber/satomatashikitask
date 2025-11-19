import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals, platform, params }) => {
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

		return {
			card: {
				id: cardResult.id,
				title: cardResult.title,
				list_id: cardResult.list_id
			},
			listTitle: cardResult.list_title,
			boardId: cardResult.board_id,
			boardTitle: cardResult.board_title
		};
	} catch (err) {
		console.error('New document page load error:', err);
		throw error(500, '新規ドキュメントページの読み込みに失敗しました');
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
			await db.prepare(
				'INSERT INTO documents (card_id, title, content) VALUES (?, ?, ?)'
			)
				.bind(cardId, title, content)
				.run();
		} catch (err) {
			console.error('Document create error:', err);
			throw error(500, 'ドキュメントの作成に失敗しました');
		}

		throw redirect(303, `/dashboard/card/${cardId}/documents`);
	}
} satisfies Actions;
