import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/server/db';

interface Document {
	id: number;
	project_id: number;
	title: string;
	content: string;
	created_at: string;
	updated_at: string;
}

interface Project {
	id: number;
	title: string;
	color: string;
}

export const load: PageServerLoad = async ({ locals, platform, params }) => {
	if (!locals.userId) {
		throw redirect(303, '/login');
	}

	const db = getDB(platform);
	const projectId = parseInt(params.projectId);
	const docId = parseInt(params.docId);

	try {
		// プロジェクトの所有権を確認
		const project = await db.prepare(
			'SELECT id, title, color FROM projects WHERE id = ? AND user_id = ?'
		)
			.bind(projectId, locals.userId)
			.first<Project>();

		if (!project) {
			throw error(403, 'このプロジェクトへのアクセス権限がありません');
		}

		// ドキュメントを取得
		const document = await db.prepare(
			'SELECT id, project_id, title, content, created_at, updated_at FROM documents WHERE id = ? AND project_id = ?'
		)
			.bind(docId, projectId)
			.first<Document>();

		if (!document) {
			throw error(404, 'ドキュメントが見つかりません');
		}

		return {
			project,
			document
		};
	} catch (err) {
		if (err instanceof Response) {
			throw err;
		}
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
		const projectId = parseInt(params.projectId);
		const docId = parseInt(params.docId);
		const formData = await request.formData();
		const title = formData.get('title') as string;
		const content = formData.get('content') as string;

		try {
			// プロジェクトの所有権を確認
			const project = await db.prepare(
				'SELECT id FROM projects WHERE id = ? AND user_id = ?'
			)
				.bind(projectId, locals.userId)
				.first<{ id: number }>();

			if (!project) {
				throw error(403, 'このプロジェクトへのアクセス権限がありません');
			}

			// ドキュメントを更新
			await db.prepare(
				'UPDATE documents SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND project_id = ?'
			)
				.bind(title, content, docId, projectId)
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
		const projectId = parseInt(params.projectId);
		const docId = parseInt(params.docId);

		try {
			// プロジェクトの所有権を確認
			const project = await db.prepare(
				'SELECT id FROM projects WHERE id = ? AND user_id = ?'
			)
				.bind(projectId, locals.userId)
				.first<{ id: number }>();

			if (!project) {
				throw error(403, 'このプロジェクトへのアクセス権限がありません');
			}

			// ドキュメントを削除
			await db.prepare('DELETE FROM documents WHERE id = ? AND project_id = ?')
				.bind(docId, projectId)
				.run();
		} catch (err) {
			console.error('Document delete error:', err);
			throw error(500, 'ドキュメントの削除に失敗しました');
		}

		throw redirect(303, `/dashboard/projects/${projectId}`);
	}
} satisfies Actions;
