import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/server/db';

interface ProjectDocument {
	id: number;
	project_id: number;
	title: string;
	content: string | null;
	updated_at: string;
}

export const load: PageServerLoad = async ({ locals, platform, params }) => {
	if (!locals.userId) {
		throw redirect(303, '/login');
	}

	const db = getDB(platform);
	const userId = locals.userId;
	const projectId = parseInt(params.projectId);

	try {
		// プロジェクト情報を取得
		const project = await db
			.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
			.bind(projectId, userId)
			.first();

		if (!project) {
			throw error(404, 'プロジェクトが見つかりません');
		}

		// ドキュメント一覧を取得
		const documents = await db
			.prepare(`
				SELECT id, project_id, title, content, updated_at
				FROM project_documents
				WHERE project_id = ?
				ORDER BY updated_at DESC
			`)
			.bind(projectId)
			.all<ProjectDocument>();

		// 全てのドキュメント一覧（ウィジェット用）
		const allDocuments = await db
			.prepare(`
				SELECT pd.id, pd.project_id, pd.title, pd.updated_at, p.title as project_title
				FROM project_documents pd
				LEFT JOIN projects p ON pd.project_id = p.id
				WHERE p.user_id = ?
				ORDER BY pd.updated_at DESC
			`)
			.bind(userId)
			.all();

		return {
			project,
			documents: documents.results,
			allDocuments: allDocuments.results
		};
	} catch (err) {
		console.error('Documents load error:', err);
		throw error(500, 'データの読み込みに失敗しました');
	}
};

export const actions: Actions = {
	createDocument: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const title = data.get('title')?.toString();

		if (!title) {
			return fail(400, { error: 'ドキュメント名を入力してください' });
		}

		try {
			await db.prepare(
				'INSERT INTO project_documents (project_id, title) VALUES (?, ?)'
			)
			.bind(projectId, title)
			.run();

			return { success: true };
		} catch (err) {
			console.error('Create document error:', err);
			return fail(500, { error: 'ドキュメントの作成に失敗しました' });
		}
	},

	saveDocument: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const docId = parseInt(data.get('id')?.toString() || '0');
		const title = data.get('title')?.toString();
		const content = data.get('content')?.toString();

		if (!title) {
			return fail(400, { error: 'ドキュメント名を入力してください' });
		}

		try {
			// Verify project ownership
			const project = await db.prepare(
				'SELECT id FROM projects WHERE id = ? AND user_id = ?'
			)
				.bind(projectId, locals.userId)
				.first<{ id: number }>();

			if (!project) {
				return fail(403, { error: 'このプロジェクトへのアクセス権限がありません' });
			}

			// Update document
			await db.prepare(
				'UPDATE project_documents SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND project_id = ?'
			)
				.bind(title, content, docId, projectId)
				.run();

			return { success: true };
		} catch (err) {
			console.error('Save document error:', err);
			return fail(500, { error: 'ドキュメントの保存に失敗しました' });
		}
	},

	deleteDocument: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const docId = parseInt(data.get('id')?.toString() || '0');

		try {
			await db.prepare('DELETE FROM project_documents WHERE id = ?')
				.bind(docId)
				.run();

			return { success: true };
		} catch (err) {
			console.error('Delete document error:', err);
			return fail(500, { error: 'ドキュメントの削除に失敗しました' });
		}
	}
};
