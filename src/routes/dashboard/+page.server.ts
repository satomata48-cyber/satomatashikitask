import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDB } from '$lib/server/db';

/**
 * Dashboard Server - ハブページ
 */

export const load: PageServerLoad = async ({ locals, platform, cookies }) => {
	if (!locals.userId) {
		throw redirect(303, '/login');
	}

	const db = getDB(platform);
	const userId = locals.userId;

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

	// 各機能の統計を取得
	let boardCount = 0;
	let projectCount = 0;
	let noteCount = 0;
	let documentCount = 0;

	try {
		// ボード数
		const boards = await db
			.prepare('SELECT COUNT(*) as count FROM boards WHERE user_id = ?')
			.bind(userId)
			.first<{ count: number }>();
		boardCount = boards?.count || 0;
	} catch {
		// Table may not exist
	}

	try {
		// プロジェクト数
		const projects = await db
			.prepare('SELECT COUNT(*) as count FROM projects WHERE user_id = ?')
			.bind(userId)
			.first<{ count: number }>();
		projectCount = projects?.count || 0;
	} catch {
		// Table may not exist
	}

	try {
		// メモ数
		const notes = await db
			.prepare('SELECT COUNT(*) as count FROM notes WHERE user_id = ?')
			.bind(userId)
			.first<{ count: number }>();
		noteCount = notes?.count || 0;
	} catch {
		// Table may not exist
	}

	try {
		// ドキュメント数（standalone_documentsテーブル）
		const documents = await db
			.prepare('SELECT COUNT(*) as count FROM standalone_documents WHERE user_id = ?')
			.bind(userId)
			.first<{ count: number }>();
		documentCount = documents?.count || 0;
	} catch {
		// Table may not exist
	}

	return {
		stats: {
			boardCount,
			projectCount,
			noteCount,
			documentCount
		}
	};
};

export const actions: Actions = {
	logout: async ({ cookies }) => {
		cookies.delete('session', { path: '/' });
		throw redirect(303, '/login');
	}
};
