import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import bcrypt from 'bcryptjs';

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
		const username = data.get('username')?.toString();
		const password = data.get('password')?.toString();

		if (!username || !password) {
			return fail(400, { error: 'ユーザー名とパスワードを入力してください' });
		}

		if (!platform?.env?.DB) {
			return fail(500, { error: 'データベースに接続できません' });
		}

		try {
			// ユーザーを検索
			const result = await platform.env.DB.prepare(
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

			throw redirect(303, '/dashboard');
		} catch (error) {
			if (error instanceof Response) {
				throw error;
			}
			console.error('Login error:', error);
			return fail(500, { error: 'ログイン処理中にエラーが発生しました' });
		}
	},

	register: async ({ request, platform, cookies }) => {
		const data = await request.formData();
		const username = data.get('username')?.toString();
		const password = data.get('password')?.toString();

		if (!username || !password) {
			return fail(400, { error: 'ユーザー名とパスワードを入力してください' });
		}

		if (password.length < 6) {
			return fail(400, { error: 'パスワードは6文字以上にしてください' });
		}

		if (!platform?.env?.DB) {
			return fail(500, { error: 'データベースに接続できません' });
		}

		try {
			// ユーザー名の重複チェック
			const existing = await platform.env.DB.prepare(
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
			const result = await platform.env.DB.prepare(
				'INSERT INTO users (username, password_hash) VALUES (?, ?) RETURNING id'
			)
				.bind(username, password_hash)
				.first<{ id: number }>();

			if (!result) {
				return fail(500, { error: 'ユーザー登録に失敗しました' });
			}

			// セッションを設定
			cookies.set('session', result.id.toString(), {
				path: '/',
				httpOnly: true,
				sameSite: 'strict',
				secure: process.env.NODE_ENV === 'production',
				maxAge: 60 * 60 * 24 * 30 // 30日
			});

			throw redirect(303, '/dashboard');
		} catch (error) {
			if (error instanceof Response) {
				throw error;
			}
			console.error('Register error:', error);
			return fail(500, { error: 'ユーザー登録中にエラーが発生しました' });
		}
	}
};
