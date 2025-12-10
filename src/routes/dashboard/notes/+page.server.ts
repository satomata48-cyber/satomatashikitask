import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDB } from '$lib/server/db';

interface Note {
	id: number;
	title: string | null;
	content: string | null;
	color: string;
	pinned: number;
	archived: number;
	category_id: number | null;
	tags: string | null;
	created_at: string;
	updated_at: string;
	category_name?: string | null;
	category_color?: string | null;
}

interface NoteCategory {
	id: number;
	name: string;
	color: string;
	position: number;
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.userId) {
		throw redirect(303, '/login');
	}

	const db = getDB(platform);
	const userId = locals.userId;

	try {
		// カテゴリを取得
		const categories = await db
			.prepare('SELECT id, name, color, position FROM note_categories WHERE user_id = ? ORDER BY position')
			.bind(userId)
			.all<NoteCategory>();

		// アクティブなメモを取得（カテゴリ情報も含む）
		const notes = await db
			.prepare(`
				SELECT n.id, n.title, n.content, n.color, n.pinned, n.archived,
				       n.category_id, n.tags, n.created_at, n.updated_at,
				       c.name as category_name, c.color as category_color
				FROM notes n
				LEFT JOIN note_categories c ON n.category_id = c.id
				WHERE n.user_id = ? AND n.archived = 0
				ORDER BY n.pinned DESC, n.updated_at DESC
			`)
			.bind(userId)
			.all<Note>();

		// アーカイブされたメモの数
		const archivedCount = await db
			.prepare('SELECT COUNT(*) as count FROM notes WHERE user_id = ? AND archived = 1')
			.bind(userId)
			.first<{ count: number }>();

		return {
			notes: notes.results || [],
			categories: categories.results || [],
			archivedCount: archivedCount?.count || 0
		};
	} catch (error) {
		console.error('Notes load error:', error);
		return {
			notes: [],
			categories: [],
			archivedCount: 0
		};
	}
};

