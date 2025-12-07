import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDB } from '$lib/server/db';

/**
 * Dashboard Server
 *
 * データベースエラーが発生した場合は DATABASE_GUIDE.md を参照
 * - エラー "no such table: projects" → npm run db:check && npm run db:migrate:safe
 * - 500 Internal Error → npm run db:check でマイグレーション状態を確認
 */

interface Project {
	id: number;
	title: string;
	description: string | null;
	status: string;
	color: string;
	position: number;
	milestone_count: number;
	completed_tasks: number;
	total_tasks: number;
}

interface ProjectTag {
	id: number;
	name: string;
	color: string;
}

interface ProjectWithTags extends Project {
	tags?: ProjectTag[];
}

export const load: PageServerLoad = async ({ locals, platform, cookies }) => {
	if (!locals.userId) {
		throw redirect(303, '/login');
	}

	// プロジェクト管理ページにリダイレクト
	throw redirect(303, '/dashboard/projects');

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
		// プロジェクト一覧を取得
		const projects = await db
			.prepare(`
				SELECT
					p.id,
					p.title,
					p.description,
					p.status,
					p.color,
					p.position,
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

		// 全タグを取得
		const allTags = await db
			.prepare('SELECT id, name, color FROM project_tags WHERE user_id = ?')
			.bind(userId)
			.all<ProjectTag>();

		// 各プロジェクトのタグを取得
		const projectsWithTags: ProjectWithTags[] = [];
		for (const project of projects.results) {
			const projectTags = await db
				.prepare(`
					SELECT pt.id, pt.name, pt.color
					FROM project_tags pt
					JOIN project_tag_mappings ptm ON pt.id = ptm.tag_id
					WHERE ptm.project_id = ?
				`)
				.bind(project.id)
				.all<ProjectTag>();

			projectsWithTags.push({
				...project,
				tags: projectTags.results
			});
		}

		return {
			projects: projectsWithTags,
			allTags: allTags.results
		};
	} catch (error) {
		console.error('Dashboard load error:', error);
		throw new Error('データの読み込みに失敗しました');
	}
};

export const actions: Actions = {
	logout: async ({ cookies }) => {
		cookies.delete('session', { path: '/' });
		throw redirect(303, '/login');
	},

	createProject: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const title = data.get('title')?.toString();
		const description = data.get('description')?.toString() || null;
		const color = data.get('color')?.toString() || '#3B82F6';
		const tagIds = data.getAll('tag_ids').map(id => parseInt(id.toString()));

		if (!title) {
			return fail(400, { error: 'プロジェクト名を入力してください' });
		}

		try {
			const maxPos = await db.prepare(
				'SELECT COALESCE(MAX(position), -1) as max_pos FROM projects WHERE user_id = ?'
			)
				.bind(locals.userId)
				.first<{ max_pos: number }>();

			// プロジェクトを作成
			const result = await db.prepare(
				'INSERT INTO projects (user_id, title, description, color, position) VALUES (?, ?, ?, ?, ?)'
			)
				.bind(locals.userId, title, description, color, (maxPos?.max_pos ?? -1) + 1)
				.run();

			// タグを紐づけ
			if (tagIds.length > 0 && result.meta.last_row_id) {
				const projectId = result.meta.last_row_id;
				for (const tagId of tagIds) {
					await db.prepare('INSERT INTO project_tag_mappings (project_id, tag_id) VALUES (?, ?)')
						.bind(projectId, tagId)
						.run();
				}
			}

			return { success: true };
		} catch (error) {
			console.error('Create project error:', error);
			return fail(500, { error: 'プロジェクトの作成に失敗しました' });
		}
	}
};
