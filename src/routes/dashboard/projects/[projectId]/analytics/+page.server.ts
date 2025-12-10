import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/server/db';
import { getUserStats, getUserInfo, getUserTweets } from '$lib/server/twitter';
import { getFacebookPages, getInstagramAccounts, getInstagramMedia, getThreadsPosts } from '$lib/server/meta';

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

		// Twitter統計を取得（直近90日分）
		let twitterStats = { results: [] };
		try {
			twitterStats = await db
				.prepare(`
					SELECT ts.*, ta.username, ta.display_name
					FROM twitter_stats ts
					INNER JOIN twitter_accounts ta ON ts.account_id = ta.id
					WHERE ta.project_id = ?
					ORDER BY ts.recorded_date DESC
					LIMIT 90
				`)
				.bind(projectId)
				.all();
		} catch {
			// Table may not exist
		}

		// Instagram統計を取得（直近90日分）
		let instagramStats = { results: [] };
		try {
			instagramStats = await db
				.prepare(`
					SELECT ist.*, ia.username, ia.display_name
					FROM instagram_stats ist
					INNER JOIN instagram_accounts ia ON ist.account_id = ia.id
					WHERE ia.project_id = ?
					ORDER BY ist.recorded_date DESC
					LIMIT 90
				`)
				.bind(projectId)
				.all();
		} catch {
			// Table may not exist
		}

		// TikTok統計を取得（直近90日分）
		let tiktokStats = { results: [] };
		try {
			tiktokStats = await db
				.prepare(`
					SELECT ts.*, ta.username, ta.display_name
					FROM tiktok_stats ts
					INNER JOIN tiktok_accounts ta ON ts.account_id = ta.id
					WHERE ta.project_id = ?
					ORDER BY ts.recorded_date DESC
					LIMIT 90
				`)
				.bind(projectId)
				.all();
		} catch {
			// Table may not exist
		}

		// YouTube統計を取得（直近90日分）
		let youtubeStats = { results: [] };
		try {
			youtubeStats = await db
				.prepare(`
					SELECT ys.*, yc.channel_title, yc.channel_id
					FROM youtube_stats ys
					INNER JOIN youtube_channels yc ON ys.channel_id = yc.id
					WHERE yc.project_id = ?
					ORDER BY ys.recorded_date DESC
					LIMIT 90
				`)
				.bind(projectId)
				.all();
		} catch {
			// Table may not exist
		}

		// YouTube API設定を取得
		let youtubeSettings: any = null;
		try {
			youtubeSettings = await db
				.prepare('SELECT id, api_key FROM youtube_settings WHERE project_id = ?')
				.bind(projectId)
				.first();
		} catch {
			// Table may not exist
		}

		// YouTubeチャンネル詳細情報を取得
		let youtubeChannels: Array<any> = [];
		try {
			const channelsResult = await db
				.prepare('SELECT id, channel_id, channel_name, channel_handle, thumbnail_url FROM youtube_channels WHERE project_id = ?')
				.bind(projectId)
				.all();

			for (const channel of channelsResult.results) {
				// 最新の統計を取得
				const latestStats = await db
					.prepare('SELECT id, subscriber_count, view_count, video_count, subscriber_change, view_change, recorded_date FROM youtube_stats WHERE channel_id = ? ORDER BY recorded_date DESC LIMIT 1')
					.bind(channel.id)
					.first();

				// 統計履歴（最大90日分）
				const statsHistoryResult = await db
					.prepare('SELECT id, subscriber_count, view_count, video_count, subscriber_change, view_change, recorded_date FROM youtube_stats WHERE channel_id = ? ORDER BY recorded_date DESC LIMIT 90')
					.bind(channel.id)
					.all();
				const statsHistory = statsHistoryResult.results.reverse();

				// 変化を計算
				let subscriberChange = 0;
				let viewChange = 0;
				if (statsHistory.length >= 2) {
					const today = statsHistory[statsHistory.length - 1];
					const yesterday = statsHistory[statsHistory.length - 2];
					subscriberChange = (today as any).subscriber_count - (yesterday as any).subscriber_count;
					viewChange = (today as any).view_count - (yesterday as any).view_count;
				}

				// 動画一覧（再生回数順）
				const videosResult = await db
					.prepare(`
						SELECT v.*, vs.view_count, vs.like_count, vs.comment_count
						FROM youtube_videos v
						LEFT JOIN youtube_video_stats vs ON v.id = vs.video_id
							AND vs.recorded_date = (SELECT MAX(recorded_date) FROM youtube_video_stats WHERE video_id = v.id)
						WHERE v.channel_id = ?
						ORDER BY vs.view_count DESC NULLS LAST
						LIMIT 50
					`)
					.bind(channel.id)
					.all();

				youtubeChannels.push({
					...channel,
					stats: latestStats || null,
					statsHistory,
					videos: videosResult.results,
					subscriberChange,
					viewChange
				});
			}
		} catch {
			// Table may not exist
		}

		// 各SNSの最新統計を取得
		let twitterLatest = null;
		let instagramLatest = null;
		let tiktokLatest = null;
		let youtubeLatest = null;

		try {
			twitterLatest = await db
				.prepare(`
					SELECT ts.*, ta.username, ta.display_name
					FROM twitter_stats ts
					INNER JOIN twitter_accounts ta ON ts.account_id = ta.id
					WHERE ta.project_id = ?
					ORDER BY ts.recorded_date DESC
					LIMIT 1
				`)
				.bind(projectId)
				.first();
		} catch {
			// Table may not exist
		}

		try {
			instagramLatest = await db
				.prepare(`
					SELECT ist.*, ia.username, ia.display_name
					FROM instagram_stats ist
					INNER JOIN instagram_accounts ia ON ist.account_id = ia.id
					WHERE ia.project_id = ?
					ORDER BY ist.recorded_date DESC
					LIMIT 1
				`)
				.bind(projectId)
				.first();
		} catch {
			// Table may not exist
		}

		try {
			tiktokLatest = await db
				.prepare(`
					SELECT ts.*, ta.username, ta.display_name
					FROM tiktok_stats ts
					INNER JOIN tiktok_accounts ta ON ts.account_id = ta.id
					WHERE ta.project_id = ?
					ORDER BY ts.recorded_date DESC
					LIMIT 1
				`)
				.bind(projectId)
				.first();
		} catch {
			// Table may not exist
		}

		try {
			youtubeLatest = await db
				.prepare(`
					SELECT ys.*, yc.channel_title, yc.channel_id
					FROM youtube_stats ys
					INNER JOIN youtube_channels yc ON ys.channel_id = yc.id
					WHERE yc.project_id = ?
					ORDER BY ys.recorded_date DESC
					LIMIT 1
				`)
				.bind(projectId)
				.first();
		} catch {
			// Table may not exist
		}

		// Twitter投稿頻度分析
		let twitterPostFrequency = null;
		let twitterPosts: Array<any> = [];
		try {
			const twitterAccount = await db
				.prepare('SELECT id, username FROM twitter_accounts WHERE project_id = ?')
				.bind(projectId)
				.first<{ id: number; username: string }>();

			if (twitterAccount) {
				// 投稿履歴を取得（最新50件）
				const recentPostsResult = await db
					.prepare(`
						SELECT
							tweet_id, content, posted_at,
							like_count, retweet_count, reply_count, quote_count, impression_count
						FROM twitter_posts
						WHERE account_id = ?
						ORDER BY posted_at DESC
						LIMIT 50
					`)
					.bind(twitterAccount.id)
					.all();

				twitterPosts = (recentPostsResult.results || []).map((post: any) => ({
					...post,
					username: twitterAccount.username
				}));

				// 投稿頻度分析用に全投稿の日付を取得
				const allPostsResult = await db
					.prepare('SELECT posted_at FROM twitter_posts WHERE account_id = ? ORDER BY posted_at DESC')
					.bind(twitterAccount.id)
					.all();

				const posts = allPostsResult.results as Array<{ posted_at: string }>;

				if (posts.length > 0) {
					const now = new Date();
					const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
					const weekStart = new Date(today);
					weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // 日曜日
					const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

					// 今日・今週・今月の投稿数
					const todayPosts = posts.filter((p) => new Date(p.posted_at) >= today).length;
					const weekPosts = posts.filter((p) => new Date(p.posted_at) >= weekStart).length;
					const monthPosts = posts.filter((p) => new Date(p.posted_at) >= monthStart).length;

					// 全期間の平均計算
					const oldestPost = new Date(posts[posts.length - 1].posted_at);
					const totalDays = Math.max(
						1,
						Math.floor((now.getTime() - oldestPost.getTime()) / (1000 * 60 * 60 * 24))
					);
					const totalWeeks = Math.max(1, totalDays / 7);
					const totalMonths = Math.max(
						1,
						(now.getFullYear() - oldestPost.getFullYear()) * 12 +
							(now.getMonth() - oldestPost.getMonth()) +
							1
					);

					const avgPerDay = posts.length / totalDays;
					const avgPerWeek = posts.length / totalWeeks;
					const avgPerMonth = posts.length / totalMonths;

					twitterPostFrequency = {
						todayPosts,
						weekPosts,
						monthPosts,
						avgPerDay,
						avgPerWeek,
						avgPerMonth,
						totalPosts: posts.length,
						totalDays
					};
				}
			}
		} catch {
			// Table may not exist
		}

		// YouTube動画投稿頻度分析
		let youtubePostFrequency = null;
		try {
			if (youtubeChannels.length > 0) {
				const channelId = youtubeChannels[0].id;

				const allVideosResult = await db
					.prepare('SELECT published_at FROM youtube_videos WHERE channel_id = ? ORDER BY published_at DESC')
					.bind(channelId)
					.all();

				const videos = allVideosResult.results as Array<{ published_at: string }>;

				if (videos.length > 0) {
					const now = new Date();
					const weekStart = new Date(now);
					weekStart.setDate(weekStart.getDate() - 7);
					const monthStart = new Date(now);
					monthStart.setDate(monthStart.getDate() - 30);

					const weekVideos = videos.filter((v) => new Date(v.published_at) >= weekStart).length;
					const monthVideos = videos.filter((v) => new Date(v.published_at) >= monthStart).length;

					const oldestVideo = new Date(videos[videos.length - 1].published_at);
					const totalDays = Math.max(
						1,
						Math.floor((now.getTime() - oldestVideo.getTime()) / (1000 * 60 * 60 * 24))
					);
					const totalWeeks = Math.max(1, totalDays / 7);
					const totalMonths = Math.max(1, totalDays / 30);

					const avgPerWeek = videos.length / totalWeeks;
					const avgPerMonth = videos.length / totalMonths;

					youtubePostFrequency = {
						weekVideos,
						monthVideos,
						avgPerWeek,
						avgPerMonth,
						totalVideos: videos.length,
						totalDays
					};
				}
			}
		} catch {
			// Table may not exist
		}

		// ===== Meta API (Instagram/Threads/Facebook) データ取得 =====
		let metaSettings: any = null;
		let instagramAccount: any = null;
		let instagramMedia: any[] = [];
		let threadsPosts: any[] = [];
		let facebookPage: any = null;
		let metaStats = {
			instagram: { totalLikes: 0, totalComments: 0, avgLikes: 0, avgComments: 0, engagementRate: 0 },
			threads: { totalPosts: 0, totalLikes: 0, totalReplies: 0, totalViews: 0, avgLikes: 0, avgReplies: 0 }
		};

		try {
			// Meta API設定を取得
			metaSettings = await db
				.prepare('SELECT * FROM meta_api_settings WHERE project_id = ? AND enabled = 1')
				.bind(projectId)
				.first();
		} catch {
			// Table may not exist
		}

		if (metaSettings) {
			// Instagram Business Account情報を取得
			try {
				instagramAccount = await db
					.prepare('SELECT * FROM instagram_business_accounts WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1')
					.bind(projectId)
					.first();
			} catch {
				// Table may not exist
			}

			// Instagramメディアを取得
			try {
				const mediaResult = await db
					.prepare(`
						SELECT * FROM instagram_media
						WHERE project_id = ?
						ORDER BY timestamp DESC
						LIMIT 24
					`)
					.bind(projectId)
					.all();
				instagramMedia = mediaResult.results || [];

				// Instagram統計を計算
				if (instagramMedia.length > 0) {
					metaStats.instagram.totalLikes = instagramMedia.reduce((sum: number, m: any) => sum + (m.like_count || 0), 0);
					metaStats.instagram.totalComments = instagramMedia.reduce((sum: number, m: any) => sum + (m.comments_count || 0), 0);
					metaStats.instagram.avgLikes = Math.round(metaStats.instagram.totalLikes / instagramMedia.length);
					metaStats.instagram.avgComments = Math.round(metaStats.instagram.totalComments / instagramMedia.length);
					if (instagramAccount?.followers_count > 0) {
						metaStats.instagram.engagementRate = ((metaStats.instagram.totalLikes + metaStats.instagram.totalComments) / instagramMedia.length / instagramAccount.followers_count) * 100;
					}
				}
			} catch {
				// Table may not exist
			}

			// Threads投稿を取得
			try {
				const threadsResult = await db
					.prepare(`
						SELECT * FROM threads_posts
						WHERE project_id = ?
						ORDER BY timestamp DESC
						LIMIT 50
					`)
					.bind(projectId)
					.all();
				threadsPosts = threadsResult.results || [];

				// Threads統計を計算
				if (threadsPosts.length > 0) {
					metaStats.threads.totalPosts = threadsPosts.length;
					metaStats.threads.totalLikes = threadsPosts.reduce((sum: number, p: any) => sum + (p.like_count || 0), 0);
					metaStats.threads.totalReplies = threadsPosts.reduce((sum: number, p: any) => sum + (p.reply_count || 0), 0);
					metaStats.threads.totalViews = threadsPosts.reduce((sum: number, p: any) => sum + (p.views || 0), 0);
					metaStats.threads.avgLikes = Math.round(metaStats.threads.totalLikes / threadsPosts.length);
					metaStats.threads.avgReplies = Math.round(metaStats.threads.totalReplies / threadsPosts.length);
				}
			} catch {
				// Table may not exist
			}

			// Facebookページを取得
			try {
				facebookPage = await db
					.prepare('SELECT * FROM facebook_pages WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1')
					.bind(projectId)
					.first();
			} catch {
				// Table may not exist
			}
		}

		return {
			project,
			twitter: {
				stats: twitterStats.results || [],
				latest: twitterLatest,
				postFrequency: twitterPostFrequency,
				posts: twitterPosts
			},
			instagram: {
				stats: instagramStats.results || [],
				latest: instagramLatest
			},
			tiktok: {
				stats: tiktokStats.results || [],
				latest: tiktokLatest
			},
			youtube: {
				stats: youtubeStats.results || [],
				latest: youtubeLatest,
				channels: youtubeChannels,
				settings: youtubeSettings,
				hasApiKey: !!youtubeSettings?.api_key,
				postFrequency: youtubePostFrequency
			},
			// Meta API data
			meta: {
				hasSettings: !!metaSettings,
				instagram: {
					account: instagramAccount,
					media: instagramMedia,
					stats: metaStats.instagram
				},
				threads: {
					posts: threadsPosts,
					stats: metaStats.threads
				},
				facebook: {
					page: facebookPage
				}
			}
		};
	} catch (err) {
		console.error('Analytics load error:', err);
		throw error(500, 'データの読み込みに失敗しました');
	}
};

