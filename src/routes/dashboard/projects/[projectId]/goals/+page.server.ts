import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/server/db';

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

		// 目標一覧を取得
		const goals = await db
			.prepare(`
				SELECT
					id,
					title,
					description,
					target_value,
					current_value,
					unit,
					deadline,
					status,
					created_at,
					updated_at
				FROM project_goals
				WHERE project_id = ?
				ORDER BY
					CASE status
						WHEN 'in_progress' THEN 1
						WHEN 'pending' THEN 2
						WHEN 'completed' THEN 3
						ELSE 4
					END,
					deadline ASC
			`)
			.bind(projectId)
			.all();

		return {
			project,
			goals: goals.results
		};
	} catch (err) {
		console.error('Goals load error:', err);
		throw error(500, 'データの読み込みに失敗しました');
	}
};

export const actions: Actions = {
	createGoal: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();

		const title = data.get('title')?.toString();
		const description = data.get('description')?.toString() || null;
		const targetValue = parseFloat(data.get('target_value')?.toString() || '0');
		const unit = data.get('unit')?.toString() || '';
		const deadline = data.get('deadline')?.toString() || null;

		if (!title) {
			return fail(400, { error: '目標名を入力してください' });
		}

		try {
			await db.prepare(`
				INSERT INTO project_goals (project_id, title, description, target_value, current_value, unit, deadline, status)
				VALUES (?, ?, ?, ?, 0, ?, ?, 'pending')
			`)
			.bind(projectId, title, description, targetValue, unit, deadline)
			.run();

			return { success: true };
		} catch (err) {
			console.error('Create goal error:', err);
			return fail(500, { error: '目標の作成に失敗しました' });
		}
	},

	updateProgress: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();

		const goalId = parseInt(data.get('goal_id')?.toString() || '0');
		const currentValue = parseFloat(data.get('current_value')?.toString() || '0');

		try {
			// 目標を取得して進捗率を計算
			const goal = await db
				.prepare('SELECT target_value FROM project_goals WHERE id = ?')
				.bind(goalId)
				.first<{ target_value: number }>();

			if (!goal) {
				return fail(404, { error: '目標が見つかりません' });
			}

			// ステータスを自動更新
			let status = 'in_progress';
			if (currentValue >= goal.target_value) {
				status = 'completed';
			} else if (currentValue === 0) {
				status = 'pending';
			}

			await db.prepare(`
				UPDATE project_goals
				SET current_value = ?, status = ?, updated_at = CURRENT_TIMESTAMP
				WHERE id = ?
			`)
			.bind(currentValue, status, goalId)
			.run();

			return { success: true };
		} catch (err) {
			console.error('Update progress error:', err);
			return fail(500, { error: '進捗の更新に失敗しました' });
		}
	},

	updateGoal: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();

		const goalId = parseInt(data.get('id')?.toString() || '0');
		const title = data.get('title')?.toString();
		const description = data.get('description')?.toString() || null;
		const targetValue = parseFloat(data.get('target_value')?.toString() || '0');
		const unit = data.get('unit')?.toString() || '';
		const deadline = data.get('deadline')?.toString() || null;

		if (!title) {
			return fail(400, { error: '目標名を入力してください' });
		}

		try {
			await db.prepare(`
				UPDATE project_goals
				SET title = ?, description = ?, target_value = ?, unit = ?, deadline = ?, updated_at = CURRENT_TIMESTAMP
				WHERE id = ?
			`)
			.bind(title, description, targetValue, unit, deadline, goalId)
			.run();

			return { success: true };
		} catch (err) {
			console.error('Update goal error:', err);
			return fail(500, { error: '目標の更新に失敗しました' });
		}
	},

	deleteGoal: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const goalId = parseInt(data.get('id')?.toString() || '0');

		try {
			await db.prepare('DELETE FROM project_goals WHERE id = ?')
				.bind(goalId)
				.run();

			return { success: true };
		} catch (err) {
			console.error('Delete goal error:', err);
			return fail(500, { error: '目標の削除に失敗しました' });
		}
	}
};
