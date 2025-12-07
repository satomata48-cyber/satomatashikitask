import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/server/db';

interface YouTubeSettings {
	id: number;
	user_id: number;
	api_key: string;
}

interface YouTubeChannel {
	id: number;
	user_id: number;
	channel_id: string;
	channel_handle: string | null;
	channel_name: string | null;
	thumbnail_url: string | null;
}

interface YouTubeStats {
	subscriber_count: number;
	view_count: number;
	video_count: number;
	recorded_date: string;
}

interface YouTubeAPIResponse {
	items?: Array<{
		id: string;
		snippet: {
			title: string;
			customUrl?: string;
			thumbnails: {
				default?: { url: string };
				medium?: { url: string };
			};
		};
		statistics: {
			subscriberCount: string;
			viewCount: string;
			videoCount: string;
		};
	}>;
	error?: {
		message: string;
	};
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.userId) {
		throw redirect(302, '/login');
	}

	const db = getDB(platform);
	const userId = locals.userId;

	// Get YouTube settings
	const settings = await db
		.prepare('SELECT * FROM youtube_settings WHERE user_id = ?')
		.bind(userId)
		.first<YouTubeSettings>();

	// Get YouTube channels
	const channelsResult = await db
		.prepare('SELECT * FROM youtube_channels WHERE user_id = ? ORDER BY created_at DESC')
		.bind(userId)
		.all<YouTubeChannel>();

	const channels = channelsResult.results || [];

	// Get latest stats for each channel
	const stats: Record<number, YouTubeStats | null> = {};
	for (const channel of channels) {
		const latestStats = await db
			.prepare(`
				SELECT subscriber_count, view_count, video_count, recorded_date
				FROM youtube_stats
				WHERE channel_id = ?
				ORDER BY recorded_date DESC
				LIMIT 1
			`)
			.bind(channel.id)
			.first<YouTubeStats>();
		stats[channel.id] = latestStats || null;
	}

	return {
		settings: settings ? { id: settings.id, hasApiKey: true } : null,
		channels,
		stats
	};
};

