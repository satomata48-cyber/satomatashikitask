/**
 * Meta (Facebook/Instagram/Threads) Graph API Integration
 *
 * Required permissions:
 * - pages_show_list, pages_read_engagement, pages_read_user_content
 * - instagram_basic, instagram_manage_insights
 * - threads_basic, threads_read_replies
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
 */
export async function getThreadsPosts(accessToken: string, userId: string = 'me', limit: number = 25) {
	try {
		// Threads API v1.0
		const response = await fetch(
			`${GRAPH_API_BASE}/${userId}/threads?fields=id,text,permalink,timestamp,like_count,reply_count,quote_count,repost_count,views&limit=${limit}&access_token=${accessToken}`
		);

		const data = await response.json();

		if (data.error) {
			console.error('Threads API error:', data.error);
			return { threads: [], error: data.error.message };
		}

		return { threads: data.data || [], error: null };
	} catch (err) {
		console.error('Get Threads posts error:', err);
		return { threads: [], error: err instanceof Error ? err.message : 'Unknown error' };
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
