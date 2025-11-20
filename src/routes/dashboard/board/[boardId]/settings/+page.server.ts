import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/server/db';

interface DiscordSettings {
	id: number;
	board_id: number;
	webhook_url: string;
	enabled: number;
	days_ahead: number;
	cron_schedule: string;
	timezone: string;
	created_at: string;
	updated_at: string;
}

export const load: PageServerLoad = async ({ locals, platform, params }) => {
	// 未ログインならログインページへリダイレクト
	if (!locals.userId) {
		throw redirect(303, '/login');
	}

	const db = getDB(platform);
	const boardId = parseInt(params.boardId);

	try {
		// ボードの所有権を確認
		const boardResult = await db.prepare(`
			SELECT id, title
			FROM boards
			WHERE id = ? AND user_id = ?
		`)
			.bind(boardId, locals.userId)
			.first<{ id: number; title: string }>();

		if (!boardResult) {
			throw error(403, 'このボードへのアクセス権限がありません');
		}

		// Discord設定を取得
		const discordSettings = await db.prepare(
			'SELECT * FROM board_discord_settings WHERE board_id = ?'
		)
			.bind(boardId)
			.first<DiscordSettings>();

		return {
			board: {
				id: boardResult.id,
				title: boardResult.title
			},
			discordSettings: discordSettings || null
		};
	} catch (err) {
		console.error('Board settings load error:', err);
		throw error(500, '設定の読み込みに失敗しました');
	}
};

export const actions = {
	save: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			throw redirect(303, '/login');
		}

		const db = getDB(platform);
		const boardId = parseInt(params.boardId);
		const formData = await request.formData();

		const webhookUrl = formData.get('webhook_url')?.toString() || '';
		const enabled = formData.get('enabled') === 'true' ? 1 : 0;
		const daysAhead = parseInt(formData.get('days_ahead')?.toString() || '3');
		const cronSchedule = formData.get('cron_schedule')?.toString() || '0 9 * * *';
		const timezone = formData.get('timezone')?.toString() || 'Asia/Tokyo';

		// バリデーション
		if (enabled && !webhookUrl) {
			return fail(400, { error: 'Discord Webhook URLを入力してください' });
		}

		if (enabled && !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
			return fail(400, { error: '有効なDiscord Webhook URLを入力してください' });
		}

		if (daysAhead < 1 || daysAhead > 30) {
			return fail(400, { error: '通知日数は1〜30日の範囲で指定してください' });
		}

		try {
			// ボードの所有権を確認
			const boardResult = await db.prepare(`
				SELECT id
				FROM boards
				WHERE id = ? AND user_id = ?
			`)
				.bind(boardId, locals.userId)
				.first<{ id: number }>();

			if (!boardResult) {
				throw error(403, 'このボードへのアクセス権限がありません');
			}

			// 既存の設定を確認
			const existing = await db.prepare(
				'SELECT id FROM board_discord_settings WHERE board_id = ?'
			)
				.bind(boardId)
				.first<{ id: number }>();

			if (existing) {
				// 更新
				await db.prepare(
					`UPDATE board_discord_settings
					SET webhook_url = ?, enabled = ?, days_ahead = ?, cron_schedule = ?, timezone = ?, updated_at = CURRENT_TIMESTAMP
					WHERE board_id = ?`
				)
					.bind(webhookUrl, enabled, daysAhead, cronSchedule, timezone, boardId)
					.run();
			} else {
				// 新規作成
				await db.prepare(
					`INSERT INTO board_discord_settings (board_id, webhook_url, enabled, days_ahead, cron_schedule, timezone)
					VALUES (?, ?, ?, ?, ?, ?)`
				)
					.bind(boardId, webhookUrl, enabled, daysAhead, cronSchedule, timezone)
					.run();
			}

			return { success: true, message: '設定を保存しました' };
		} catch (err) {
			console.error('Discord settings save error:', err);
			return fail(500, { error: '設定の保存に失敗しました' });
		}
	},

	test: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			throw redirect(303, '/login');
		}

		const db = getDB(platform);
		const boardId = parseInt(params.boardId);
		const formData = await request.formData();

		const webhookUrl = formData.get('webhook_url')?.toString() || '';

		if (!webhookUrl) {
			return fail(400, { error: 'Webhook URLを入力してください' });
		}

		try {
			// ボードの所有権を確認
			const boardResult = await db.prepare(`
				SELECT id, title
				FROM boards
				WHERE id = ? AND user_id = ?
			`)
				.bind(boardId, locals.userId)
				.first<{ id: number; title: string }>();

			if (!boardResult) {
				throw error(403, 'このボードへのアクセス権限がありません');
			}

			// テストメッセージを送信
			const testMessage = `【タスク管理】テスト通知\n\nボード: ${boardResult.title}\n\nDiscord連携のテスト通知です。設定が正常に動作しています。`;

			const response = await fetch(webhookUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					content: testMessage
				})
			});

			if (!response.ok) {
				return fail(400, { error: 'Webhook送信に失敗しました。URLを確認してください。' });
			}

			return { success: true, message: 'テスト通知を送信しました' };
		} catch (err) {
			console.error('Discord test error:', err);
			return fail(500, { error: 'テスト送信に失敗しました' });
		}
	}
} satisfies Actions;
