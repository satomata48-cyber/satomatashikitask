import { fail, redirect, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDB } from '$lib/server/db';

interface Project {
	id: number;
	title: string;
	description: string | null;
	status: string;
	color: string;
}

interface ProjectTag {
	id: number;
	name: string;
	color: string;
}

interface KpiGoal {
	id: number;
	project_id: number;
	category: string;
	title: string;
	target_value: number;
	current_value: number;
	unit: string;
	repeat_cycle: string;
	period_start: string | null;
	period_end: string | null;
}

interface KpiRecord {
	id: number;
	goal_id: number;
	value: number;
	recorded_date: string;
	notes: string | null;
}

interface KpiPeriodHistory {
	id: number;
	goal_id: number;
	period_start: string;
	period_end: string;
	target_value: number;
	achieved_value: number;
	achievement_rate: number;
}

interface ProjectBoard {
	id: number;
	project_id: number;
	title: string;
	position: number;
	created_at: string;
	list_count: number;
	card_count: number;
	lists?: ProjectList[];
}

interface ProjectList {
	id: number;
	project_board_id: number;
	title: string;
	position: number;
	cards?: ProjectCard[];
}

interface ProjectCard {
	id: number;
	project_list_id: number;
	title: string;
	description: string | null;
	due_date: string | null;
	position: number;
}

interface ProjectDocument {
	id: number;
	project_id: number;
	project_board_id: number | null;
	title: string;
	content: string | null;
	updated_at: string;
}

interface DiscordSettings {
	id: number;
	user_id: number;
	webhook_url: string | null;
	enabled: number;
}

interface YouTubeChannel {
	id: number;
	channel_id: string;
	channel_name: string;
	channel_handle: string | null;
	thumbnail_url: string | null;
}

interface YouTubeStats {
	subscriber_count: number;
	view_count: number;
	video_count: number;
	recorded_date: string;
}

interface YouTubeVideo {
	id: number;
	video_id: string;
	title: string;
	thumbnail_url: string | null;
	published_at: string | null;
}

interface YouTubeVideoStats {
	view_count: number;
	like_count: number;
	comment_count: number;
}

// 開始日と周期から終了日を計算
function calculatePeriodEnd(startDate: string, repeatCycle: string): string {
	const start = new Date(startDate);
	const end = new Date(start);

	switch (repeatCycle) {
		case 'weekly':
			end.setDate(start.getDate() + 6);
			break;
		case 'monthly':
			end.setMonth(start.getMonth() + 1);
			end.setDate(end.getDate() - 1);
			break;
		case 'quarterly':
			end.setMonth(start.getMonth() + 3);
			end.setDate(end.getDate() - 1);
			break;
		case 'half_yearly':
			end.setMonth(start.getMonth() + 6);
			end.setDate(end.getDate() - 1);
			break;
		case 'yearly':
			end.setFullYear(start.getFullYear() + 1);
			end.setDate(end.getDate() - 1);
			break;
		default:
			end.setDate(start.getDate() + 6);
	}

	return end.toISOString().split('T')[0];
}

// 繰り返し周期から現在の期間を計算（既存のゴール用）
function getCurrentPeriodFromStart(startDate: string, repeatCycle: string): { start: string; end: string } {
	const originalStart = new Date(startDate);
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	// 周期の長さ（日数）
	let periodDays: number;
	switch (repeatCycle) {
		case 'weekly':
			periodDays = 7;
			break;
		case 'monthly':
			periodDays = 30; // 近似値
			break;
		case 'quarterly':
			periodDays = 91; // 近似値
			break;
		case 'half_yearly':
			periodDays = 182; // 近似値
			break;
		case 'yearly':
			periodDays = 365; // 近似値
			break;
		default:
			periodDays = 7;
	}

	// 開始日から現在まで何周期経過したか計算
	const daysSinceStart = Math.floor((today.getTime() - originalStart.getTime()) / (1000 * 60 * 60 * 24));
	const completedPeriods = Math.floor(daysSinceStart / periodDays);

	// 現在の周期の開始日を計算
	const currentPeriodStart = new Date(originalStart);
	currentPeriodStart.setDate(originalStart.getDate() + (completedPeriods * periodDays));

	// 終了日を計算
	const periodEnd = calculatePeriodEnd(currentPeriodStart.toISOString().split('T')[0], repeatCycle);

	return {
		start: currentPeriodStart.toISOString().split('T')[0],
		end: periodEnd
	};
}

