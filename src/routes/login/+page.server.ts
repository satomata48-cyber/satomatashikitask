import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import bcrypt from 'bcryptjs';
import { getDB } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	// 既にログイン済みならダッシュボードにリダイレクト
	if (locals.userId) {
		throw redirect(303, '/dashboard');
	}
	return {};
};

export const actions: Actions = {
	login: async ({ request, platform, cookies }) => {
		const data = await request.formData();
		const username = data.get('email')?.toString();
		const password = data.get('password')?.toString();

		if (!username || !password) {
			return fail(400, { error: 'ユーザー名とパスワードを入力してください' });
		}

		const db = getDB(platform);

		try {
			// ユーザーを検索
			const result = await db.prepare(
				'SELECT id, password_hash FROM users WHERE username = ?'
			)
				.bind(username)
				.first<{ id: number; password_hash: string }>();

			if (!result) {
				return fail(400, { error: 'ユーザー名またはパスワードが間違っています' });
			}

			// パスワードを検証
			const valid = await bcrypt.compare(password, result.password_hash);
			if (!valid) {
				return fail(400, { error: 'ユーザー名またはパスワードが間違っています' });
			}

			// セッションを設定
			cookies.set('session', result.id.toString(), {
				path: '/',
				httpOnly: true,
				sameSite: 'strict',
				secure: process.env.NODE_ENV === 'production',
				maxAge: 60 * 60 * 24 * 30 // 30日
			});
		} catch (error) {
			console.error('Login error:', error);
			return fail(500, { error: 'ログイン処理中にエラーが発生しました' });
		}

		throw redirect(303, '/dashboard');
	},

	register: async ({ request, platform, cookies }) => {
		const data = await request.formData();
		const username = data.get('email')?.toString();
		const password = data.get('password')?.toString();

		if (!username || !password) {
			return fail(400, { error: 'ユーザー名とパスワードを入力してください' });
		}

		if (password.length < 6) {
			return fail(400, { error: 'パスワードは6文字以上にしてください' });
		}

		const db = getDB(platform);

		try {
			// ユーザー名の重複チェック
			const existing = await db.prepare(
				'SELECT id FROM users WHERE username = ?'
			)
				.bind(username)
				.first();

			if (existing) {
				return fail(400, { error: 'このユーザー名は既に使用されています' });
			}

			// パスワードをハッシュ化
			const password_hash = await bcrypt.hash(password, 10);

			// ユーザーを作成
			await db.prepare(
				'INSERT INTO users (username, password_hash) VALUES (?, ?)'
			)
				.bind(username, password_hash)
				.run();

			// 作成したユーザーIDを取得
			const user = await db.prepare(
				'SELECT id FROM users WHERE username = ?'
			)
				.bind(username)
				.first<{ id: number }>();

			if (!user) {
				return fail(500, { error: 'ユーザー登録に失敗しました' });
			}

			// セッションを設定
			cookies.set('session', user.id.toString(), {
				path: '/',
				httpOnly: true,
				sameSite: 'strict',
				secure: process.env.NODE_ENV === 'production',
				maxAge: 60 * 60 * 24 * 30 // 30日
			});
		} catch (error) {
			console.error('Register error:', error);
			return fail(500, { error: 'ユーザー登録中にエラーが発生しました' });
		}

		throw redirect(303, '/dashboard');
	}
};
