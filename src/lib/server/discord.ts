import type { D1Database } from '@cloudflare/workers-types';

interface UpcomingTask {
	id: number;
	title: string;
	description: string | null;
	due_date: string;
	list_title: string;
	days_until_due: number;
}

/**
 * 期限が近いタスクを取得
 */
export async function getUpcomingTasks(
	db: D1Database,
	boardId: number,
	daysAhead: number
): Promise<UpcomingTask[]> {
	const query = `
		SELECT
			c.id,
			c.title,
			c.description,
			c.due_date,
			l.title as list_title,
			CAST((julianday(c.due_date) - julianday('now')) AS INTEGER) as days_until_due
		FROM cards c
		INNER JOIN lists l ON c.list_id = l.id
		WHERE l.board_id = ?
			AND c.due_date IS NOT NULL
			AND julianday(c.due_date) >= julianday('now')
			AND julianday(c.due_date) <= julianday('now', '+${daysAhead} days')
		ORDER BY c.due_date ASC
	`;

	const result = await db.prepare(query).bind(boardId).all<UpcomingTask>();
	return result.results || [];
}

/**
 * Discord通知メッセージを生成
 */
export function formatDiscordMessage(
	boardTitle: string,
	tasks: UpcomingTask[],
	daysAhead: number
): string {
	if (tasks.length === 0) {
		return '';
	}

	let message = `【タスク管理】期限が近いタスク通知\n\n`;
	message += `ボード: ${boardTitle}\n\n`;
	message += `期限が近いタスク (${daysAhead}日以内):\n\n`;

	tasks.forEach((task, index) => {
		message += `${index + 1}. タスク名: ${task.title}\n`;
		message += `   期限: ${task.due_date}\n`;
		message += `   リスト: ${task.list_title}\n`;
		message += `   残り: ${task.days_until_due}日\n\n`;
	});

	return message;
}

/**
 * Discordにメッセージを送信
 */
export async function sendDiscordNotification(
	webhookUrl: string,
	message: string
): Promise<{ success: boolean; error?: string }> {
	try {
		const response = await fetch(webhookUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				content: message
			})
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error('Discord webhook error:', response.status, errorText);
			return {
				success: false,
				error: `Webhook送信失敗: ${response.status} ${response.statusText}`
			};
		}

		return { success: true };
	} catch (error) {
		console.error('Discord send error:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * ボードの期限が近いタスクを通知
 */
export async function notifyUpcomingTasks(
	db: D1Database,
	boardId: number,
	boardTitle: string,
	webhookUrl: string,
	daysAhead: number
): Promise<{ success: boolean; error?: string; taskCount?: number }> {
	try {
		// 期限が近いタスクを取得
		const tasks = await getUpcomingTasks(db, boardId, daysAhead);

		// タスクがない場合は通知しない
		if (tasks.length === 0) {
			return { success: true, taskCount: 0 };
		}

		// メッセージを生成
		const message = formatDiscordMessage(boardTitle, tasks, daysAhead);

		// Discordに送信
		const result = await sendDiscordNotification(webhookUrl, message);

		return {
			...result,
			taskCount: tasks.length
		};
	} catch (error) {
		console.error('Notify upcoming tasks error:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}
