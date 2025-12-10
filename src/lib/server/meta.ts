/**
 * Meta (Facebook/Instagram/Threads) Graph API Integration
 *
 * Required permissions:
 * - pages_show_list, pages_read_engagement, pages_read_user_content
 * - instagram_basic, instagram_manage_insights, instagram_content_publish
 * - threads_business_basic (for Threads API - uses graph.threads.net)
 */

const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';

interface MetaSettings {
	app_id: string;
	app_secret: string;
	access_token: string;
}

/**
 * Facebook Pagesを取得
 */
export async function getFacebookPages(accessToken: string) {
	try {
		const response = await fetch(
			`${GRAPH_API_BASE}/me/accounts?fields=id,name,access_token,category,followers_count&access_token=${accessToken}`
		);

		const data = await response.json();

		if (data.error) {
			console.error('Facebook API error:', data.error);
			return { pages: [], error: data.error.message };
		}

		return { pages: data.data || [], error: null };
	} catch (err) {
		console.error('Get Facebook pages error:', err);
		return { pages: [], error: err instanceof Error ? err.message : 'Unknown error' };
	}
}

/**
 * Instagram Business Accountを取得
 */
export async function getInstagramAccounts(pageAccessToken: string, pageId: string) {
	try {
		const response = await fetch(
			`${GRAPH_API_BASE}/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
		);

		const data = await response.json();

		if (data.error) {
			console.error('Instagram API error:', data.error);
			return { account: null, error: data.error.message };
		}

		if (!data.instagram_business_account) {
			return { account: null, error: 'No Instagram Business Account linked to this page' };
		}

		// Instagram アカウント詳細を取得
		const igAccountId = data.instagram_business_account.id;
		const detailsResponse = await fetch(
			`${GRAPH_API_BASE}/${igAccountId}?fields=id,username,followers_count,follows_count,media_count,profile_picture_url&access_token=${pageAccessToken}`
		);

		const accountData = await detailsResponse.json();

		if (accountData.error) {
			return { account: null, error: accountData.error.message };
		}

		return { account: accountData, error: null };
	} catch (err) {
		console.error('Get Instagram account error:', err);
		return { account: null, error: err instanceof Error ? err.message : 'Unknown error' };
	}
}

/**
 * Instagramメディア（投稿）を取得
 */
export async function getInstagramMedia(igAccountId: string, accessToken: string, limit: number = 25) {
	try {
		const response = await fetch(
			`${GRAPH_API_BASE}/${igAccountId}/media?fields=id,media_type,media_url,permalink,caption,like_count,comments_count,timestamp&limit=${limit}&access_token=${accessToken}`
		);

		const data = await response.json();

		if (data.error) {
			console.error('Instagram media API error:', data.error);
			return { media: [], error: data.error.message };
		}

		return { media: data.data || [], error: null };
	} catch (err) {
		console.error('Get Instagram media error:', err);
		return { media: [], error: err instanceof Error ? err.message : 'Unknown error' };
	}
}

/**
 * Threads投稿を取得
 *
 * Threads API uses a separate base URL: https://graph.threads.net
 * Required permission: threads_business_basic
 */
export async function getThreadsPosts(accessToken: string, userId: string = 'me', limit: number = 25) {
	try {
		// Threads API uses graph.threads.net, not graph.facebook.com
		const THREADS_API_BASE = 'https://graph.threads.net/v1.0';

		// First, get the user's Threads profile
		const profileResponse = await fetch(
			`${THREADS_API_BASE}/me?fields=id,username,threads_profile_picture_url,threads_biography&access_token=${accessToken}`
		);

		const profileData = await profileResponse.json();

		if (profileData.error) {
			console.error('Threads profile API error:', profileData.error);
			return { threads: [], profile: null, error: profileData.error.message };
		}

		// Get user's threads (posts)
		const threadsResponse = await fetch(
			`${THREADS_API_BASE}/me/threads?fields=id,text,permalink,timestamp,media_type,shortcode&limit=${limit}&access_token=${accessToken}`
		);

		const data = await threadsResponse.json();

		if (data.error) {
			console.error('Threads API error:', data.error);
			return { threads: [], profile: profileData, error: data.error.message };
		}

		// Get insights for each thread post if available
		const threadsWithInsights = await Promise.all(
			(data.data || []).map(async (thread: any) => {
				try {
					const insightsResponse = await fetch(
						`${THREADS_API_BASE}/${thread.id}/insights?metric=views,likes,replies,reposts,quotes&access_token=${accessToken}`
					);
					const insightsData = await insightsResponse.json();

					if (insightsData.data) {
						const insights: any = {};
						insightsData.data.forEach((metric: any) => {
							insights[metric.name] = metric.values?.[0]?.value || 0;
						});
						return {
							...thread,
							like_count: insights.likes || 0,
							reply_count: insights.replies || 0,
							quote_count: insights.quotes || 0,
							repost_count: insights.reposts || 0,
							views: insights.views || 0
						};
					}
					return thread;
				} catch {
					return thread;
				}
			})
		);

		return { threads: threadsWithInsights, profile: profileData, error: null };
	} catch (err) {
		console.error('Get Threads posts error:', err);
		return { threads: [], profile: null, error: err instanceof Error ? err.message : 'Unknown error' };
	}
}

/**
 * Facebookページのインサイトを取得
 */
export async function getPageInsights(pageId: string, pageAccessToken: string) {
	try {
		const metrics = 'page_impressions,page_engaged_users,page_post_engagements';
		const period = 'day';
		const since = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60); // 7日前
		const until = Math.floor(Date.now() / 1000);

		const response = await fetch(
			`${GRAPH_API_BASE}/${pageId}/insights?metric=${metrics}&period=${period}&since=${since}&until=${until}&access_token=${pageAccessToken}`
		);

		const data = await response.json();

		if (data.error) {
			console.error('Page insights API error:', data.error);
			return { insights: null, error: data.error.message };
		}

		return { insights: data.data || [], error: null };
	} catch (err) {
		console.error('Get page insights error:', err);
		return { insights: null, error: err instanceof Error ? err.message : 'Unknown error' };
	}
}

/**
 * アクセストークンの有効期限を確認
 */
export async function debugToken(accessToken: string, appId: string, appSecret: string) {
	try {
		const appAccessToken = `${appId}|${appSecret}`;
		const response = await fetch(
			`${GRAPH_API_BASE}/debug_token?input_token=${accessToken}&access_token=${appAccessToken}`
		);

		const data = await response.json();

		if (data.error) {
			return { valid: false, error: data.error.message };
		}

		return {
			valid: data.data.is_valid || false,
			expiresAt: data.data.expires_at ? new Date(data.data.expires_at * 1000) : null,
			scopes: data.data.scopes || [],
			error: null
		};
	} catch (err) {
		console.error('Debug token error:', err);
		return { valid: false, error: err instanceof Error ? err.message : 'Unknown error' };
	}
}

/**
 * Long-Lived Access Tokenを取得（有効期限60日）
 */
export async function getLongLivedToken(shortLivedToken: string, appId: string, appSecret: string) {
	try {
		const response = await fetch(
			`${GRAPH_API_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`
		);

		const data = await response.json();

		if (data.error) {
			return { token: null, error: data.error.message };
		}

		return { token: data.access_token, expiresIn: data.expires_in, error: null };
	} catch (err) {
		console.error('Get long-lived token error:', err);
		return { token: null, error: err instanceof Error ? err.message : 'Unknown error' };
	}
}