export const actions: Actions = {
	// YouTube API Key管理
	saveYouTubeApiKey: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: 'Unauthorized' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const apiKey = data.get('api_key')?.toString();

		if (!apiKey) {
			return fail(400, { error: 'API key is required' });
		}

		try {
			const project = await db
				.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?')
				.bind(projectId, locals.userId)
				.first();

			if (!project) {
				return fail(403, { error: 'Access denied' });
			}

			const existing = await db
				.prepare('SELECT id FROM youtube_settings WHERE project_id = ?')
				.bind(projectId)
				.first();

			if (existing) {
				await db
					.prepare('UPDATE youtube_settings SET api_key = ?, updated_at = CURRENT_TIMESTAMP WHERE project_id = ?')
					.bind(apiKey, projectId)
					.run();
			} else {
				await db
					.prepare('INSERT INTO youtube_settings (user_id, project_id, api_key) VALUES (?, ?, ?)')
					.bind(locals.userId, projectId, apiKey)
					.run();
			}

			return { success: true, message: 'API key saved successfully' };
		} catch (err) {
			console.error('Save API key error:', err);
			return fail(500, { error: 'Failed to save API key' });
		}
	},

	// YouTubeチャンネル追加
	addYouTubeChannel: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: 'Unauthorized' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const channelHandle = data.get('channel_handle')?.toString();

		if (!channelHandle) {
			return fail(400, { error: 'Channel handle is required' });
		}

		try {
			const project = await db
				.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?')
				.bind(projectId, locals.userId)
				.first();

			if (!project) {
				return fail(403, { error: 'Access denied' });
			}

			const settings = await db
				.prepare('SELECT api_key FROM youtube_settings WHERE project_id = ?')
				.bind(projectId)
				.first<{ api_key: string }>();

			if (!settings?.api_key) {
				return fail(400, { error: 'API key not configured' });
			}

			const handle = channelHandle.replace('@', '');
			const response = await fetch(
				`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${handle}&key=${settings.api_key}`
			);
			const result = await response.json();

			if (!result.items || result.items.length === 0) {
				return fail(404, { error: 'Channel not found' });
			}

			const channel = result.items[0];

			await db
				.prepare(`
					INSERT INTO youtube_channels (user_id, project_id, channel_id, channel_handle, channel_name, thumbnail_url, updated_at)
					VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
					ON CONFLICT(project_id, channel_id) DO UPDATE SET
						channel_name = excluded.channel_name,
						thumbnail_url = excluded.thumbnail_url,
						updated_at = CURRENT_TIMESTAMP
				`)
				.bind(
					locals.userId,
					projectId,
					channel.id,
					channel.snippet.customUrl || null,
					channel.snippet.title,
					channel.snippet.thumbnails.medium?.url || channel.snippet.thumbnails.default?.url
				)
				.run();

			const savedChannel = await db
				.prepare('SELECT id FROM youtube_channels WHERE user_id = ? AND channel_id = ?')
				.bind(locals.userId, channel.id)
				.first<{ id: number }>();

			if (savedChannel) {
				const today = new Date().toISOString().split('T')[0];
				await db
					.prepare(`
						INSERT INTO youtube_stats (channel_id, subscriber_count, view_count, video_count, subscriber_change, view_change, recorded_date)
						VALUES (?, ?, ?, ?, 0, 0, ?)
						ON CONFLICT(channel_id, recorded_date) DO UPDATE SET
							subscriber_count = excluded.subscriber_count,
							view_count = excluded.view_count,
							video_count = excluded.video_count
					`)
					.bind(
						savedChannel.id,
						parseInt(channel.statistics.subscriberCount) || 0,
						parseInt(channel.statistics.viewCount) || 0,
						parseInt(channel.statistics.videoCount) || 0,
						today
					)
					.run();
			}

			return { success: true, message: `Channel "${channel.snippet.title}" added successfully`, channelName: channel.snippet.title };
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : String(err);
			console.error('Add channel error:', err);
			return fail(500, { error: `Failed to add channel: ${errorMessage}` });
		}
	},

	// YouTubeチャンネル削除
	deleteYouTubeChannel: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: 'Unauthorized' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const channelId = parseInt(data.get('channel_id')?.toString() || '0');

		try {
			const channel = await db
				.prepare('SELECT id FROM youtube_channels WHERE id = ? AND project_id = ?')
				.bind(channelId, projectId)
				.first<{ id: number }>();

			if (channel) {
				await db
					.prepare('DELETE FROM youtube_video_stats WHERE video_id IN (SELECT id FROM youtube_videos WHERE channel_id = ?)')
					.bind(channel.id)
					.run();
				await db
					.prepare('DELETE FROM youtube_videos WHERE channel_id = ?')
					.bind(channel.id)
					.run();
				await db
					.prepare('DELETE FROM youtube_stats WHERE channel_id = ?')
					.bind(channel.id)
					.run();
				await db
					.prepare('DELETE FROM youtube_channels WHERE id = ?')
					.bind(channel.id)
					.run();
			}

			return { success: true, message: 'Channel deleted successfully' };
		} catch (err) {
			console.error('Delete channel error:', err);
			return fail(500, { error: 'Failed to delete channel' });
		}
	},

	// YouTube統計更新
	refreshYouTubeStats: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: 'Unauthorized' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const channelId = parseInt(data.get('channel_id')?.toString() || '0');

		try {
			const settings = await db
				.prepare('SELECT api_key FROM youtube_settings WHERE project_id = ?')
				.bind(projectId)
				.first<{ api_key: string }>();

			if (!settings?.api_key) {
				return fail(400, { error: 'API key not configured' });
			}

			const channel = await db
				.prepare('SELECT id, channel_id FROM youtube_channels WHERE id = ? AND project_id = ?')
				.bind(channelId, projectId)
				.first<{ id: number; channel_id: string }>();

			if (!channel) {
				return fail(404, { error: 'Channel not found' });
			}

			const previousStats = await db
				.prepare('SELECT subscriber_count, view_count FROM youtube_stats WHERE channel_id = ? ORDER BY recorded_date DESC LIMIT 1')
				.bind(channel.id)
				.first<{ subscriber_count: number; view_count: number }>();

			const response = await fetch(
				`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channel.channel_id}&key=${settings.api_key}`
			);
			const result = await response.json();

			if (!result.items || result.items.length === 0) {
				return fail(404, { error: 'Failed to get channel data' });
			}

			const stats = result.items[0].statistics;
			const today = new Date().toISOString().split('T')[0];
			const newSubscriberCount = parseInt(stats.subscriberCount) || 0;
			const newViewCount = parseInt(stats.viewCount) || 0;

			const subscriberChange = previousStats ? newSubscriberCount - previousStats.subscriber_count : 0;
			const viewChange = previousStats ? newViewCount - previousStats.view_count : 0;

			await db
				.prepare(`
					INSERT INTO youtube_stats (channel_id, subscriber_count, view_count, video_count, subscriber_change, view_change, recorded_date)
					VALUES (?, ?, ?, ?, ?, ?, ?)
					ON CONFLICT(channel_id, recorded_date) DO UPDATE SET
						subscriber_count = excluded.subscriber_count,
						view_count = excluded.view_count,
						video_count = excluded.video_count,
						subscriber_change = excluded.subscriber_change,
						view_change = excluded.view_change
				`)
				.bind(
					channel.id,
					newSubscriberCount,
					newViewCount,
					parseInt(stats.videoCount) || 0,
					subscriberChange,
					viewChange,
					today
				)
				.run();

			await db
				.prepare('UPDATE youtube_channels SET updated_at = CURRENT_TIMESTAMP WHERE id = ?')
				.bind(channel.id)
				.run();

			return { success: true, message: 'Stats refreshed successfully' };
		} catch (err) {
			console.error('Refresh stats error:', err);
			return fail(500, { error: 'Failed to refresh stats' });
		}
	},

	// YouTube動画取得
	fetchYouTubeVideos: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: 'Unauthorized' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const channelId = parseInt(data.get('channel_id')?.toString() || '0');

		try {
			const settings = await db
				.prepare('SELECT api_key FROM youtube_settings WHERE project_id = ?')
				.bind(projectId)
				.first<{ api_key: string }>();

			if (!settings?.api_key) {
				return fail(400, { error: 'API key not configured' });
			}

			const channel = await db
				.prepare('SELECT id, channel_id FROM youtube_channels WHERE id = ? AND project_id = ?')
				.bind(channelId, projectId)
				.first<{ id: number; channel_id: string }>();

			if (!channel) {
				return fail(404, { error: 'Channel not found' });
			}

			const searchResponse = await fetch(
				`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channel.channel_id}&type=video&order=date&maxResults=50&key=${settings.api_key}`
			);
			const searchResult = await searchResponse.json();

			if (!searchResult.items) {
				return fail(500, { error: 'Failed to fetch videos' });
			}

			const videoIds = searchResult.items.map((item: { id: { videoId: string } }) => item.id.videoId).join(',');

			if (!videoIds) {
				return { success: true, videoCount: 0, message: 'No videos found' };
			}

			const videosResponse = await fetch(
				`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${settings.api_key}`
			);
			const videosResult = await videosResponse.json();

			const today = new Date().toISOString().split('T')[0];

			for (const video of videosResult.items || []) {
				const existingVideo = await db
					.prepare('SELECT id FROM youtube_videos WHERE channel_id = ? AND video_id = ?')
					.bind(channel.id, video.id)
					.first<{ id: number }>();

				let previousVideoStats: { view_count: number; like_count: number; comment_count: number } | null = null;
				if (existingVideo) {
					previousVideoStats = await db
						.prepare('SELECT view_count, like_count, comment_count FROM youtube_video_stats WHERE video_id = ? ORDER BY recorded_date DESC LIMIT 1')
						.bind(existingVideo.id)
						.first<{ view_count: number; like_count: number; comment_count: number }>();
				}

				await db
					.prepare(`
						INSERT INTO youtube_videos (channel_id, video_id, title, description, thumbnail_url, published_at, duration, updated_at)
						VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
						ON CONFLICT(channel_id, video_id) DO UPDATE SET
							title = excluded.title,
							description = excluded.description,
							thumbnail_url = excluded.thumbnail_url,
							updated_at = CURRENT_TIMESTAMP
					`)
					.bind(
						channel.id,
						video.id,
						video.snippet.title,
						video.snippet.description?.substring(0, 500) || null,
						video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url,
						video.snippet.publishedAt,
						video.contentDetails.duration
					)
					.run();

				const savedVideo = await db
					.prepare('SELECT id FROM youtube_videos WHERE channel_id = ? AND video_id = ?')
					.bind(channel.id, video.id)
					.first<{ id: number }>();

				if (savedVideo) {
					const newViewCount = parseInt(video.statistics.viewCount) || 0;
					const newLikeCount = parseInt(video.statistics.likeCount) || 0;
					const newCommentCount = parseInt(video.statistics.commentCount) || 0;

					const viewChange = previousVideoStats ? newViewCount - previousVideoStats.view_count : 0;
					const likeChange = previousVideoStats ? newLikeCount - previousVideoStats.like_count : 0;
					const commentChange = previousVideoStats ? newCommentCount - previousVideoStats.comment_count : 0;

					await db
						.prepare(`
							INSERT INTO youtube_video_stats (video_id, view_count, like_count, comment_count, view_change, like_change, comment_change, recorded_date)
							VALUES (?, ?, ?, ?, ?, ?, ?, ?)
							ON CONFLICT(video_id, recorded_date) DO UPDATE SET
								view_count = excluded.view_count,
								like_count = excluded.like_count,
								comment_count = excluded.comment_count,
								view_change = excluded.view_change,
								like_change = excluded.like_change,
								comment_change = excluded.comment_change
						`)
						.bind(
							savedVideo.id,
							newViewCount,
							newLikeCount,
							newCommentCount,
							viewChange,
							likeChange,
							commentChange,
							today
						)
						.run();
				}
			}

			return { success: true, videoCount: videosResult.items?.length || 0, message: `Fetched ${videosResult.items?.length || 0} videos successfully` };
		} catch (err) {
			console.error('Fetch videos error:', err);
			return fail(500, { error: 'Failed to fetch videos' });
		}
	},

	// Twitter統計更新
	refreshTwitterStats: async ({ locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: 'Unauthorized' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);

		try {
			// Twitter API設定を取得
			const settings = await db
				.prepare('SELECT * FROM twitter_settings WHERE project_id = ? AND enabled = 1')
				.bind(projectId)
				.first<{
					api_key: string;
					api_secret: string;
					access_token: string;
					access_token_secret: string;
				}>();

			if (!settings) {
				return fail(400, { error: 'Twitter API設定が見つかりません' });
			}

			// ユーザー情報を取得
			const userInfo = await getUserInfo(settings);
			if (userInfo.error) {
				return fail(500, { error: `Twitter API error: ${userInfo.error}` });
			}

			// 統計情報を取得
			const stats = await getUserStats(settings);
			if (stats.error) {
				return fail(500, { error: `Twitter API error: ${stats.error}` });
			}

			// アカウント情報を更新または作成
			await db
				.prepare(`
					INSERT INTO twitter_accounts (project_id, account_id, username, name, display_name, created_at, updated_at)
					VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
					ON CONFLICT(project_id) DO UPDATE SET
						account_id = excluded.account_id,
						username = excluded.username,
						name = excluded.name,
						display_name = excluded.display_name,
						updated_at = CURRENT_TIMESTAMP
				`)
				.bind(projectId, userInfo.id, userInfo.username, userInfo.name, userInfo.name)
				.run();

			// アカウントIDを取得
			const account = await db
				.prepare('SELECT id FROM twitter_accounts WHERE project_id = ?')
				.bind(projectId)
				.first<{ id: number }>();

			if (!account) {
				return fail(500, { error: 'Failed to get account ID' });
			}

			// 統計情報を保存
			const today = new Date().toISOString().split('T')[0];
			await db
				.prepare(`
					INSERT INTO twitter_stats (account_id, followers_count, following_count, tweet_count, recorded_date, created_at)
					VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
					ON CONFLICT(account_id, recorded_date) DO UPDATE SET
						followers_count = excluded.followers_count,
						following_count = excluded.following_count,
						tweet_count = excluded.tweet_count
				`)
				.bind(account.id, stats.followersCount, stats.followingCount, stats.tweetCount, today)
				.run();

			return {
				success: true,
				message: `統計を更新しました (フォロワー: ${stats.followersCount}, ツイート数: ${stats.tweetCount})`
			};
		} catch (err) {
			console.error('Refresh Twitter stats error:', err);
			return fail(500, { error: 'Failed to refresh Twitter stats' });
		}
	},

	// Twitterツイート取得
	fetchTwitterTweets: async ({ locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: 'Unauthorized' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);

		try {
			// Twitter API設定を取得
			const settings = await db
				.prepare('SELECT * FROM twitter_settings WHERE project_id = ? AND enabled = 1')
				.bind(projectId)
				.first<{
					api_key: string;
					api_secret: string;
					access_token: string;
					access_token_secret: string;
				}>();

			if (!settings) {
				return fail(400, { error: 'Twitter API設定が見つかりません' });
			}

			// Twitterアカウント情報を取得
			const account = await db
				.prepare('SELECT id, account_id FROM twitter_accounts WHERE project_id = ?')
				.bind(projectId)
				.first<{ id: number; account_id: string }>();

			if (!account || !account.account_id) {
				return fail(400, { error: 'まず統計を更新してアカウント情報を取得してください' });
			}

			// ツイートを取得（最大100件）
			const result = await getUserTweets(settings, account.account_id, 100);
			if (result.error) {
				return fail(500, { error: `Twitter API error: ${result.error}` });
			}

			let savedCount = 0;
			for (const tweet of result.tweets) {
				// 既存のツイートかチェック
				const existing = await db
					.prepare('SELECT id FROM twitter_posts WHERE account_id = ? AND tweet_id = ?')
					.bind(account.id, tweet.id)
					.first();

				if (!existing) {
					await db
						.prepare(`
							INSERT INTO twitter_posts (
								account_id, tweet_id, content, posted_at,
								like_count, retweet_count, reply_count, quote_count, impression_count,
								created_at
							)
							VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
						`)
						.bind(
							account.id,
							tweet.id,
							tweet.text,
							tweet.created_at,
							tweet.like_count,
							tweet.retweet_count,
							tweet.reply_count,
							tweet.quote_count,
							tweet.impression_count
						)
						.run();
					savedCount++;
				} else {
					// 既存のツイートのエンゲージメント指標を更新
					await db
						.prepare(`
							UPDATE twitter_posts
							SET like_count = ?,
								retweet_count = ?,
								reply_count = ?,
								quote_count = ?,
								impression_count = ?
							WHERE id = ?
						`)
						.bind(
							tweet.like_count,
							tweet.retweet_count,
							tweet.reply_count,
							tweet.quote_count,
							tweet.impression_count,
							existing.id
						)
						.run();
				}
			}

			return {
				success: true,
				message: `${result.tweets.length}件のツイートを取得し、${savedCount}件を新規保存しました`
			};
		} catch (err) {
			console.error('Fetch Twitter tweets error:', err);
			return fail(500, { error: 'Failed to fetch Twitter tweets' });
		}
	},

	// ===== Meta API アクション =====

	// Instagramデータを更新
	refreshInstagram: async ({ locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);

		try {
			const settings = await db
				.prepare('SELECT * FROM meta_api_settings WHERE project_id = ? AND enabled = 1')
				.bind(projectId)
				.first<{ access_token: string }>();

			if (!settings) {
				return fail(400, { error: 'Meta API設定を先に登録してください（SNS管理ページ）' });
			}

			// Facebookページを取得してInstagramアカウントを探す
			const pagesResult = await getFacebookPages(settings.access_token);
			if (pagesResult.error) {
				return fail(400, { error: `Facebook Error: ${pagesResult.error}` });
			}

			if (pagesResult.pages.length === 0) {
				return fail(400, { error: 'Facebookページが見つかりません' });
			}

			const page = pagesResult.pages[0];
			const igResult = await getInstagramAccounts(page.access_token, page.id);

			if (igResult.error || !igResult.account) {
				return fail(400, { error: igResult.error || 'Instagramビジネスアカウントが見つかりません' });
			}

			const igAccount = igResult.account;

			// Instagramアカウント情報を保存
			await db
				.prepare(`
					INSERT INTO instagram_business_accounts (project_id, ig_account_id, username, followers_count, follows_count, media_count, profile_picture_url, updated_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
					ON CONFLICT(project_id, ig_account_id) DO UPDATE SET
						username = excluded.username,
						followers_count = excluded.followers_count,
						follows_count = excluded.follows_count,
						media_count = excluded.media_count,
						profile_picture_url = excluded.profile_picture_url,
						updated_at = CURRENT_TIMESTAMP
				`)
				.bind(
					projectId,
					igAccount.id,
					igAccount.username,
					igAccount.followers_count || 0,
					igAccount.follows_count || 0,
					igAccount.media_count || 0,
					igAccount.profile_picture_url || null
				)
				.run();

			// Instagramメディアを取得
			const mediaResult = await getInstagramMedia(igAccount.id, page.access_token, 25);

			let savedMediaCount = 0;
			if (mediaResult.media.length > 0) {
				for (const media of mediaResult.media) {
					await db
						.prepare(`
							INSERT INTO instagram_media (project_id, media_id, media_type, media_url, permalink, caption, like_count, comments_count, timestamp, created_at)
							VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
							ON CONFLICT(project_id, media_id) DO UPDATE SET
								media_url = excluded.media_url,
								like_count = excluded.like_count,
								comments_count = excluded.comments_count
						`)
						.bind(
							projectId,
							media.id,
							media.media_type || 'IMAGE',
							media.media_url || null,
							media.permalink || null,
							media.caption || null,
							media.like_count || 0,
							media.comments_count || 0,
							media.timestamp || null
						)
						.run();
					savedMediaCount++;
				}
			}

			return {
				success: true,
				message: `Instagram @${igAccount.username} のデータを更新しました（投稿${savedMediaCount}件）`
			};
		} catch (err) {
			console.error('Refresh Instagram data error:', err);
			return fail(500, { error: 'Instagramデータの更新に失敗しました' });
		}
	},

	// Threadsデータを更新
	refreshThreads: async ({ locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);

		try {
			const settings = await db
				.prepare('SELECT * FROM meta_api_settings WHERE project_id = ? AND enabled = 1')
				.bind(projectId)
				.first<{ access_token: string }>();

			if (!settings) {
				return fail(400, { error: 'Meta API設定を先に登録してください（SNS管理ページ）' });
			}

			// Threads投稿を取得
			const threadsResult = await getThreadsPosts(settings.access_token, 'me', 50);

			if (threadsResult.error) {
				return fail(400, { error: `Threads Error: ${threadsResult.error}` });
			}

			let savedCount = 0;
			if (threadsResult.threads.length > 0) {
				for (const thread of threadsResult.threads) {
					await db
						.prepare(`
							INSERT INTO threads_posts (
								project_id, thread_id, text, permalink, timestamp,
								like_count, reply_count, quote_count, repost_count, views, created_at
							)
							VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
							ON CONFLICT(project_id, thread_id) DO UPDATE SET
								text = excluded.text,
								like_count = excluded.like_count,
								reply_count = excluded.reply_count,
								quote_count = excluded.quote_count,
								repost_count = excluded.repost_count,
								views = excluded.views
						`)
						.bind(
							projectId,
							thread.id,
							thread.text || null,
							thread.permalink || null,
							thread.timestamp || null,
							thread.like_count || 0,
							thread.reply_count || 0,
							thread.quote_count || 0,
							thread.repost_count || 0,
							thread.views || 0
						)
						.run();
					savedCount++;
				}
			}

			return {
				success: true,
				message: `Threadsデータを更新しました（${savedCount}件の投稿）`
			};
		} catch (err) {
			console.error('Refresh Threads data error:', err);
			return fail(500, { error: 'Threadsデータの更新に失敗しました' });
		}
	},

	// Facebookデータを更新
	refreshFacebook: async ({ locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);

		try {
			const settings = await db
				.prepare('SELECT * FROM meta_api_settings WHERE project_id = ? AND enabled = 1')
				.bind(projectId)
				.first<{ access_token: string }>();

			if (!settings) {
				return fail(400, { error: 'Meta API設定を先に登録してください（SNS管理ページ）' });
			}

			// Facebookページを取得
			const pagesResult = await getFacebookPages(settings.access_token);

			if (pagesResult.error) {
				return fail(400, { error: `Facebook Error: ${pagesResult.error}` });
			}

			if (pagesResult.pages.length === 0) {
				return fail(400, { error: 'Facebookページが見つかりません。このアクセストークンにページ管理権限があるか確認してください。' });
			}

			const page = pagesResult.pages[0];

			// ページ情報を保存
			await db
				.prepare(`
					INSERT INTO facebook_pages (project_id, page_id, page_name, page_access_token, category, followers_count, updated_at)
					VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
					ON CONFLICT(project_id, page_id) DO UPDATE SET
						page_name = excluded.page_name,
						page_access_token = excluded.page_access_token,
						category = excluded.category,
						followers_count = excluded.followers_count,
						updated_at = CURRENT_TIMESTAMP
				`)
				.bind(
					projectId,
					page.id,
					page.name,
					page.access_token,
					page.category || null,
					page.followers_count || 0
				)
				.run();

			return {
				success: true,
				message: `Facebookページ「${page.name}」のデータを更新しました`
			};
		} catch (err) {
			console.error('Refresh Facebook data error:', err);
			return fail(500, { error: 'Facebookデータの更新に失敗しました' });
		}
	}
};
