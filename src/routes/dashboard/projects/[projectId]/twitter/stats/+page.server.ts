import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
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

		// Twitterアカウント取得
		const account = await db
			.prepare('SELECT * FROM twitter_accounts WHERE project_id = ?')
			.bind(projectId)
			.first<{ id: number; username: string; name: string; created_at: string }>();

		if (!account) {
			return {
				project,
				account: null,
				stats: [],
				accountAgeDays: 0,
				recordDays: 0,
				tweetedDays: 0,
				maxDailyTweets: 0,
				maxDailyTweetsDate: '',
				latestStat: null,
				oldestStat: null
			};
		}

		// 全統計データを取得
		const statsResult = await db
			.prepare(`
				SELECT * FROM twitter_stats
				WHERE account_id = ?
				ORDER BY recorded_date DESC
			`)
			.bind(account.id)
			.all();

		const stats = statsResult.results || [];

		if (stats.length === 0) {
			return {
				project,
				account,
				stats: [],
				accountAgeDays: 0,
				recordDays: 0,
				tweetedDays: 0,
				maxDailyTweets: 0,
				maxDailyTweetsDate: '',
				latestStat: null,
				oldestStat: null
			};
		}

		// アカウント作成日からの日数を計算
		const accountCreated = new Date(account.created_at);
		const now = new Date();
		const accountAgeDays = Math.floor((now.getTime() - accountCreated.getTime()) / (1000 * 60 * 60 * 24));

		// 最新と最古の統計
		const latestStat = stats[0] as any;
		const oldestStat = stats[stats.length - 1] as any;

		// 記録期間の日数
		const recordStart = new Date(oldestStat.recorded_date);
		const recordEnd = new Date(latestStat.recorded_date);
		const recordDays = Math.max(1, Math.floor((recordEnd.getTime() - recordStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

		// つぶやいた日数を計算（前日からツイート数が増えている日）
		let tweetedDays = 0;
		let maxDailyTweets = 0;
		let maxDailyTweetsDate = '';

		for (let i = 0; i < stats.length; i++) {
			const current = stats[i] as any;

			if (i < stats.length - 1) {
				const next = stats[i + 1] as any;
				const dailyTweets = current.tweet_count - next.tweet_count;

				if (dailyTweets > 0) {
					tweetedDays++;

					if (dailyTweets > maxDailyTweets) {
						maxDailyTweets = dailyTweets;
						maxDailyTweetsDate = current.recorded_date;
					}
				}
			}
		}

		return {
			project,
			account,
			stats,
			accountAgeDays,
			recordDays,
			tweetedDays,
			maxDailyTweets,
			maxDailyTweetsDate,
			latestStat,
			oldestStat
		};
	} catch (err) {
		console.error('Stats load error:', err);
		throw error(500, 'データの読み込みに失敗しました');
	}
};