export const actions: Actions = {
	saveApiKey: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			throw redirect(302, '/login');
		}

		const db = getDB(platform);
		const userId = locals.userId;

		const data = await request.formData();
		const apiKey = data.get('api_key')?.toString().trim();

		if (!apiKey) {
			return fail(400, { error: 'APIキーを入力してください' });
		}

		// Validate API key by making a test request
		try {
			const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=UC_x5XG1OV2P6uZZ5FSM9Ttw&key=${apiKey}`);
			const result = await response.json() as YouTubeAPIResponse;

			if (result.error) {
				return fail(400, { error: `APIキーが無効です: ${result.error.message}` });
			}
		} catch {
			return fail(400, { error: 'APIキーの検証に失敗しました' });
		}

		// Upsert settings
		await db
			.prepare(`
				INSERT INTO youtube_settings (user_id, api_key, updated_at)
				VALUES (?, ?, CURRENT_TIMESTAMP)
				ON CONFLICT(user_id) DO UPDATE SET
					api_key = excluded.api_key,
					updated_at = CURRENT_TIMESTAMP
			`)
			.bind(userId, apiKey)
			.run();

		return { success: true, message: 'APIキーを保存しました' };
	},

	addChannel: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			throw redirect(302, '/login');
		}

		const db = getDB(platform);
		const userId = locals.userId;

		// Get API key
		const settings = await db
			.prepare('SELECT api_key FROM youtube_settings WHERE user_id = ?')
			.bind(userId)
			.first<{ api_key: string }>();

		if (!settings) {
			return fail(400, { error: '先にAPIキーを設定してください' });
		}

		const data = await request.formData();
		const channelInput = data.get('channel_input')?.toString().trim();

		if (!channelInput) {
			return fail(400, { error: 'チャンネルIDまたはハンドル名を入力してください' });
		}

		// Determine if input is handle or channel ID
		let apiUrl: string;
		if (channelInput.startsWith('@')) {
			// Handle format
			const handle = channelInput.substring(1);
			apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${handle}&key=${settings.api_key}`;
		} else if (channelInput.startsWith('UC')) {
			// Channel ID format
			apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelInput}&key=${settings.api_key}`;
		} else {
			// Try as handle without @
			apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${channelInput}&key=${settings.api_key}`;
		}

		try {
			const response = await fetch(apiUrl);
			const result = await response.json() as YouTubeAPIResponse;

			if (result.error) {
				return fail(400, { error: `YouTube APIエラー: ${result.error.message}` });
			}

			if (!result.items || result.items.length === 0) {
				return fail(400, { error: 'チャンネルが見つかりません' });
			}

			const channel = result.items[0];
			const channelId = channel.id;
			const channelName = channel.snippet.title;
			const channelHandle = channel.snippet.customUrl || null;
			const thumbnailUrl = channel.snippet.thumbnails.medium?.url || channel.snippet.thumbnails.default?.url || null;

			// Check if channel already exists
			const existing = await db
				.prepare('SELECT id FROM youtube_channels WHERE user_id = ? AND channel_id = ?')
				.bind(userId, channelId)
				.first();

			if (existing) {
				return fail(400, { error: 'このチャンネルは既に登録されています' });
			}

			// Insert channel
			const insertResult = await db
				.prepare(`
					INSERT INTO youtube_channels (user_id, channel_id, channel_handle, channel_name, thumbnail_url)
					VALUES (?, ?, ?, ?, ?)
				`)
				.bind(userId, channelId, channelHandle, channelName, thumbnailUrl)
				.run();

			const newChannelId = insertResult.meta.last_row_id;

			// Save initial stats
			const today = new Date().toISOString().split('T')[0];
			await db
				.prepare(`
					INSERT INTO youtube_stats (channel_id, subscriber_count, view_count, video_count, recorded_date)
					VALUES (?, ?, ?, ?, ?)
				`)
				.bind(
					newChannelId,
					parseInt(channel.statistics.subscriberCount) || 0,
					parseInt(channel.statistics.viewCount) || 0,
					parseInt(channel.statistics.videoCount) || 0,
					today
				)
				.run();

			return { success: true, message: `${channelName} を追加しました` };
		} catch (err) {
			console.error('YouTube API error:', err);
			return fail(500, { error: 'チャンネル情報の取得に失敗しました' });
		}
	},

	refreshStats: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			throw redirect(302, '/login');
		}

		const db = getDB(platform);
		const userId = locals.userId;

		const data = await request.formData();
		const channelDbId = data.get('channel_id')?.toString();

		if (!channelDbId) {
			return fail(400, { error: 'チャンネルIDが指定されていません' });
		}

		// Get API key and channel info
		const settings = await db
			.prepare('SELECT api_key FROM youtube_settings WHERE user_id = ?')
			.bind(userId)
			.first<{ api_key: string }>();

		if (!settings) {
			return fail(400, { error: 'APIキーが設定されていません' });
		}

		const channel = await db
			.prepare('SELECT * FROM youtube_channels WHERE id = ? AND user_id = ?')
			.bind(channelDbId, userId)
			.first<YouTubeChannel>();

		if (!channel) {
			return fail(400, { error: 'チャンネルが見つかりません' });
		}

		try {
			const apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channel.channel_id}&key=${settings.api_key}`;
			const response = await fetch(apiUrl);
			const result = await response.json() as YouTubeAPIResponse;

			if (result.error || !result.items || result.items.length === 0) {
				return fail(400, { error: 'チャンネル情報の取得に失敗しました' });
			}

			const channelData = result.items[0];
			const today = new Date().toISOString().split('T')[0];

			// Update or insert stats
			await db
				.prepare(`
					INSERT INTO youtube_stats (channel_id, subscriber_count, view_count, video_count, recorded_date)
					VALUES (?, ?, ?, ?, ?)
					ON CONFLICT(channel_id, recorded_date) DO UPDATE SET
						subscriber_count = excluded.subscriber_count,
						view_count = excluded.view_count,
						video_count = excluded.video_count
				`)
				.bind(
					channel.id,
					parseInt(channelData.statistics.subscriberCount) || 0,
					parseInt(channelData.statistics.viewCount) || 0,
					parseInt(channelData.statistics.videoCount) || 0,
					today
				)
				.run();

			// Update channel info
			await db
				.prepare(`
					UPDATE youtube_channels
					SET channel_name = ?, thumbnail_url = ?, channel_handle = ?
					WHERE id = ?
				`)
				.bind(
					channelData.snippet.title,
					channelData.snippet.thumbnails.medium?.url || channelData.snippet.thumbnails.default?.url,
					channelData.snippet.customUrl || null,
					channel.id
				)
				.run();

			return { success: true, message: '統計情報を更新しました' };
		} catch (err) {
			console.error('YouTube API error:', err);
			return fail(500, { error: '統計情報の更新に失敗しました' });
		}
	},

	deleteChannel: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			throw redirect(302, '/login');
		}

		const db = getDB(platform);
		const userId = locals.userId;
		const data = await request.formData();
		const channelDbId = data.get('channel_id')?.toString();

		if (!channelDbId) {
			return fail(400, { error: 'チャンネルIDが指定されていません' });
		}

		// Delete channel (stats will be cascade deleted)
		await db
			.prepare('DELETE FROM youtube_channels WHERE id = ? AND user_id = ?')
			.bind(channelDbId, userId)
			.run();

		return { success: true, message: 'チャンネルを削除しました' };
	}
};
