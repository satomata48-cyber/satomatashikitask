import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get('session');

	if (sessionId) {
		// セッションIDからユーザーIDを取得（簡易実装: sessionId = userId）
		const userId = parseInt(sessionId);
		if (!isNaN(userId)) {
			event.locals.userId = userId;
		}
	}

	return resolve(event);
};