// 繰り返し周期から現在の期間を計算
function getCurrentPeriod(repeatCycle: string): { start: string; end: string } {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	switch (repeatCycle) {
		case 'weekly': {
			// 月曜日始まり
			const day = today.getDay();
			const monday = new Date(today);
			monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
			const sunday = new Date(monday);
			sunday.setDate(monday.getDate() + 6);
			return {
				start: monday.toISOString().split('T')[0],
				end: sunday.toISOString().split('T')[0]
			};
		}
		case 'monthly': {
			const start = new Date(today.getFullYear(), today.getMonth(), 1);
			const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
			return {
				start: start.toISOString().split('T')[0],
				end: end.toISOString().split('T')[0]
			};
		}
		case 'quarterly': {
			const quarter = Math.floor(today.getMonth() / 3);
			const start = new Date(today.getFullYear(), quarter * 3, 1);
			const end = new Date(today.getFullYear(), quarter * 3 + 3, 0);
			return {
				start: start.toISOString().split('T')[0],
				end: end.toISOString().split('T')[0]
			};
		}
		case 'half_yearly': {
			const half = today.getMonth() < 6 ? 0 : 1;
			const start = new Date(today.getFullYear(), half * 6, 1);
			const end = new Date(today.getFullYear(), half * 6 + 6, 0);
			return {
				start: start.toISOString().split('T')[0],
				end: end.toISOString().split('T')[0]
			};
		}
		case 'yearly': {
			const start = new Date(today.getFullYear(), 0, 1);
			const end = new Date(today.getFullYear(), 11, 31);
			return {
				start: start.toISOString().split('T')[0],
				end: end.toISOString().split('T')[0]
			};
		}
		default:
			return { start: '', end: '' };
	}
}

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.userId) {
		throw redirect(303, '/login');
	}

	const projectId = parseInt(params.projectId);

	// ダッシュボードページにリダイレクト
	throw redirect(303, `/dashboard/projects/${projectId}/dashboard`);

	try {
		// プロジェクトの取得と所有権確認
		const project = await db
			.prepare('SELECT id, title, description, status, color FROM projects WHERE id = ? AND user_id = ?')
			.bind(projectId, userId)
			.first<Project>();

		if (!project) {
			throw error(404, 'プロジェクトが見つかりません');
		}

		// プロジェクトに紐づくタグを取得
		const projectTags = await db
			.prepare(`
				SELECT pt.id, pt.name, pt.color
				FROM project_tags pt
				JOIN project_tag_mappings ptm ON pt.id = ptm.tag_id
				WHERE ptm.project_id = ?
			`)
			.bind(projectId)
			.all<ProjectTag>();

		// 全タグを取得（選択用）
		const allTags = await db
			.prepare('SELECT id, name, color FROM project_tags WHERE user_id = ?')
			.bind(userId)
			.all<ProjectTag>();

		// KPI目標を取得
		const kpiGoals = await db
			.prepare('SELECT * FROM project_kpi_goals WHERE project_id = ? ORDER BY category, id')
			.bind(projectId)
			.all<KpiGoal>();

		// 各目標の実績と履歴を取得
		const goalsWithDetails = [];
		for (const goal of kpiGoals.results) {
			// 繰り返し期間の場合、ユーザー指定の開始日から現在の期間を計算
			let periodStart = goal.period_start;
			let periodEnd = goal.period_end;
			if (goal.repeat_cycle && goal.repeat_cycle !== 'none' && goal.period_start) {
				const currentPeriod = getCurrentPeriodFromStart(goal.period_start, goal.repeat_cycle);
				periodStart = currentPeriod.start;
				periodEnd = currentPeriod.end;
			}

			// 現在期間の実績を取得
			let recordsQuery = 'SELECT * FROM project_kpi_records WHERE goal_id = ?';
			const queryParams: (string | number)[] = [goal.id];

			if (periodStart && periodEnd) {
				recordsQuery += ' AND recorded_date >= ? AND recorded_date <= ?';
				queryParams.push(periodStart, periodEnd);
			}
			recordsQuery += ' ORDER BY recorded_date DESC LIMIT 10';

			const records = await db
				.prepare(recordsQuery)
				.bind(...queryParams)
				.all<KpiRecord>();

			// 現在期間の合計を計算
			let sumQuery = 'SELECT COALESCE(SUM(value), 0) as total FROM project_kpi_records WHERE goal_id = ?';
			const sumParams: (string | number)[] = [goal.id];
			if (periodStart && periodEnd) {
				sumQuery += ' AND recorded_date >= ? AND recorded_date <= ?';
				sumParams.push(periodStart, periodEnd);
			}
			const sumResult = await db.prepare(sumQuery).bind(...sumParams).first<{ total: number }>();

			// 過去の履歴を取得
			const history = await db
				.prepare('SELECT * FROM project_kpi_period_history WHERE goal_id = ? ORDER BY period_end DESC LIMIT 12')
				.bind(goal.id)
				.all<KpiPeriodHistory>();

			goalsWithDetails.push({
				...goal,
				current_period_start: periodStart,
				current_period_end: periodEnd,
				current_value: sumResult?.total || 0,
				records: records.results,
				history: history.results
			});
		}

		// プロジェクト専用ボードとドキュメントを取得
		const projectBoards = await db
			.prepare(`
				SELECT
					pb.id,
					pb.project_id,
					pb.title,
					pb.position,
					pb.created_at,
					(SELECT COUNT(*) FROM project_lists pl WHERE pl.project_board_id = pb.id) as list_count,
					(SELECT COUNT(*) FROM project_cards pc JOIN project_lists pl ON pc.project_list_id = pl.id WHERE pl.project_board_id = pb.id) as card_count
				FROM project_boards pb
				WHERE pb.project_id = ?
				ORDER BY pb.position
			`)
			.bind(projectId)
			.all<ProjectBoard>();

		// 各ボードのリストとカードを取得
		const boardsWithDetails = [];
		for (const board of projectBoards.results) {
			const lists = await db
				.prepare('SELECT id, project_board_id, title, position FROM project_lists WHERE project_board_id = ? ORDER BY position')
				.bind(board.id)
				.all<ProjectList>();

			const listsWithCards = [];
			for (const list of lists.results) {
				const cards = await db
					.prepare('SELECT id, project_list_id, title, description, due_date, position FROM project_cards WHERE project_list_id = ? ORDER BY position')
					.bind(list.id)
					.all<ProjectCard>();

				listsWithCards.push({
					...list,
					cards: cards.results
				});
			}

			boardsWithDetails.push({
				...board,
				lists: listsWithCards
			});
		}

		// プロジェクト専用ドキュメントを取得
		const projectDocuments = await db
			.prepare(`
				SELECT id, project_id, project_board_id, title, content, updated_at
				FROM project_documents
				WHERE project_id = ?
				ORDER BY updated_at DESC
				LIMIT 10
			`)
			.bind(projectId)
			.all<ProjectDocument>();

		// Discord設定を取得（テーブルが存在しない場合はnull）
		let discordSettings: DiscordSettings | null = null;
		try {
			discordSettings = await db
				.prepare('SELECT id, user_id, webhook_url, enabled FROM discord_settings WHERE user_id = ?')
				.bind(userId)
				.first<DiscordSettings>();
		} catch {
			// discord_settingsテーブルが存在しない場合は無視
		}

		// YouTube統計を取得（プロジェクトに紐づくチャンネル）
		let youtubeData: {
			channels: Array<YouTubeChannel & { stats: YouTubeStats | null; topVideos: Array<YouTubeVideo & { stats: YouTubeVideoStats | null }> }>;
			hasApiKey: boolean;
		} = { channels: [], hasApiKey: false };

		try {
			// APIキー設定を確認
			const ytSettings = await db
				.prepare('SELECT api_key FROM youtube_settings WHERE project_id = ?')
				.bind(projectId)
				.first<{ api_key: string | null }>();

			youtubeData.hasApiKey = !!ytSettings?.api_key;

			// プロジェクトに紐づくチャンネルを取得
			const channels = await db
				.prepare('SELECT id, channel_id, channel_name, channel_handle, thumbnail_url FROM youtube_channels WHERE project_id = ?')
				.bind(projectId)
				.all<YouTubeChannel>();

			for (const channel of channels.results) {
				// 最新の統計を取得
				const latestStats = await db
					.prepare('SELECT subscriber_count, view_count, video_count, recorded_date FROM youtube_stats WHERE channel_id = ? ORDER BY recorded_date DESC LIMIT 1')
					.bind(channel.id)
					.first<YouTubeStats>();

				// トップ5の動画を取得（再生回数順）
				const topVideos = await db
					.prepare(`
						SELECT v.id, v.video_id, v.title, v.thumbnail_url, v.published_at,
							   vs.view_count, vs.like_count, vs.comment_count
						FROM youtube_videos v
						LEFT JOIN youtube_video_stats vs ON v.id = vs.video_id
							AND vs.recorded_date = (SELECT MAX(recorded_date) FROM youtube_video_stats WHERE video_id = v.id)
						WHERE v.channel_id = ?
						ORDER BY vs.view_count DESC NULLS LAST
						LIMIT 5
					`)
					.bind(channel.id)
					.all<YouTubeVideo & YouTubeVideoStats>();

				youtubeData.channels.push({
					...channel,
					stats: latestStats || null,
					topVideos: topVideos.results.map(v => ({
						id: v.id,
						video_id: v.video_id,
						title: v.title,
						thumbnail_url: v.thumbnail_url,
						published_at: v.published_at,
						stats: v.view_count !== undefined ? {
							view_count: v.view_count,
							like_count: v.like_count,
							comment_count: v.comment_count
						} : null
					}))
				});
			}
		} catch {
			// youtube_*テーブルが存在しない場合は無視
		}

		// Instagram/Facebook統計を取得
		let instagramData: {
			account: { username: string; followers_count: number } | null;
			hasSettings: boolean;
		} = { account: null, hasSettings: false };
		let facebookData: {
			page: { name: string; fan_count: number } | null;
			hasSettings: boolean;
		} = { page: null, hasSettings: false };

		try {
			// Instagram設定を確認
			const igSettings = await db
				.prepare('SELECT instagram_business_account_id, facebook_page_id FROM instagram_settings WHERE project_id = ?')
				.bind(projectId)
				.first<{ instagram_business_account_id: string | null; facebook_page_id: string | null }>();

			if (igSettings?.instagram_business_account_id) {
				instagramData.hasSettings = true;
				// Instagramアカウント情報を取得
				const igAccount = await db
					.prepare('SELECT username FROM instagram_accounts WHERE project_id = ? ORDER BY created_at DESC LIMIT 1')
					.bind(projectId)
					.first<{ username: string }>();

				if (igAccount) {
					// 最新の統計を取得
					const igStats = await db
						.prepare(`
							SELECT followers_count
							FROM instagram_stats
							WHERE account_id = (SELECT id FROM instagram_accounts WHERE project_id = ? ORDER BY created_at DESC LIMIT 1)
							ORDER BY recorded_date DESC LIMIT 1
						`)
						.bind(projectId)
						.first<{ followers_count: number }>();

					instagramData.account = {
						username: igAccount.username,
						followers_count: igStats?.followers_count || 0
					};
				}
			}

			if (igSettings?.facebook_page_id) {
				facebookData.hasSettings = true;
				// Facebookページ情報を取得
				const fbPage = await db
					.prepare('SELECT name FROM facebook_pages WHERE project_id = ? ORDER BY created_at DESC LIMIT 1')
					.bind(projectId)
					.first<{ name: string }>();

				if (fbPage) {
					// 最新の統計を取得
					const fbStats = await db
						.prepare(`
							SELECT fan_count
							FROM facebook_stats
							WHERE page_id = (SELECT id FROM facebook_pages WHERE project_id = ? ORDER BY created_at DESC LIMIT 1)
							ORDER BY recorded_date DESC LIMIT 1
						`)
						.bind(projectId)
						.first<{ fan_count: number }>();

					facebookData.page = {
						name: fbPage.name,
						fan_count: fbStats?.fan_count || 0
					};
				}
			}
		} catch {
			// instagram_*テーブルが存在しない場合は無視
		}

		// 全ボードを取得（サイドバー表示用）
		const allBoards = await db
			.prepare(`
				SELECT
					pb.id,
					pb.project_id,
					pb.title,
					pb.position,
					pb.created_at,
					p.title as project_title,
					(SELECT COUNT(*) FROM project_lists pl WHERE pl.project_board_id = pb.id) as list_count,
					(SELECT COUNT(*) FROM project_cards pc JOIN project_lists pl ON pc.project_list_id = pl.id WHERE pl.project_board_id = pb.id) as card_count
				FROM project_boards pb
				LEFT JOIN projects p ON pb.project_id = p.id
				WHERE p.user_id = ?
				ORDER BY pb.created_at DESC
			`)
			.bind(userId)
			.all();

		// 全ドキュメントを取得（サイドバー表示用）
		const allDocuments = await db
			.prepare(`
				SELECT pd.id, pd.project_id, pd.title, pd.updated_at, p.title as project_title
				FROM project_documents pd
				LEFT JOIN projects p ON pd.project_id = p.id
				WHERE p.user_id = ?
				ORDER BY pd.updated_at DESC
			`)
			.bind(userId)
			.all();

		return {
			project,
			projectTags: projectTags.results,
			allTags: allTags.results,
			kpiGoals: goalsWithDetails,
			boards: boardsWithDetails,
			documents: projectDocuments.results,
			allBoards: allBoards.results,
			allDocuments: allDocuments.results,
			discordSettings: discordSettings ? {
				...discordSettings,
				enabled: Boolean(discordSettings.enabled)
			} : null,
			youtubeData,
			instagramData,
			facebookData
		};
	} catch (err) {
		if (err instanceof Response) {
			throw err;
		}
		console.error('Project load error:', err);
		throw error(500, 'プロジェクトの読み込みに失敗しました');
	}
};

