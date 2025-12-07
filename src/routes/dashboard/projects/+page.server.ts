import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDB } from '$lib/server/db';

interface Project {
	id: number;
	title: string;
	description: string | null;
	status: string;
	color: string;
	position: number;
	created_at: string;
	updated_at: string;
	milestone_count: number;
	completed_tasks: number;
	total_tasks: number;
}

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

	try {
		// プロジェクト一覧を取得（マイルストーン数、タスク完了数も含む）
		const projects = await db
			.prepare(`
				SELECT
					p.id,
					p.title,
					p.description,
					p.status,
					p.color,
					p.position,
					p.created_at,
					p.updated_at,
					(SELECT COUNT(*) FROM milestones m WHERE m.project_id = p.id) as milestone_count,
					(SELECT COUNT(*) FROM milestone_tasks mt
					 JOIN milestones m ON mt.milestone_id = m.id
					 WHERE m.project_id = p.id AND mt.completed = 1) as completed_tasks,
					(SELECT COUNT(*) FROM milestone_tasks mt
					 JOIN milestones m ON mt.milestone_id = m.id
					 WHERE m.project_id = p.id) as total_tasks
				FROM projects p
				WHERE p.user_id = ?
				ORDER BY p.position
			`)
			.bind(userId)
			.all<Project>();

		return {
			projects: projects.results
		};
	} catch (error) {
		console.error('Projects load error:', error);
		throw new Error('プロジェクトの読み込みに失敗しました');
	}
};

export const actions: Actions = {
	createProject: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const title = data.get('title')?.toString();
		const description = data.get('description')?.toString() || null;
		const color = data.get('color')?.toString() || '#3B82F6';

		if (!title) {
			return fail(400, { error: 'プロジェクト名を入力してください' });
		}

		try {
			const maxPos = await db.prepare(
				'SELECT COALESCE(MAX(position), -1) as max_pos FROM projects WHERE user_id = ?'
			)
				.bind(locals.userId)
				.first<{ max_pos: number }>();

			await db.prepare(
				'INSERT INTO projects (user_id, title, description, color, position) VALUES (?, ?, ?, ?, ?)'
			)
				.bind(locals.userId, title, description, color, (maxPos?.max_pos ?? -1) + 1)
				.run();

			return { success: true };
		} catch (error) {
			console.error('Create project error:', error);
			return fail(500, { error: 'プロジェクトの作成に失敗しました' });
		}
	},

	updateProject: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const title = data.get('title')?.toString();
		const description = data.get('description')?.toString() || null;
		const color = data.get('color')?.toString();
		const status = data.get('status')?.toString();

		if (!id || !title) {
			return fail(400, { error: 'プロジェクトIDと名前が必要です' });
		}

		try {
			const project = await db.prepare(
				'SELECT id FROM projects WHERE id = ? AND user_id = ?'
			)
				.bind(parseInt(id), locals.userId)
				.first();

			if (!project) {
				return fail(403, { error: 'このプロジェクトへのアクセス権限がありません' });
			}

			await db.prepare(
				'UPDATE projects SET title = ?, description = ?, color = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
			)
				.bind(title, description, color || '#3B82F6', status || 'active', parseInt(id))
				.run();

			return { success: true };
		} catch (error) {
			console.error('Update project error:', error);
			return fail(500, { error: 'プロジェクトの更新に失敗しました' });
		}
	},

	deleteProject: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const id = data.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'プロジェクトIDが必要です' });
		}

		try {
			const project = await db.prepare(
				'SELECT id FROM projects WHERE id = ? AND user_id = ?'
			)
				.bind(parseInt(id), locals.userId)
				.first();

			if (!project) {
				return fail(403, { error: 'このプロジェクトへのアクセス権限がありません' });
			}

			await db.prepare('DELETE FROM projects WHERE id = ?')
				.bind(parseInt(id))
				.run();

			return { success: true };
		} catch (error) {
			console.error('Delete project error:', error);
			return fail(500, { error: 'プロジェクトの削除に失敗しました' });
		}
	}
};