export const actions: Actions = {
	// メモを作成
	create: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const title = data.get('title')?.toString() || null;
		const content = data.get('content')?.toString() || null;
		const color = data.get('color')?.toString() || '#FEF3C7';
		const categoryIdStr = data.get('category_id')?.toString();
		const categoryId = categoryIdStr ? parseInt(categoryIdStr) : null;
		const tags = data.get('tags')?.toString() || '[]';

		if (!title && !content) {
			return fail(400, { error: 'タイトルまたは内容を入力してください' });
		}

		try {
			await db
				.prepare('INSERT INTO notes (user_id, title, content, color, category_id, tags) VALUES (?, ?, ?, ?, ?, ?)')
				.bind(locals.userId, title, content, color, categoryId, tags)
				.run();

			return { success: true };
		} catch (error) {
			console.error('Create note error:', error);
			return fail(500, { error: 'メモの作成に失敗しました' });
		}
	},

	// メモを更新
	update: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const id = parseInt(data.get('id')?.toString() || '0');
		const title = data.get('title')?.toString() || null;
		const content = data.get('content')?.toString() || null;
		const color = data.get('color')?.toString();
		const categoryIdStr = data.get('category_id')?.toString();
		const categoryId = categoryIdStr === '' ? null : (categoryIdStr ? parseInt(categoryIdStr) : undefined);
		const tags = data.get('tags')?.toString();

		try {
			if (categoryId !== undefined && tags !== undefined) {
				// カテゴリとタグも更新
				await db
					.prepare(`
						UPDATE notes
						SET title = ?, content = ?, color = COALESCE(?, color),
						    category_id = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
						WHERE id = ? AND user_id = ?
					`)
					.bind(title, content, color, categoryId, tags, id, locals.userId)
					.run();
			} else {
				// 基本情報のみ更新
				await db
					.prepare(`
						UPDATE notes
						SET title = ?, content = ?, color = COALESCE(?, color), updated_at = CURRENT_TIMESTAMP
						WHERE id = ? AND user_id = ?
					`)
					.bind(title, content, color, id, locals.userId)
					.run();
			}

			return { success: true };
		} catch (error) {
			console.error('Update note error:', error);
			return fail(500, { error: 'メモの更新に失敗しました' });
		}
	},

	// メモを削除
	delete: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const id = parseInt(data.get('id')?.toString() || '0');

		try {
			await db
				.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?')
				.bind(id, locals.userId)
				.run();

			return { success: true };
		} catch (error) {
			console.error('Delete note error:', error);
			return fail(500, { error: 'メモの削除に失敗しました' });
		}
	},

	// ピン留めを切り替え
	togglePin: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const id = parseInt(data.get('id')?.toString() || '0');

		try {
			await db
				.prepare(`
					UPDATE notes
					SET pinned = CASE WHEN pinned = 1 THEN 0 ELSE 1 END, updated_at = CURRENT_TIMESTAMP
					WHERE id = ? AND user_id = ?
				`)
				.bind(id, locals.userId)
				.run();

			return { success: true };
		} catch (error) {
			console.error('Toggle pin error:', error);
			return fail(500, { error: 'ピン留めの切り替えに失敗しました' });
		}
	},

	// アーカイブを切り替え
	toggleArchive: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const id = parseInt(data.get('id')?.toString() || '0');

		try {
			await db
				.prepare(`
					UPDATE notes
					SET archived = CASE WHEN archived = 1 THEN 0 ELSE 1 END, updated_at = CURRENT_TIMESTAMP
					WHERE id = ? AND user_id = ?
				`)
				.bind(id, locals.userId)
				.run();

			return { success: true };
		} catch (error) {
			console.error('Toggle archive error:', error);
			return fail(500, { error: 'アーカイブの切り替えに失敗しました' });
		}
	},

	// 色を変更
	changeColor: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const id = parseInt(data.get('id')?.toString() || '0');
		const color = data.get('color')?.toString() || '#FEF3C7';

		try {
			await db
				.prepare('UPDATE notes SET color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?')
				.bind(color, id, locals.userId)
				.run();

			return { success: true };
		} catch (error) {
			console.error('Change color error:', error);
			return fail(500, { error: '色の変更に失敗しました' });
		}
	},

	// カテゴリを作成
	createCategory: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const name = data.get('name')?.toString();
		const color = data.get('color')?.toString() || '#6B7280';

		if (!name) {
			return fail(400, { error: 'カテゴリ名を入力してください' });
		}

		try {
			// 最大のposition値を取得
			const maxPos = await db
				.prepare('SELECT COALESCE(MAX(position), -1) as max_pos FROM note_categories WHERE user_id = ?')
				.bind(locals.userId)
				.first<{ max_pos: number }>();

			await db
				.prepare('INSERT INTO note_categories (user_id, name, color, position) VALUES (?, ?, ?, ?)')
				.bind(locals.userId, name, color, (maxPos?.max_pos ?? -1) + 1)
				.run();

			return { success: true };
		} catch (error) {
			console.error('Create category error:', error);
			return fail(500, { error: 'カテゴリの作成に失敗しました' });
		}
	},

	// カテゴリを更新
	updateCategory: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const id = parseInt(data.get('id')?.toString() || '0');
		const name = data.get('name')?.toString();
		const color = data.get('color')?.toString();

		if (!name) {
			return fail(400, { error: 'カテゴリ名を入力してください' });
		}

		try {
			await db
				.prepare('UPDATE note_categories SET name = ?, color = COALESCE(?, color) WHERE id = ? AND user_id = ?')
				.bind(name, color, id, locals.userId)
				.run();

			return { success: true };
		} catch (error) {
			console.error('Update category error:', error);
			return fail(500, { error: 'カテゴリの更新に失敗しました' });
		}
	},

	// カテゴリを削除
	deleteCategory: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const id = parseInt(data.get('id')?.toString() || '0');

		try {
			// カテゴリを削除（メモのcategory_idはnullになる）
			await db
				.prepare('UPDATE notes SET category_id = NULL WHERE category_id = ? AND user_id = ?')
				.bind(id, locals.userId)
				.run();

			await db
				.prepare('DELETE FROM note_categories WHERE id = ? AND user_id = ?')
				.bind(id, locals.userId)
				.run();

			return { success: true };
		} catch (error) {
			console.error('Delete category error:', error);
			return fail(500, { error: 'カテゴリの削除に失敗しました' });
		}
	},

	// メモのカテゴリを変更
	setCategory: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const id = parseInt(data.get('id')?.toString() || '0');
		const categoryIdStr = data.get('category_id')?.toString();
		const categoryId = categoryIdStr === '' ? null : (categoryIdStr ? parseInt(categoryIdStr) : null);

		try {
			await db
				.prepare('UPDATE notes SET category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?')
				.bind(categoryId, id, locals.userId)
				.run();

			return { success: true };
		} catch (error) {
			console.error('Set category error:', error);
			return fail(500, { error: 'カテゴリの設定に失敗しました' });
		}
	},

	// メモのタグを更新
	updateTags: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const id = parseInt(data.get('id')?.toString() || '0');
		const tags = data.get('tags')?.toString() || '[]';

		try {
			await db
				.prepare('UPDATE notes SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?')
				.bind(tags, id, locals.userId)
				.run();

			return { success: true };
		} catch (error) {
			console.error('Update tags error:', error);
			return fail(500, { error: 'タグの更新に失敗しました' });
		}
	}
};