export const actions: Actions = {
	updateProject: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const title = data.get('title')?.toString();
		const description = data.get('description')?.toString() || null;
		const color = data.get('color')?.toString();
		const status = data.get('status')?.toString();
		const tagIds = data.getAll('tag_ids').map(id => parseInt(id.toString()));

		if (!title) {
			return fail(400, { error: 'プロジェクト名を入力してください' });
		}

		try {
			const project = await db.prepare(
				'SELECT id FROM projects WHERE id = ? AND user_id = ?'
			)
				.bind(projectId, locals.userId)
				.first();

			if (!project) {
				return fail(403, { error: 'このプロジェクトへのアクセス権限がありません' });
			}

			await db.prepare(
				'UPDATE projects SET title = ?, description = ?, color = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
			)
				.bind(title, description, color || '#3B82F6', status || 'active', projectId)
				.run();

			// タグの更新
			await db.prepare('DELETE FROM project_tag_mappings WHERE project_id = ?')
				.bind(projectId)
				.run();

			for (const tagId of tagIds) {
				await db.prepare('INSERT INTO project_tag_mappings (project_id, tag_id) VALUES (?, ?)')
					.bind(projectId, tagId)
					.run();
			}

			return { success: true };
		} catch (err) {
			console.error('Update project error:', err);
			return fail(500, { error: 'プロジェクトの更新に失敗しました' });
		}
	},

	deleteProject: async ({ locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);

		try {
			const project = await db.prepare(
				'SELECT id FROM projects WHERE id = ? AND user_id = ?'
			)
				.bind(projectId, locals.userId)
				.first();

			if (!project) {
				return fail(403, { error: 'このプロジェクトへのアクセス権限がありません' });
			}

			await db.prepare('DELETE FROM projects WHERE id = ?')
				.bind(projectId)
				.run();

			throw redirect(303, '/dashboard');
		} catch (err) {
			if (err instanceof Response) {
				throw err;
			}
			console.error('Delete project error:', err);
			return fail(500, { error: 'プロジェクトの削除に失敗しました' });
		}
	},

	// ===== KPI目標管理 =====
	createKpiGoal: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const category = data.get('category')?.toString();
		const title = data.get('title')?.toString();
		const targetValue = parseFloat(data.get('target_value')?.toString() || '0');
		const unit = data.get('unit')?.toString() || '件';
		const repeatCycle = data.get('repeat_cycle')?.toString() || 'weekly';
		const startDate = data.get('start_date')?.toString();

		if (!category || !title) {
			return fail(400, { error: 'カテゴリとタイトルを入力してください' });
		}

		try {
			const project = await db.prepare(
				'SELECT id FROM projects WHERE id = ? AND user_id = ?'
			)
				.bind(projectId, locals.userId)
				.first();

			if (!project) {
				return fail(403, { error: 'このプロジェクトへのアクセス権限がありません' });
			}

			// 開始日から期間を計算（ユーザー指定の開始日を使用）
			let periodStart = startDate || new Date().toISOString().split('T')[0];
			let periodEnd = calculatePeriodEnd(periodStart, repeatCycle);

			await db.prepare(
				'INSERT INTO project_kpi_goals (project_id, category, title, target_value, unit, repeat_cycle, period_start, period_end) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
			)
				.bind(projectId, category, title, targetValue, unit, repeatCycle, periodStart, periodEnd)
				.run();

			return { success: true };
		} catch (err) {
			console.error('Create KPI goal error:', err);
			return fail(500, { error: 'KPI目標の作成に失敗しました' });
		}
	},

	updateKpiGoal: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const id = parseInt(data.get('id')?.toString() || '0');
		const title = data.get('title')?.toString();
		const targetValue = parseFloat(data.get('target_value')?.toString() || '0');
		const unit = data.get('unit')?.toString();
		const repeatCycle = data.get('repeat_cycle')?.toString();

		if (!id) {
			return fail(400, { error: 'IDが必要です' });
		}

		try {
			const project = await db.prepare(
				'SELECT id FROM projects WHERE id = ? AND user_id = ?'
			)
				.bind(projectId, locals.userId)
				.first();

			if (!project) {
				return fail(403, { error: 'このプロジェクトへのアクセス権限がありません' });
			}

			// 更新するフィールドを構築
			const updates: string[] = [];
			const values: (string | number)[] = [];

			if (title) {
				updates.push('title = ?');
				values.push(title);
			}
			if (targetValue !== undefined) {
				updates.push('target_value = ?');
				values.push(targetValue);
			}
			if (unit) {
				updates.push('unit = ?');
				values.push(unit);
			}
			if (repeatCycle) {
				updates.push('repeat_cycle = ?');
				values.push(repeatCycle);

				// 繰り返しの場合は期間を更新
				if (repeatCycle !== 'none') {
					const period = getCurrentPeriod(repeatCycle);
					updates.push('period_start = ?', 'period_end = ?');
					values.push(period.start, period.end);
				} else {
					updates.push('period_start = NULL', 'period_end = NULL');
				}
			}

			updates.push('updated_at = CURRENT_TIMESTAMP');
			values.push(id, projectId);

			await db.prepare(
				`UPDATE project_kpi_goals SET ${updates.join(', ')} WHERE id = ? AND project_id = ?`
			)
				.bind(...values)
				.run();

			return { success: true };
		} catch (err) {
			console.error('Update KPI goal error:', err);
			return fail(500, { error: 'KPI目標の更新に失敗しました' });
		}
	},

	deleteKpiGoal: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const id = data.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'IDが必要です' });
		}

		try {
			const project = await db.prepare(
				'SELECT id FROM projects WHERE id = ? AND user_id = ?'
			)
				.bind(projectId, locals.userId)
				.first();

			if (!project) {
				return fail(403, { error: 'このプロジェクトへのアクセス権限がありません' });
			}

			await db.prepare('DELETE FROM project_kpi_goals WHERE id = ? AND project_id = ?')
				.bind(parseInt(id), projectId)
				.run();

			return { success: true };
		} catch (err) {
			console.error('Delete KPI goal error:', err);
			return fail(500, { error: 'KPI目標の削除に失敗しました' });
		}
	},

	// ===== KPI実績記録 =====
	addKpiRecord: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const goalId = parseInt(data.get('goal_id')?.toString() || '0');
		const value = parseFloat(data.get('value')?.toString() || '0');
		const recordedDate = data.get('recorded_date')?.toString() || new Date().toISOString().split('T')[0];

		if (!goalId) {
			return fail(400, { error: '目標IDが必要です' });
		}

		try {
			const project = await db.prepare(
				'SELECT id FROM projects WHERE id = ? AND user_id = ?'
			)
				.bind(projectId, locals.userId)
				.first();

			if (!project) {
				return fail(403, { error: 'このプロジェクトへのアクセス権限がありません' });
			}

			// 実績を追加
			await db.prepare(
				'INSERT INTO project_kpi_records (goal_id, value, recorded_date) VALUES (?, ?, ?)'
			)
				.bind(goalId, value, recordedDate)
				.run();

			return { success: true };
		} catch (err) {
			console.error('Add KPI record error:', err);
			return fail(500, { error: '実績の記録に失敗しました' });
		}
	},

	// 期間を完了して履歴に保存
	completePeriod: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const goalId = parseInt(data.get('goal_id')?.toString() || '0');

		if (!goalId) {
			return fail(400, { error: '目標IDが必要です' });
		}

		try {
			const project = await db.prepare(
				'SELECT id FROM projects WHERE id = ? AND user_id = ?'
			)
				.bind(projectId, locals.userId)
				.first();

			if (!project) {
				return fail(403, { error: 'このプロジェクトへのアクセス権限がありません' });
			}

			// 目標を取得
			const goal = await db.prepare('SELECT * FROM project_kpi_goals WHERE id = ? AND project_id = ?')
				.bind(goalId, projectId)
				.first<KpiGoal>();

			if (!goal) {
				return fail(404, { error: '目標が見つかりません' });
			}

			// 現在の期間を計算
			const period = goal.repeat_cycle !== 'none' ? getCurrentPeriod(goal.repeat_cycle) : { start: goal.period_start, end: goal.period_end };

			if (!period.start || !period.end) {
				return fail(400, { error: '期間が設定されていません' });
			}

			// 現在期間の合計を計算
			const sumResult = await db.prepare(
				'SELECT COALESCE(SUM(value), 0) as total FROM project_kpi_records WHERE goal_id = ? AND recorded_date >= ? AND recorded_date <= ?'
			)
				.bind(goalId, period.start, period.end)
				.first<{ total: number }>();

			const achievedValue = sumResult?.total || 0;
			const achievementRate = goal.target_value > 0 ? (achievedValue / goal.target_value) * 100 : 0;

			// 履歴に保存
			await db.prepare(
				'INSERT INTO project_kpi_period_history (goal_id, period_start, period_end, target_value, achieved_value, achievement_rate) VALUES (?, ?, ?, ?, ?, ?)'
			)
				.bind(goalId, period.start, period.end, goal.target_value, achievedValue, achievementRate)
				.run();

			return { success: true };
		} catch (err) {
			console.error('Complete period error:', err);
			return fail(500, { error: '期間の完了に失敗しました' });
		}
	},

	// ===== ボードをプロジェクトに紐づけ =====
	linkBoard: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const boardId = data.get('board_id')?.toString();

		if (!boardId) {
			return fail(400, { error: 'ボードIDが必要です' });
		}

		try {
			const project = await db.prepare(
				'SELECT id FROM projects WHERE id = ? AND user_id = ?'
			)
				.bind(projectId, locals.userId)
				.first();

			if (!project) {
				return fail(403, { error: 'このプロジェクトへのアクセス権限がありません' });
			}

			await db.prepare(
				'UPDATE boards SET project_id = ? WHERE id = ? AND user_id = ?'
			)
				.bind(projectId, parseInt(boardId), locals.userId)
				.run();

			return { success: true };
		} catch (err) {
			console.error('Link board error:', err);
			return fail(500, { error: 'ボードの紐づけに失敗しました' });
		}
	},

	unlinkBoard: async ({ request, locals, platform }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const data = await request.formData();
		const boardId = data.get('board_id')?.toString();

		if (!boardId) {
			return fail(400, { error: 'ボードIDが必要です' });
		}

		try {
			await db.prepare(
				'UPDATE boards SET project_id = NULL WHERE id = ? AND user_id = ?'
			)
				.bind(parseInt(boardId), locals.userId)
				.run();

			return { success: true };
		} catch (err) {
			console.error('Unlink board error:', err);
			return fail(500, { error: 'ボードの紐づけ解除に失敗しました' });
		}
	},

	// ===== ドキュメント管理 =====
	createDocument: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const title = data.get('title')?.toString();

		if (!title) {
			return fail(400, { error: 'ドキュメント名を入力してください' });
		}

		try {
			const project = await db.prepare(
				'SELECT id FROM projects WHERE id = ? AND user_id = ?'
			)
				.bind(projectId, locals.userId)
				.first();

			if (!project) {
				return fail(403, { error: 'このプロジェクトへのアクセス権限がありません' });
			}

			await db.prepare(
				'INSERT INTO project_documents (project_id, title, content) VALUES (?, ?, ?)'
			)
				.bind(projectId, title, '')
				.run();

			return { success: true };
		} catch (err) {
			console.error('Create document error:', err);
			return fail(500, { error: 'ドキュメントの作成に失敗しました' });
		}
	},

	deleteDocument: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const docId = data.get('id')?.toString();

		if (!docId) {
			return fail(400, { error: 'ドキュメントIDが必要です' });
		}

		try {
			const project = await db.prepare(
				'SELECT id FROM projects WHERE id = ? AND user_id = ?'
			)
				.bind(projectId, locals.userId)
				.first();

			if (!project) {
				return fail(403, { error: 'このプロジェクトへのアクセス権限がありません' });
			}

			await db.prepare('DELETE FROM project_documents WHERE id = ? AND project_id = ?')
				.bind(parseInt(docId), projectId)
				.run();

			return { success: true };
		} catch (err) {
			console.error('Delete document error:', err);
			return fail(500, { error: 'ドキュメントの削除に失敗しました' });
		}
	},

	// ===== ボード作成 =====
	createBoard: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const title = data.get('title')?.toString();

		if (!title) {
			return fail(400, { error: 'ボード名を入力してください' });
		}

		try {
			const project = await db.prepare(
				'SELECT id FROM projects WHERE id = ? AND user_id = ?'
			)
				.bind(projectId, locals.userId)
				.first();

			if (!project) {
				return fail(403, { error: 'このプロジェクトへのアクセス権限がありません' });
			}

			// 最大positionを取得
			const maxPos = await db
				.prepare('SELECT MAX(position) as max_pos FROM project_boards WHERE project_id = ?')
				.bind(projectId)
				.first<{ max_pos: number | null }>();

			const position = (maxPos?.max_pos ?? -1) + 1;

			await db.prepare(
				'INSERT INTO project_boards (project_id, title, position) VALUES (?, ?, ?)'
			)
				.bind(projectId, title, position)
				.run();

			return { success: true };
		} catch (err) {
			console.error('Create board error:', err);
			return fail(500, { error: 'ボードの作成に失敗しました' });
		}
	},

	deleteBoard: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const boardId = data.get('id')?.toString();

		if (!boardId) {
			return fail(400, { error: 'ボードIDが必要です' });
		}

		try {
			const project = await db.prepare(
				'SELECT id FROM projects WHERE id = ? AND user_id = ?'
			)
				.bind(projectId, locals.userId)
				.first();

			if (!project) {
				return fail(403, { error: 'このプロジェクトへのアクセス権限がありません' });
			}

			await db.prepare('DELETE FROM project_boards WHERE id = ? AND project_id = ?')
				.bind(parseInt(boardId), projectId)
				.run();

			return { success: true };
		} catch (err) {
			console.error('Delete board error:', err);
			return fail(500, { error: 'ボードの削除に失敗しました' });
		}
	},

	// ===== リスト管理 =====
	createList: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const title = data.get('title')?.toString();
		const boardId = parseInt(data.get('board_id')?.toString() || '0');

		if (!title || !boardId) {
			return fail(400, { error: 'リスト名とボードIDが必要です' });
		}

		try {
			const project = await db.prepare(
				'SELECT id FROM projects WHERE id = ? AND user_id = ?'
			)
				.bind(projectId, locals.userId)
				.first();

			if (!project) {
				return fail(403, { error: 'このプロジェクトへのアクセス権限がありません' });
			}

			// 最大positionを取得
			const maxPos = await db
				.prepare('SELECT MAX(position) as max_pos FROM project_lists WHERE project_board_id = ?')
				.bind(boardId)
				.first<{ max_pos: number | null }>();

			const position = (maxPos?.max_pos ?? -1) + 1;

			await db.prepare(
				'INSERT INTO project_lists (project_board_id, title, position) VALUES (?, ?, ?)'
			)
				.bind(boardId, title, position)
				.run();

			return { success: true };
		} catch (err) {
			console.error('Create list error:', err);
			return fail(500, { error: 'リストの作成に失敗しました' });
		}
	},

	deleteList: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const listId = parseInt(data.get('id')?.toString() || '0');

		if (!listId) {
			return fail(400, { error: 'リストIDが必要です' });
		}

		try {
			const project = await db.prepare(
				'SELECT id FROM projects WHERE id = ? AND user_id = ?'
			)
				.bind(projectId, locals.userId)
				.first();

			if (!project) {
				return fail(403, { error: 'このプロジェクトへのアクセス権限がありません' });
			}

			await db.prepare('DELETE FROM project_lists WHERE id = ?')
				.bind(listId)
				.run();

			return { success: true };
		} catch (err) {
			console.error('Delete list error:', err);
			return fail(500, { error: 'リストの削除に失敗しました' });
		}
	},

	// ===== カード管理 =====
	createCard: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const title = data.get('title')?.toString();
		const listId = parseInt(data.get('list_id')?.toString() || '0');

		if (!title || !listId) {
			return fail(400, { error: 'カード名とリストIDが必要です' });
		}

		try {
			const project = await db.prepare(
				'SELECT id FROM projects WHERE id = ? AND user_id = ?'
			)
				.bind(projectId, locals.userId)
				.first();

			if (!project) {
				return fail(403, { error: 'このプロジェクトへのアクセス権限がありません' });
			}

			// 最大positionを取得
			const maxPos = await db
				.prepare('SELECT MAX(position) as max_pos FROM project_cards WHERE project_list_id = ?')
				.bind(listId)
				.first<{ max_pos: number | null }>();

			const position = (maxPos?.max_pos ?? -1) + 1;

			await db.prepare(
				'INSERT INTO project_cards (project_list_id, title, position) VALUES (?, ?, ?)'
			)
				.bind(listId, title, position)
				.run();

			return { success: true };
		} catch (err) {
			console.error('Create card error:', err);
			return fail(500, { error: 'カードの作成に失敗しました' });
		}
	},

	updateCard: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const cardId = parseInt(data.get('id')?.toString() || '0');
		const title = data.get('title')?.toString();
		const description = data.get('description')?.toString();
		const dueDate = data.get('due_date')?.toString();

		if (!cardId) {
			return fail(400, { error: 'カードIDが必要です' });
		}

		try {
			const project = await db.prepare(
				'SELECT id FROM projects WHERE id = ? AND user_id = ?'
			)
				.bind(projectId, locals.userId)
				.first();

			if (!project) {
				return fail(403, { error: 'このプロジェクトへのアクセス権限がありません' });
			}

			await db.prepare(
				'UPDATE project_cards SET title = ?, description = ?, due_date = ? WHERE id = ?'
			)
				.bind(title || '', description || null, dueDate || null, cardId)
				.run();

			return { success: true };
		} catch (err) {
			console.error('Update card error:', err);
			return fail(500, { error: 'カードの更新に失敗しました' });
		}
	},

	deleteCard: async ({ request, locals, platform, params }) => {
		if (!locals.userId) {
			return fail(401, { error: '認証が必要です' });
		}

		const db = getDB(platform);
		const projectId = parseInt(params.projectId);
		const data = await request.formData();
		const cardId = parseInt(data.get('id')?.toString() || '0');

		if (!cardId) {
			return fail(400, { error: 'カードIDが必要です' });
		}

		try {
			const project = await db.prepare(
				'SELECT id FROM projects WHERE id = ? AND user_id = ?'
			)
				.bind(projectId, locals.userId)
				.first();

			if (!project) {
				return fail(403, { error: 'このプロジェクトへのアクセス権限がありません' });
			}

			await db.prepare('DELETE FROM project_cards WHERE id = ?')
				.bind(cardId)
				.run();

			return { success: true };
		} catch (err) {
			console.error('Delete card error:', err);
			return fail(500, { error: 'カードの削除に失敗しました' });
		}
	}
};
