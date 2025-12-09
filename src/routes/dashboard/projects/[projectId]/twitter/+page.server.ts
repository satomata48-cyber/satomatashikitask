import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/server/db';
import { getUserInfo, getRequestToken, getUserStats } from '$lib/server/twitter';

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
			.prepare('SELECT id, title FROM projects WHERE id = ? AND user_id = ?')
			.bind(projectId, userId)
			.first<{ id: number; title: string }>();

		if (!project) {
			throw redirect(303, '/dashboard');
		}

		// Twitter/Xアカウント情報を取得
		const account = await db
			.prepare('SELECT * FROM twitter_accounts WHERE project_id = ? ORDER BY created_at DESC LIMIT 1')
			.bind(projectId)
			.first();

		// 最新の統計を取得
		let latestStats = null;
		if (account) {
			latestStats = await db
				.prepare('SELECT * FROM twitter_stats WHERE account_id = ? ORDER BY recorded_date DESC LIMIT 1')
				.bind(account.id)
				.first();
		}

		// Twitter API設定を取得
		const settings = await db
			.prepare('SELECT id, api_key, api_secret, access_token, access_token_secret FROM twitter_settings WHERE project_id = ?')
			.bind(projectId)
			.first<{ id: number; api_key: string; api_secret: string; access_token: string; access_token_secret: string }>();

		// OAuth接続状態を取得
		const oauthToken = await db
			.prepare('SELECT id, twitter_username, twitter_screen_name, created_at FROM twitter_oauth_tokens WHERE project_id = ?')
			.bind(projectId)
			.first<{ id: number; twitter_username: string; twitter_screen_name: string; created_at: string }>();

		// アカウント統計を取得（OAuth連携済みの場合）
		const accountStats = oauthToken ? await db
			.prepare('SELECT * FROM twitter_account_stats WHERE project_id = ? ORDER BY recorded_date DESC LIMIT 7')
			.bind(projectId)
			.all() : { results: [] };

		return {
			project,
			account,
			latestStats,
			settings: settings ? {
				id: settings.id,
				api_key_last4: settings.api_key.slice(-4),
				api_secret_last4: settings.api_secret.slice(-4),
				access_token_last4: settings.access_token.slice(-4),
				access_token_secret_last4: settings.access_token_secret.slice(-4),
				hasCredentials: true
			} : null,
			oauthConnected: !!oauthToken,
			oauthInfo: oauthToken || null,
			accountStats: accountStats.results || []
		};
	} catch (err) {
		console.error('Twitter settings load error:', err);
		throw error(500, 'データの読み込みに失敗しました');
	}
};

