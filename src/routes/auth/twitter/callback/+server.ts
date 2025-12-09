import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB } from '$lib/server/db';
import { getAccessToken } from '$lib/server/twitter';

export const GET: RequestHandler = async ({ url, locals, platform, cookies }) => {
	if (!locals.userId) {
		throw redirect(302, '/login');
	}

	const oauthToken = url.searchParams.get('oauth_token');
	const oauthVerifier = url.searchParams.get('oauth_verifier');
	const denied = url.searchParams.get('denied');

	// ユーザーが拒否した場合
	if (denied) {
		throw redirect(302, '/dashboard/projects?error=twitter_auth_denied');
	}

	if (!oauthToken || !oauthVerifier) {
		throw redirect(302, '/dashboard/projects?error=invalid_oauth_params');
	}

	const db = getDB(platform);

	try {
		// Cookieから保存されたrequest tokenとproject IDを取得
		const requestTokenSecret = cookies.get('twitter_request_token_secret');
		const projectId = cookies.get('twitter_oauth_project_id');

		if (!requestTokenSecret || !projectId) {
			throw redirect(302, '/dashboard/projects?error=missing_oauth_state');
		}

		// twitter_settingsからAPI KeyとAPI Secretを取得
		const settings = await db
			.prepare('SELECT api_key, api_secret FROM twitter_settings WHERE project_id = ?')
			.bind(parseInt(projectId))
			.first<{ api_key: string; api_secret: string }>();

		if (!settings) {
			throw redirect(302, `/dashboard/projects/${projectId}/twitter?error=settings_not_found`);
		}

		// Access Tokenを取得
		const result = await getAccessToken(
			settings.api_key,
			settings.api_secret,
			oauthToken,
			requestTokenSecret,
			oauthVerifier
		);

		if (result.error || !result.accessToken) {
			console.error('Failed to get access token:', result.error);
			throw redirect(
				302,
				`/dashboard/projects/${projectId}/twitter?error=access_token_failed`
			);
		}

		// OAuth tokensをデータベースに保存
		await db
			.prepare(
				`
				INSERT INTO twitter_oauth_tokens (user_id, project_id, access_token, access_token_secret, twitter_user_id, twitter_username, twitter_screen_name, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
				ON CONFLICT(project_id) DO UPDATE SET
					access_token = excluded.access_token,
					access_token_secret = excluded.access_token_secret,
					twitter_user_id = excluded.twitter_user_id,
					twitter_username = excluded.twitter_username,
					twitter_screen_name = excluded.twitter_screen_name,
					updated_at = CURRENT_TIMESTAMP
			`
			)
			.bind(
				locals.userId,
				parseInt(projectId),
				result.accessToken,
				result.accessTokenSecret,
				result.userId,
				result.screenName,
				result.screenName
			)
			.run();

		// Cookieをクリア
		cookies.delete('twitter_request_token_secret', { path: '/' });
		cookies.delete('twitter_oauth_project_id', { path: '/' });

		// 成功メッセージと共にリダイレクト
		throw redirect(302, `/dashboard/projects/${projectId}/twitter?success=oauth_connected`);
	} catch (error) {
		console.error('OAuth callback error:', error);
		throw redirect(302, '/dashboard/projects?error=oauth_callback_failed');
	}
};
