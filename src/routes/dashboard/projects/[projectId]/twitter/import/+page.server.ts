import { error, fail, redirect } from '@sveltejs/kit';
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

		return {
			project
		};
	} catch (err) {
		console.error('Load error:', err);
		throw error(500, 'データの読み込みに失敗しました');
	}
};

function parseCSVLine(line: string): string[] {
	const result: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];

		if (char === '"') {
			inQuotes = !inQuotes;
		} else if (char === ',' && !inQuotes) {
			result.push(current.trim());
			current = '';
		} else {
			current += char;
		}
	}

	result.push(current.trim());
	return result;
}

export const actions: Actions = {
	default: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);

		try {
			const formData = await request.formData();
			const file = formData.get('csvfile') as File;

			if (!file || file.size === 0) {
				return fail(400, { error: 'CSVファイルを選択してください' });
			}

			// ファイル内容を読み込み
			const text = await file.text();
			const lines = text.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);

			if (lines.length < 2) {
				return fail(400, { error: 'CSVファイルが空か、ヘッダー行のみです' });
			}

			// ヘッダー行を確認
			const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase());
			const dateIndex = headers.indexOf('date');
			const followersIndex = headers.indexOf('followers_count');
			const followingIndex = headers.indexOf('following_count');
			const tweetIndex = headers.indexOf('tweet_count');

			if (dateIndex === -1 || followersIndex === -1 || followingIndex === -1 || tweetIndex === -1) {
				return fail(400, {
					error: 'CSVのヘッダーが不正です。必須列: date, followers_count, following_count, tweet_count'
				});
			}

			// Twitterアカウントを取得
			const account = await db
				.prepare('SELECT id FROM twitter_accounts WHERE project_id = ?')
				.bind(projectId)
				.first<{ id: number }>();

			if (!account) {
				return fail(400, { error: 'Twitterアカウントが見つかりません。先にアカウントを登録してください。' });
			}

			let imported = 0;
			let skipped = 0;
			const dataRows = lines.slice(1); // ヘッダー行をスキップ

			for (const line of dataRows) {
				const values = parseCSVLine(line);

				if (values.length <= Math.max(dateIndex, followersIndex, followingIndex, tweetIndex)) {
					skipped++;
					continue;
				}

				const date = values[dateIndex];
				const followersCount = parseInt(values[followersIndex]);
				const followingCount = parseInt(values[followingIndex]);
				const tweetCount = parseInt(values[tweetIndex]);

				// データ検証
				if (!date || isNaN(followersCount) || isNaN(followingCount) || isNaN(tweetCount)) {
					skipped++;
					continue;
				}

				// 日付フォーマット検証（YYYY-MM-DD）
				const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
				if (!dateRegex.test(date)) {
					skipped++;
					continue;
				}

				try {
					// 前日のデータを取得して増減を計算
					const previousDay = await db
						.prepare(`
							SELECT followers_count, following_count, tweet_count
							FROM twitter_stats
							WHERE account_id = ? AND recorded_date < ?
							ORDER BY recorded_date DESC
							LIMIT 1
						`)
						.bind(account.id, date)
						.first<{ followers_count: number; following_count: number; tweet_count: number }>();

					const followerChange = previousDay ? followersCount - previousDay.followers_count : 0;
					const followingChange = previousDay ? followingCount - previousDay.following_count : 0;
					const tweetChange = previousDay ? tweetCount - previousDay.tweet_count : 0;

					// データをインサート（重複はスキップ）
					await db
						.prepare(`
							INSERT INTO twitter_stats
							(account_id, followers_count, following_count, tweet_count, follower_change, following_change, tweet_change, recorded_date, created_at)
							VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
							ON CONFLICT(account_id, recorded_date) DO NOTHING
						`)
						.bind(
							account.id,
							followersCount,
							followingCount,
							tweetCount,
							followerChange,
							followingChange,
							tweetChange,
							date
						)
						.run();

					imported++;
				} catch (err) {
					console.error(`Failed to insert data for ${date}:`, err);
					skipped++;
				}
			}

			// 全データをインポート後、増減値を再計算
			const allStats = await db
				.prepare(`
					SELECT id, followers_count, following_count, tweet_count, recorded_date
					FROM twitter_stats
					WHERE account_id = ?
					ORDER BY recorded_date ASC
				`)
				.bind(account.id)
				.all();

			if (allStats.results && allStats.results.length > 1) {
				for (let i = 1; i < allStats.results.length; i++) {
					const current = allStats.results[i] as any;
					const previous = allStats.results[i - 1] as any;

					await db
						.prepare(`
							UPDATE twitter_stats
							SET follower_change = ?,
							    following_change = ?,
							    tweet_change = ?
							WHERE id = ?
						`)
						.bind(
							current.followers_count - previous.followers_count,
							current.following_count - previous.following_count,
							current.tweet_count - previous.tweet_count,
							current.id
						)
						.run();
				}
			}

			return {
				success: true,
				message: 'CSVデータのインポートが完了しました',
				stats: { imported, skipped }
			};
		} catch (err) {
			console.error('CSV import error:', err);
			return fail(500, { error: 'CSVのインポート中にエラーが発生しました' });
		}
	}
};
