import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDB } from '$lib/server/db';

interface YouTubeSettings {
	id: number;
	api_key: string | null;
}

interface YouTubeChannel {
	id: number;
	channel_id: string;
	channel_name: string;
	channel_handle: string | null;
	thumbnail_url: string | null;
}

interface YouTubeStats {
	id: number;
	subscriber_count: number;
	view_count: number;
	video_count: number;
	subscriber_change: number;
	view_change: number;
	recorded_date: string;
}

interface YouTubeVideo {
	id: number;
	video_id: string;
	title: string;
	thumbnail_url: string | null;
	published_at: string | null;
	duration: string | null;
}

interface YouTubeVideoStats {
	view_count: number;
	like_count: number;
	comment_count: number;
}

interface Project {
	id: number;
	title: string;
}

export const load: PageServerLoad = async ({ locals, platform, params }) => {
	if (!locals.userId) {
		throw redirect(303, '/login');
	}

	const db = getDB(platform);
	const userId = locals.userId;
	const projectId = parseInt(params.projectId);

	try {
		const project = await db
			.prepare('SELECT id, title FROM projects WHERE id = ? AND user_id = ?')
			.bind(projectId, userId)
			.first<Project>();

		if (!project) {
			throw redirect(303, '/dashboard');
		}

		let settings: YouTubeSettings | null = null;
		try {
			settings = await db
				.prepare('SELECT id, api_key FROM youtube_settings WHERE project_id = ?')
				.bind(projectId)
				.first<YouTubeSettings>();
		} catch {
			// Table may not exist
		}

		// チャンネル一覧と詳細データを取得
		let channels: Array<YouTubeChannel & {
			stats: YouTubeStats | null;
			statsHistory: YouTubeStats[];
			videos: Array<YouTubeVideo & YouTubeVideoStats>;
			subscriberChange: number;
			viewChange: number;
		}> = [];

		try {
			const result = await db
				.prepare('SELECT id, channel_id, channel_name, channel_handle, thumbnail_url FROM youtube_channels WHERE project_id = ?')
				.bind(projectId)
				.all<YouTubeChannel>();

			for (const channel of result.results) {
				// 最新の統計を取得
				const latestStats = await db
					.prepare('SELECT id, subscriber_count, view_count, video_count, subscriber_change, view_change, recorded_date FROM youtube_stats WHERE channel_id = ? ORDER BY recorded_date DESC LIMIT 1')
					.bind(channel.id)
					.first<YouTubeStats>();

				// 統計履歴（最大30日分）
				const statsHistoryResult = await db
					.prepare('SELECT id, subscriber_count, view_count, video_count, subscriber_change, view_change, recorded_date FROM youtube_stats WHERE channel_id = ? ORDER BY recorded_date DESC LIMIT 30')
					.bind(channel.id)
					.all<YouTubeStats>();
				const statsHistory = statsHistoryResult.results.reverse();

				// 変化を計算
				let subscriberChange = 0;
				let viewChange = 0;
				if (statsHistory.length >= 2) {
					const today = statsHistory[statsHistory.length - 1];
					const yesterday = statsHistory[statsHistory.length - 2];
					subscriberChange = today.subscriber_count - yesterday.subscriber_count;
					viewChange = today.view_count - yesterday.view_count;
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
					.all<YouTubeVideo & YouTubeVideoStats>();

				channels.push({
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

		return {
			project,
			settings,
			channels,
			hasApiKey: !!settings?.api_key
		};
	} catch (err) {
		if (err instanceof Response) {
			throw err;
		}
		console.error('YouTube page load error:', err);
		throw redirect(303, '/dashboard');
	}
};

export const actions: Actions = {
	saveApiKey: async ({ request, locals, platform, params }) => {
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

			return { success: true };
		} catch (err) {
			console.error('Save API key error:', err);
			return fail(500, { error: 'Failed to save API key' });
		}
	},

	addChannel: async ({ request, locals, platform, params }) => {
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
					ON CONFLICT(user_id, channel_id) DO UPDATE SET
						channel_name = excluded.channel_name,
						thumbnail_url = excluded.thumbnail_url,
						project_id = excluded.project_id,
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

			return { success: true, channelName: channel.snippet.title };
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : String(err);
			console.error('=== Add channel error ===');
			console.error('Error type:', err instanceof Error ? err.constructor.name : typeof err);
			console.error('Error message:', errorMessage);
			console.error('Full error:', err);
			console.error('========================');
			return fail(500, { error: `Failed to add channel: ${errorMessage}` });
		}
	},

	deleteChannel: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: 'Unauthorized' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const channelId = parseInt(data.get('channel_id')?.toString() || '0');

		try {
			// 関連データも削除
			const channel = await db
				.prepare('SELECT id FROM youtube_channels WHERE id = ? AND project_id = ?')
				.bind(channelId, projectId)
				.first<{ id: number }>();

			if (channel) {
				// 動画の統計を削除
				await db
					.prepare('DELETE FROM youtube_video_stats WHERE video_id IN (SELECT id FROM youtube_videos WHERE channel_id = ?)')
					.bind(channel.id)
					.run();
				// 動画を削除
				await db
					.prepare('DELETE FROM youtube_videos WHERE channel_id = ?')
					.bind(channel.id)
					.run();
				// チャンネル統計を削除
				await db
					.prepare('DELETE FROM youtube_stats WHERE channel_id = ?')
					.bind(channel.id)
					.run();
				// チャンネルを削除
				await db
					.prepare('DELETE FROM youtube_channels WHERE id = ?')
					.bind(channel.id)
					.run();
			}

			return { success: true };
		} catch (err) {
			console.error('Delete channel error:', err);
			return fail(500, { error: 'Failed to delete channel' });
		}
	},

	refreshStats: async ({ request, locals, platform, params }) => {
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

			// Get previous stats for calculating change
			const previousStats = await db
				.prepare('SELECT subscriber_count, view_count FROM youtube_stats WHERE channel_id = ? ORDER BY recorded_date DESC LIMIT 1')
				.bind(channel.id)
				.first<{ subscriber_count: number; view_count: number }>();

			// Fetch new stats from YouTube API
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

			// Calculate changes
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

			// Update channel updated_at
			await db
				.prepare('UPDATE youtube_channels SET updated_at = CURRENT_TIMESTAMP WHERE id = ?')
				.bind(channel.id)
				.run();

			return { success: true };
		} catch (err) {
			console.error('Refresh stats error:', err);
			return fail(500, { error: 'Failed to refresh stats' });
		}
	},

	fetchVideos: async ({ request, locals, platform, params }) => {
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

			// Search for videos
			const searchResponse = await fetch(
				`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channel.channel_id}&type=video&order=date&maxResults=50&key=${settings.api_key}`
			);
			const searchResult = await searchResponse.json();

			if (!searchResult.items) {
				return fail(500, { error: 'Failed to fetch videos' });
			}

			const videoIds = searchResult.items.map((item: { id: { videoId: string } }) => item.id.videoId).join(',');

			if (!videoIds) {
				return { success: true, videoCount: 0 };
			}

			// Get video details
			const videosResponse = await fetch(
				`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${settings.api_key}`
			);
			const videosResult = await videosResponse.json();

			const today = new Date().toISOString().split('T')[0];

			for (const video of videosResult.items || []) {
				// Get previous video stats
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

				// Insert/update video
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

				// Get video ID
				const savedVideo = await db
					.prepare('SELECT id FROM youtube_videos WHERE channel_id = ? AND video_id = ?')
					.bind(channel.id, video.id)
					.first<{ id: number }>();

				if (savedVideo) {
					const newViewCount = parseInt(video.statistics.viewCount) || 0;
					const newLikeCount = parseInt(video.statistics.likeCount) || 0;
					const newCommentCount = parseInt(video.statistics.commentCount) || 0;

					// Calculate changes
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

			return { success: true, videoCount: videosResult.items?.length || 0 };
		} catch (err) {
			console.error('Fetch videos error:', err);
			return fail(500, { error: 'Failed to fetch videos' });
		}
	},

	testConnection: async ({ locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: 'Unauthorized' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);

		try {
			const settings = await db
				.prepare('SELECT api_key FROM youtube_settings WHERE project_id = ?')
				.bind(projectId)
				.first<{ api_key: string }>();

			if (!settings?.api_key) {
				return fail(400, { error: 'API key not configured' });
			}

			// Test the API key by fetching a public channel (YouTube's official channel)
			const response = await fetch(
				`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=UC_x5XG1OV2P6uZZ5FSM9Ttw&key=${settings.api_key}`
			);
			const result = await response.json();

			if (!response.ok) {
				console.error('YouTube API test error:', result);
				const errorMsg = result.error?.message || 'API test failed';
				return fail(500, { error: `Connection failed: ${errorMsg}` });
			}

			if (!result.items || result.items.length === 0) {
				return fail(500, { error: 'Connection test failed: Unable to fetch data' });
			}

			return { success: true, message: 'API connection successful!' };
		} catch (err) {
			console.error('Test connection error:', err);
			return fail(500, { error: 'Connection test failed' });
		}
	},

	addChannelById: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: 'Unauthorized' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const channelId = data.get('channel_id')?.toString();
		const channelName = data.get('channel_name')?.toString();
		const channelHandle = data.get('channel_handle')?.toString();
		const thumbnailUrl = data.get('thumbnail_url')?.toString();
		const subscriberCount = parseInt(data.get('subscriber_count')?.toString() || '0');
		const videoCount = parseInt(data.get('video_count')?.toString() || '0');
		const viewCount = parseInt(data.get('view_count')?.toString() || '0');

		if (!channelId || !channelName) {
			return fail(400, { error: 'Channel ID and name are required' });
		}

		try {
			const project = await db
				.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?')
				.bind(projectId, locals.userId)
				.first();

			if (!project) {
				return fail(403, { error: 'Access denied' });
			}

			// Insert channel
			await db
				.prepare(`
					INSERT INTO youtube_channels (user_id, project_id, channel_id, channel_handle, channel_name, thumbnail_url, updated_at)
					VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
					ON CONFLICT(user_id, channel_id) DO UPDATE SET
						channel_name = excluded.channel_name,
						thumbnail_url = excluded.thumbnail_url,
						project_id = excluded.project_id,
						updated_at = CURRENT_TIMESTAMP
				`)
				.bind(
					locals.userId,
					projectId,
					channelId,
					channelHandle,
					channelName,
					thumbnailUrl
				)
				.run();

			// Get the saved channel
			const savedChannel = await db
				.prepare('SELECT id FROM youtube_channels WHERE user_id = ? AND channel_id = ?')
				.bind(locals.userId, channelId)
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
						subscriberCount,
						viewCount,
						videoCount,
						today
					)
					.run();
			}

			return { success: true, channelName };
		} catch (err) {
			console.error('Add channel by ID error:', err);
			return fail(500, { error: 'Failed to add channel' });
		}
	}
};