export const actions: Actions = {
	saveAccount: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const username = data.get('username')?.toString();
		const name = data.get('name')?.toString() || null;
		const accountId = data.get('account_id')?.toString() || username;

		if (!username) {
			return fail(400, { error: 'ユーザー名を入力してください' });
		}

		try {
			// 既存のアカウントを確認
			const existing = await db
				.prepare('SELECT id FROM twitter_accounts WHERE project_id = ?')
				.bind(projectId)
				.first<{ id: number }>();

			if (existing) {
				// 更新
				await db
					.prepare(`
						UPDATE twitter_accounts
						SET username = ?, name = ?, account_id = ?, updated_at = CURRENT_TIMESTAMP
						WHERE id = ?
					`)
					.bind(username, name, accountId, existing.id)
					.run();
			} else {
				// 新規作成
				await db
					.prepare(`
						INSERT INTO twitter_accounts (project_id, account_id, username, name)
						VALUES (?, ?, ?, ?)
					`)
					.bind(projectId, accountId, username, name)
					.run();
			}

			return { success: true };
		} catch (err) {
			console.error('Save Twitter account error:', err);
			return fail(500, { error: 'アカウント情報の保存に失敗しました' });
		}
	},

	updateStats: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const followersCount = parseInt(data.get('followers_count')?.toString() || '0');
		const followingCount = parseInt(data.get('following_count')?.toString() || '0');
		const tweetCount = parseInt(data.get('tweet_count')?.toString() || '0');

		try {
			// アカウント取得
			const account = await db
				.prepare('SELECT id FROM twitter_accounts WHERE project_id = ?')
				.bind(projectId)
				.first<{ id: number }>();

			if (!account) {
				return fail(400, { error: 'アカウントを先に登録してください' });
			}

			// 今日の日付
			const today = new Date().toISOString().split('T')[0];

			// 統計を保存（同じ日付の場合は更新）
			await db
				.prepare(`
					INSERT INTO twitter_stats (account_id, followers_count, following_count, tweet_count, recorded_date)
					VALUES (?, ?, ?, ?, ?)
					ON CONFLICT(account_id, recorded_date) DO UPDATE SET
						followers_count = excluded.followers_count,
						following_count = excluded.following_count,
						tweet_count = excluded.tweet_count
				`)
				.bind(account.id, followersCount, followingCount, tweetCount, today)
				.run();

			return { success: true };
		} catch (err) {
			console.error('Update Twitter stats error:', err);
			return fail(500, { error: '統計の保存に失敗しました' });
		}
	},

	saveSettings: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const userId = locals.userId;
		const projectId = parseInt(params.projectId);
		const data = await request.formData();

		const apiKey = data.get('api_key')?.toString().trim();
		const apiSecret = data.get('api_secret')?.toString().trim();
		const accessToken = data.get('access_token')?.toString().trim();
		const accessTokenSecret = data.get('access_token_secret')?.toString().trim();

		if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
			return fail(400, { error: 'すべてのフィールドを入力してください' });
		}

		try {
			// 既存の設定を確認
			const existingSettings = await db
				.prepare('SELECT id FROM twitter_settings WHERE project_id = ?')
				.bind(projectId)
				.first<{ id: number }>();

			if (existingSettings) {
				// 更新
				await db.prepare(`
					UPDATE twitter_settings
					SET api_key = ?, api_secret = ?, access_token = ?, access_token_secret = ?, updated_at = CURRENT_TIMESTAMP
					WHERE project_id = ?
				`).bind(apiKey, apiSecret, accessToken, accessTokenSecret, projectId).run();
			} else {
				// 新規作成
				await db.prepare(`
					INSERT INTO twitter_settings (project_id, api_key, api_secret, access_token, access_token_secret)
					VALUES (?, ?, ?, ?, ?)
				`).bind(projectId, apiKey, apiSecret, accessToken, accessTokenSecret).run();
			}

			// Twitter APIからユーザー情報を取得
			const userInfo = await getUserInfo({
				api_key: apiKey,
				api_secret: apiSecret,
				access_token: accessToken,
				access_token_secret: accessTokenSecret
			});

			if (userInfo.error) {
				return fail(400, { error: `認証情報は保存されましたが、アカウント情報の取得に失敗しました: ${userInfo.error}` });
			}

			// アカウント情報を自動保存
			const existingAccount = await db
				.prepare('SELECT id FROM twitter_accounts WHERE project_id = ?')
				.bind(projectId)
				.first<{ id: number }>();

			if (existingAccount) {
				// 更新
				await db.prepare(`
					UPDATE twitter_accounts
					SET account_id = ?, username = ?, name = ?, updated_at = CURRENT_TIMESTAMP
					WHERE project_id = ?
				`).bind(userInfo.id, userInfo.username, userInfo.name, projectId).run();
			} else {
				// 新規作成
				await db.prepare(`
					INSERT INTO twitter_accounts (project_id, account_id, username, name)
					VALUES (?, ?, ?, ?)
				`).bind(projectId, userInfo.id, userInfo.username, userInfo.name).run();
			}

			return { success: true, message: `API認証設定を保存し、アカウント @${userInfo.username} を取得しました` };
		} catch (err) {
			console.error('Save Twitter settings error:', err);
			return fail(500, { error: '設定の保存に失敗しました' });
		}
	},

	testConnection: async ({ locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);

		try {
			const settings = await db
				.prepare('SELECT * FROM twitter_settings WHERE project_id = ?')
				.bind(projectId)
				.first<{ api_key: string; api_secret: string; access_token: string; access_token_secret: string }>();

			if (!settings) {
				return fail(400, { error: 'API設定を先に保存してください' });
			}

			// 実際にTwitter APIを呼び出してテスト
			const userInfo = await getUserInfo(settings);

			if (userInfo.error) {
				return fail(400, { error: `接続テスト失敗: ${userInfo.error}` });
			}

			return { success: true, message: `接続テストに成功しました！アカウント: @${userInfo.username}` };
		} catch (err) {
			console.error('Test connection error:', err);
			return fail(500, { error: '接続テストに失敗しました' });
		}
	},

	initiateOAuth: async ({ locals, platform, params, cookies, url }) => {
		console.log('=== INITIATE OAUTH CALLED ===');
		console.log('User ID:', locals.userId);
		console.log('Project ID:', params.projectId);

		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		console.log('Parsed project ID:', projectId);

		try {
			console.log('Querying twitter_settings for project_id:', projectId);
			// API設定を確認
			const settings = await db
				.prepare('SELECT api_key, api_secret FROM twitter_settings WHERE project_id = ?')
				.bind(projectId)
				.first<{ api_key: string; api_secret: string }>();

			console.log('Settings found:', !!settings);
			if (!settings) {
				console.log('No settings found - returning 400');
				return fail(400, { error: 'API設定を先に保存してください' });
			}

			// コールバックURL
			const protocol = url.protocol;
			const host = url.host;
			const callbackUrl = `${protocol}//${host}/auth/twitter/callback`;
			console.log('Callback URL:', callbackUrl);

			// Request Token取得
			console.log('Calling getRequestToken...');
			const result = await getRequestToken(settings.api_key, settings.api_secret, callbackUrl);
			console.log('getRequestToken result:', {
				hasToken: !!result.requestToken,
				hasSecret: !!result.requestTokenSecret,
				error: result.error
			});

			if (result.error || !result.requestToken) {
				console.error('Failed to get request token:', result.error);
				return fail(500, { error: `OAuth開始に失敗しました: ${result.error}` });
			}

			// Request Token SecretをCookieに保存（5分間有効）
			console.log('Setting cookies...');
			cookies.set('twitter_request_token_secret', result.requestTokenSecret, {
				path: '/',
				maxAge: 60 * 5,
				httpOnly: true,
				secure: protocol === 'https:',
				sameSite: 'lax'
			});

			// Project IDをCookieに保存
			cookies.set('twitter_oauth_project_id', projectId.toString(), {
				path: '/',
				maxAge: 60 * 5,
				httpOnly: true,
				secure: protocol === 'https:',
				sameSite: 'lax'
			});

			// Twitter認証ページへリダイレクト
			const redirectUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${result.requestToken}`;
			console.log('Redirecting to:', redirectUrl);
			throw redirect(302, redirectUrl);
		} catch (err) {
			if (err instanceof Response) {
				console.log('Caught redirect response - rethrowing');
				throw err; // リダイレクトの場合はそのままthrow
			}
			console.error('Initiate OAuth error:', err);
			return fail(500, { error: 'OAuth開始に失敗しました' });
		}
	},

	updateStats: async ({ locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);

		try {
			// OAuth Token取得
			const oauthToken = await db
				.prepare('SELECT access_token, access_token_secret FROM twitter_oauth_tokens WHERE project_id = ?')
				.bind(projectId)
				.first<{ access_token: string; access_token_secret: string }>();

			if (!oauthToken) {
				return fail(400, { error: 'Twitter連携を先に完了してください' });
			}

			// API Key/Secret取得
			const settings = await db
				.prepare('SELECT api_key, api_secret FROM twitter_settings WHERE project_id = ?')
				.bind(projectId)
				.first<{ api_key: string; api_secret: string }>();

			if (!settings) {
				return fail(400, { error: 'API設定が見つかりません' });
			}

			// 統計を取得
			const stats = await getUserStats({
				api_key: settings.api_key,
				api_secret: settings.api_secret,
				access_token: oauthToken.access_token,
				access_token_secret: oauthToken.access_token_secret
			});

			if (stats.error) {
				return fail(500, { error: `統計取得に失敗しました: ${stats.error}` });
			}

			// 前回の統計を取得
			const today = new Date().toISOString().split('T')[0];
			const prevStats = await db
				.prepare('SELECT * FROM twitter_account_stats WHERE project_id = ? ORDER BY recorded_date DESC LIMIT 1')
				.bind(projectId)
				.first<{
					followers_count: number;
					following_count: number;
					tweet_count: number;
				}>();

			// 変化を計算
			const followersChange = prevStats ? stats.followersCount - prevStats.followers_count : 0;
			const followingChange = prevStats ? stats.followingCount - prevStats.following_count : 0;
			const tweetChange = prevStats ? stats.tweetCount - prevStats.tweet_count : 0;

			// データベースに保存
			await db
				.prepare(
					`
					INSERT INTO twitter_account_stats (project_id, followers_count, following_count, tweet_count, listed_count, followers_change, following_change, tweet_change, recorded_date)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
					ON CONFLICT(project_id, recorded_date) DO UPDATE SET
						followers_count = excluded.followers_count,
						following_count = excluded.following_count,
						tweet_count = excluded.tweet_count,
						listed_count = excluded.listed_count,
						followers_change = excluded.followers_change,
						following_change = excluded.following_change,
						tweet_change = excluded.tweet_change
				`
				)
				.bind(
					projectId,
					stats.followersCount,
					stats.followingCount,
					stats.tweetCount,
					stats.listedCount,
					followersChange,
					followingChange,
					tweetChange,
					today
				)
				.run();

			return {
				success: true,
				message: '統計を更新しました',
				stats: {
					followers: stats.followersCount,
					following: stats.followingCount,
					tweets: stats.tweetCount
				}
			};
		} catch (err) {
			console.error('Update stats error:', err);
			return fail(500, { error: '統計の更新に失敗しました' });
		}
	},

	fetchStats: async ({ locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);

		try {
			// API設定を取得
			const settings = await db
				.prepare('SELECT api_key, api_secret, access_token, access_token_secret FROM twitter_settings WHERE project_id = ?')
				.bind(projectId)
				.first<{ api_key: string; api_secret: string; access_token: string; access_token_secret: string }>();

			if (!settings) {
				return fail(400, { error: 'API設定を先に保存してください' });
			}

			// Twitter APIから統計を取得
			const stats = await getUserStats({
				api_key: settings.api_key,
				api_secret: settings.api_secret,
				access_token: settings.access_token,
				access_token_secret: settings.access_token_secret
			});

			if (stats.error) {
				return fail(500, { error: `統計取得に失敗しました: ${stats.error}` });
			}

			// アカウント取得
			const account = await db
				.prepare('SELECT id FROM twitter_accounts WHERE project_id = ?')
				.bind(projectId)
				.first<{ id: number }>();

			if (!account) {
				return fail(400, { error: 'アカウントを先に登録してください' });
			}

			// 今日の日付
			const today = new Date().toISOString().split('T')[0];

			// 統計を保存（同じ日付の場合は更新）
			await db
				.prepare(`
					INSERT INTO twitter_stats (account_id, followers_count, following_count, tweet_count, recorded_date)
					VALUES (?, ?, ?, ?, ?)
					ON CONFLICT(account_id, recorded_date) DO UPDATE SET
						followers_count = excluded.followers_count,
						following_count = excluded.following_count,
						tweet_count = excluded.tweet_count
				`)
				.bind(account.id, stats.followersCount, stats.followingCount, stats.tweetCount, today)
				.run();

			return {
				success: true,
				message: `統計を自動取得しました！ フォロワー: ${stats.followersCount}, ツイート: ${stats.tweetCount}`,
				stats: {
					followers: stats.followersCount,
					following: stats.followingCount,
					tweets: stats.tweetCount,
					listed: stats.listedCount
				}
			};
		} catch (err) {
			console.error('Fetch stats error:', err);
			return fail(500, { error: '統計の自動取得に失敗しました' });
		}
	},

	disconnectOAuth: async ({ locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);

		try {
			await db
				.prepare('DELETE FROM twitter_oauth_tokens WHERE project_id = ? AND user_id = ?')
				.bind(projectId, locals.userId)
				.run();

			return { success: true, message: 'Twitter連携を解除しました' };
		} catch (err) {
			console.error('Disconnect OAuth error:', err);
			return fail(500, { error: '連携解除に失敗しました' });
		}
	}
};
