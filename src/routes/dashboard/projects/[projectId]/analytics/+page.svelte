<script lang="ts">
	import { BarChart3, TrendingUp, Users, Eye, Heart, MessageCircle, Calendar, Table, Settings, Video, ThumbsUp, PlayCircle, ExternalLink, Key, Plus, Trash2, RefreshCw, Download } from 'lucide-svelte';
	import type { PageData, ActionData } from './$types';
	import { onMount } from 'svelte';
	import Chart from 'chart.js/auto';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type Tab = 'twitter' | 'instagram' | 'tiktok' | 'youtube';
	let activeTab = $state<Tab>('twitter');

	// Twitter分析用の状態
	type Period = 7 | 30 | 90;
	let selectedPeriod = $state<Period>(30);
	let chartCanvas: HTMLCanvasElement | null = $state(null);
	let chart: Chart | null = null;
	type ViewMode = 'chart' | 'table';
	let viewMode = $state<ViewMode>('chart');

	// YouTube分析用の状態
	let youtubeChartInstances = $state<Map<number, Chart>>(new Map());
	let selectedYoutubeChannel = $state<number>(0);

	// YouTube管理用の状態
	let showYouTubeApiKeyForm = $state(false);
	let showAddYouTubeChannel = $state(false);
	let youtubeLoading = $state(false);

	// Twitter管理用の状態
	let twitterLoading = $state(false);

	function formatNumber(num: number): string {
		if (num >= 1000000) {
			return (num / 1000000).toFixed(1) + 'M';
		} else if (num >= 1000) {
			return (num / 1000).toFixed(1) + 'K';
		}
		return num.toString();
	}

	function getChangeColor(change: number): string {
		if (change > 0) return 'text-emerald-600';
		if (change < 0) return 'text-red-600';
		return 'text-gray-600';
	}

	function getChangeIcon(change: number): string {
		if (change > 0) return '↑';
		if (change < 0) return '↓';
		return '→';
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return `${date.getMonth() + 1}/${date.getDate()}`;
	}

	function formatFullDate(dateString: string): string {
		const date = new Date(dateString);
		return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
	}

	// YouTube管理フォーム送信ハンドラー
	function handleYouTubeFormSubmit() {
		youtubeLoading = true;
		return async ({ result, update }: any) => {
			youtubeLoading = false;
			await update();
			if (result.type === 'success') {
				showYouTubeApiKeyForm = false;
				showAddYouTubeChannel = false;
				await invalidateAll();
			}
		};
	}

	// Twitter管理フォーム送信ハンドラー
	function handleTwitterFormSubmit() {
		twitterLoading = true;
		return async ({ result, update }: any) => {
			twitterLoading = false;
			await update();
			if (result.type === 'success') {
				await invalidateAll();
			}
		};
	}

	// グラフ用データのフィルタリング
	$effect(() => {
		if (activeTab === 'twitter' && data.twitter.stats && chartCanvas) {
			const filteredStats = data.twitter.stats.slice(0, selectedPeriod).reverse();

			if (chart) {
				chart.destroy();
			}

			const ctx = chartCanvas.getContext('2d');
			if (!ctx) return;

			chart = new Chart(ctx, {
				type: 'line',
				data: {
					labels: filteredStats.map((stat: any) => formatDate(stat.recorded_date)),
					datasets: [
						{
							label: 'フォロワー数',
							data: filteredStats.map((stat: any) => stat.followers_count),
							borderColor: 'rgb(59, 130, 246)',
							backgroundColor: 'rgba(59, 130, 246, 0.1)',
							tension: 0.3,
							fill: true
						},
						{
							label: 'ツイート数',
							data: filteredStats.map((stat: any) => stat.tweet_count),
							borderColor: 'rgb(168, 85, 247)',
							backgroundColor: 'rgba(168, 85, 247, 0.1)',
							tension: 0.3,
							fill: true,
							yAxisID: 'y1'
						}
					]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					interaction: {
						mode: 'index',
						intersect: false
					},
					plugins: {
						legend: {
							position: 'top'
						},
						tooltip: {
							callbacks: {
								label: function(context) {
									let label = context.dataset.label || '';
									if (label) {
										label += ': ';
									}
									label += formatNumber(context.parsed.y);
									return label;
								}
							}
						}
					},
					scales: {
						y: {
							type: 'linear',
							display: true,
							position: 'left',
							title: {
								display: true,
								text: 'フォロワー数'
							}
						},
						y1: {
							type: 'linear',
							display: true,
							position: 'right',
							title: {
								display: true,
								text: 'ツイート数'
							},
							grid: {
								drawOnChartArea: false
							}
						}
					}
				}
			});
		}
	});

	// YouTube用のグラフ初期化関数
	function initYoutubeChart(canvas: HTMLCanvasElement, channelId: number) {
		const channel = data.youtube.channels.find((c: any) => c.id === channelId);
		if (!channel || channel.statsHistory.length < 2) return;

		// 既存のチャートを削除
		const existingChart = youtubeChartInstances.get(channelId);
		if (existingChart) {
			existingChart.destroy();
		}

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const newChart = new Chart(ctx, {
			type: 'line',
			data: {
				labels: channel.statsHistory.map((s: any) => formatDate(s.recorded_date)),
				datasets: [
					{
						label: '登録者数',
						data: channel.statsHistory.map((s: any) => s.subscriber_count),
						borderColor: 'rgb(239, 68, 68)',
						backgroundColor: 'rgba(239, 68, 68, 0.1)',
						fill: true,
						tension: 0.4,
						yAxisID: 'y'
					},
					{
						label: '再生数',
						data: channel.statsHistory.map((s: any) => s.view_count),
						borderColor: 'rgb(59, 130, 246)',
						backgroundColor: 'rgba(59, 130, 246, 0.1)',
						fill: true,
						tension: 0.4,
						yAxisID: 'y1'
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: {
					mode: 'index',
					intersect: false
				},
				plugins: {
					legend: {
						position: 'top'
					}
				},
				scales: {
					y: {
						type: 'linear',
						display: true,
						position: 'left',
						title: {
							display: true,
							text: '登録者数'
						},
						ticks: {
							callback: (value: any) => formatNumber(value)
						}
					},
					y1: {
						type: 'linear',
						display: true,
						position: 'right',
						title: {
							display: true,
							text: '再生数'
						},
						grid: {
							drawOnChartArea: false
						},
						ticks: {
							callback: (value: any) => formatNumber(value)
						}
					}
				}
			}
		});

		youtubeChartInstances.set(channelId, newChart);
	}

	function formatDuration(duration: string | null): string {
		if (!duration) return '';
		const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
		if (!match) return duration;
		const [, h, m, s] = match;
		const parts = [];
		if (h) parts.push(h + ':');
		if (m) parts.push(m.padStart(h ? 2 : 1, '0') + ':');
		else if (h) parts.push('00:');
		if (s) parts.push(s.padStart(2, '0'));
		else parts.push('00');
		return parts.join('');
	}

	onMount(() => {
		// 最初のYouTubeチャンネルを選択
		if (data.youtube.channels.length > 0) {
			selectedYoutubeChannel = data.youtube.channels[0].id;
		}

		return () => {
			if (chart) {
				chart.destroy();
			}
			youtubeChartInstances.forEach((c) => c.destroy());
		};
	});
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-100 p-6">
	<div class="max-w-7xl mx-auto">
		<!-- ヘッダー -->
		<div class="mb-6">
			<div class="flex items-center gap-2 text-sm text-gray-600 mb-2">
				<a href="/dashboard/projects" class="hover:text-indigo-600">プロジェクト</a>
				<span>/</span>
				<a href="/dashboard/projects/{data.project.id}" class="hover:text-indigo-600">
					{data.project.title}
				</a>
				<span>/</span>
				<span class="text-gray-900">SNS分析</span>
			</div>
			<div class="flex items-center gap-3">
				<BarChart3 size={32} class="text-indigo-600" />
				<h1 class="text-3xl font-bold text-gray-900">SNS分析</h1>
			</div>
			<p class="text-gray-600 mt-2">各SNSプラットフォームのアナリティクスを確認できます</p>
		</div>

		<!-- タブ -->
		<div class="bg-white rounded-xl shadow-md mb-6">
			<div class="flex border-b border-gray-200">
				<button
					onclick={() => activeTab = 'twitter'}
					class="flex-1 px-6 py-4 text-center font-medium transition-colors relative
						{activeTab === 'twitter' ? 'text-sky-600' : 'text-gray-600 hover:text-gray-900'}"
				>
					Twitter / X
					{#if activeTab === 'twitter'}
						<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600"></div>
					{/if}
				</button>
				<button
					onclick={() => activeTab = 'instagram'}
					class="flex-1 px-6 py-4 text-center font-medium transition-colors relative
						{activeTab === 'instagram' ? 'text-pink-600' : 'text-gray-600 hover:text-gray-900'}"
				>
					Instagram
					{#if activeTab === 'instagram'}
						<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-600"></div>
					{/if}
				</button>
				<button
					onclick={() => activeTab = 'tiktok'}
					class="flex-1 px-6 py-4 text-center font-medium transition-colors relative
						{activeTab === 'tiktok' ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'}"
				>
					TikTok
					{#if activeTab === 'tiktok'}
						<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"></div>
					{/if}
				</button>
				<button
					onclick={() => activeTab = 'youtube'}
					class="flex-1 px-6 py-4 text-center font-medium transition-colors relative
						{activeTab === 'youtube' ? 'text-red-600' : 'text-gray-600 hover:text-gray-900'}"
				>
					YouTube
					{#if activeTab === 'youtube'}
						<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600"></div>
					{/if}
				</button>
			</div>
		</div>

		<!-- Twitter分析 -->
		{#if activeTab === 'twitter'}
			<div class="space-y-6">
				{#if data.twitter.latest}
					<!-- サマリーカード -->
					<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div class="bg-white rounded-xl shadow-md p-6">
							<div class="flex items-center justify-between mb-2">
								<div class="text-sm text-gray-600">フォロワー数</div>
								<Users size={20} class="text-sky-600" />
							</div>
							<div class="text-3xl font-bold text-gray-900">
								{formatNumber(data.twitter.latest.followers_count)}
							</div>
							<div class="text-sm {getChangeColor(data.twitter.latest.follower_change)} mt-1">
								{getChangeIcon(data.twitter.latest.follower_change)} {Math.abs(data.twitter.latest.follower_change)}
							</div>
						</div>

						<div class="bg-white rounded-xl shadow-md p-6">
							<div class="flex items-center justify-between mb-2">
								<div class="text-sm text-gray-600">フォロー数</div>
								<Users size={20} class="text-sky-600" />
							</div>
							<div class="text-3xl font-bold text-gray-900">
								{formatNumber(data.twitter.latest.following_count)}
							</div>
							<div class="text-sm {getChangeColor(data.twitter.latest.following_change)} mt-1">
								{getChangeIcon(data.twitter.latest.following_change)} {Math.abs(data.twitter.latest.following_change)}
							</div>
						</div>

						<div class="bg-white rounded-xl shadow-md p-6">
							<div class="flex items-center justify-between mb-2">
								<div class="text-sm text-gray-600">総ツイート数</div>
								<MessageCircle size={20} class="text-sky-600" />
							</div>
							<div class="text-3xl font-bold text-gray-900">
								{formatNumber(data.twitter.latest.tweet_count)}
							</div>
							<div class="text-sm {getChangeColor(data.twitter.latest.tweet_change)} mt-1">
								{getChangeIcon(data.twitter.latest.tweet_change)} {Math.abs(data.twitter.latest.tweet_change)}
							</div>
						</div>
					</div>

					<!-- API データ取得ボタン -->
					<div class="bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl shadow-md p-6 border-2 border-sky-200">
						<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
							<RefreshCw size={20} class="text-sky-600" />
							Twitter APIからデータ取得
						</h3>
						<div class="flex gap-3">
							<form method="POST" action="?/refreshTwitterStats" use:enhance={handleTwitterFormSubmit}>
								<button
									type="submit"
									disabled={twitterLoading}
									class="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{#if twitterLoading}
										<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
									{:else}
										<RefreshCw size={18} />
									{/if}
									統計を更新
								</button>
							</form>
							<form method="POST" action="?/fetchTwitterTweets" use:enhance={handleTwitterFormSubmit}>
								<button
									type="submit"
									disabled={twitterLoading}
									class="flex items-center gap-2 px-4 py-2 border border-sky-600 text-sky-600 rounded-lg hover:bg-sky-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{#if twitterLoading}
										<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-sky-600"></div>
									{:else}
										<Download size={18} />
									{/if}
									ツイートを取得
								</button>
							</form>
						</div>
						<p class="text-xs text-gray-600 mt-3">
							※ まず「統計を更新」でアカウント情報を取得してから、「ツイートを取得」で最新100件のツイートを取得します
						</p>
					</div>

					<!-- 実際の投稿頻度分析（新規） -->
					{#if data.twitter.postFrequency}
						<div class="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl shadow-md p-6 border-2 border-emerald-200">
							<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
								<Calendar size={20} class="text-emerald-600" />
								投稿頻度分析（実際の投稿データ）
							</h3>
							<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
								<!-- 今日の投稿 -->
								<div class="bg-white rounded-lg p-4">
									<div class="text-sm text-gray-600 mb-1">今日の投稿</div>
									<div class="text-3xl font-bold text-emerald-600">{data.twitter.postFrequency.todayPosts}</div>
									<div class="text-xs text-gray-500 mt-2">
										平均: {data.twitter.postFrequency.avgPerDay.toFixed(1)}件/日
									</div>
									{#if data.twitter.postFrequency.todayPosts > data.twitter.postFrequency.avgPerDay}
										<div class="text-xs text-emerald-600 mt-1">
											📈 平均より {(data.twitter.postFrequency.todayPosts - data.twitter.postFrequency.avgPerDay).toFixed(1)}件多い
										</div>
									{:else if data.twitter.postFrequency.todayPosts < data.twitter.postFrequency.avgPerDay}
										<div class="text-xs text-amber-600 mt-1">
											📉 平均より {(data.twitter.postFrequency.avgPerDay - data.twitter.postFrequency.todayPosts).toFixed(1)}件少ない
										</div>
									{:else}
										<div class="text-xs text-gray-600 mt-1">
											➡️ 平均と同じ
										</div>
									{/if}
								</div>

								<!-- 今週の投稿 -->
								<div class="bg-white rounded-lg p-4">
									<div class="text-sm text-gray-600 mb-1">今週の投稿</div>
									<div class="text-3xl font-bold text-blue-600">{data.twitter.postFrequency.weekPosts}</div>
									<div class="text-xs text-gray-500 mt-2">
										平均: {data.twitter.postFrequency.avgPerWeek.toFixed(1)}件/週
									</div>
									{#if data.twitter.postFrequency.weekPosts > data.twitter.postFrequency.avgPerWeek}
										<div class="text-xs text-emerald-600 mt-1">
											📈 平均より {(data.twitter.postFrequency.weekPosts - data.twitter.postFrequency.avgPerWeek).toFixed(1)}件多い
										</div>
									{:else if data.twitter.postFrequency.weekPosts < data.twitter.postFrequency.avgPerWeek}
										<div class="text-xs text-amber-600 mt-1">
											📉 平均より {(data.twitter.postFrequency.avgPerWeek - data.twitter.postFrequency.weekPosts).toFixed(1)}件少ない
										</div>
									{:else}
										<div class="text-xs text-gray-600 mt-1">
											➡️ 平均と同じ
										</div>
									{/if}
								</div>

								<!-- 今月の投稿 -->
								<div class="bg-white rounded-lg p-4">
									<div class="text-sm text-gray-600 mb-1">今月の投稿</div>
									<div class="text-3xl font-bold text-purple-600">{data.twitter.postFrequency.monthPosts}</div>
									<div class="text-xs text-gray-500 mt-2">
										平均: {data.twitter.postFrequency.avgPerMonth.toFixed(1)}件/月
									</div>
									{#if data.twitter.postFrequency.monthPosts > data.twitter.postFrequency.avgPerMonth}
										<div class="text-xs text-emerald-600 mt-1">
											📈 平均より {(data.twitter.postFrequency.monthPosts - data.twitter.postFrequency.avgPerMonth).toFixed(1)}件多い
										</div>
									{:else if data.twitter.postFrequency.monthPosts < data.twitter.postFrequency.avgPerMonth}
										<div class="text-xs text-amber-600 mt-1">
											📉 平均より {(data.twitter.postFrequency.avgPerMonth - data.twitter.postFrequency.monthPosts).toFixed(1)}件少ない
										</div>
									{:else}
										<div class="text-xs text-gray-600 mt-1">
											➡️ 平均と同じ
										</div>
									{/if}
								</div>
							</div>

							<!-- 統計サマリー -->
							<div class="bg-white rounded-lg p-4">
								<div class="text-sm font-medium text-gray-700 mb-3">全期間の統計</div>
								<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
									<div>
										<div class="text-gray-600">総投稿数</div>
										<div class="font-semibold text-gray-900">{data.twitter.postFrequency.totalPosts}件</div>
									</div>
									<div>
										<div class="text-gray-600">計測期間</div>
										<div class="font-semibold text-gray-900">{data.twitter.postFrequency.totalDays}日間</div>
									</div>
									<div>
										<div class="text-gray-600">1日平均</div>
										<div class="font-semibold text-gray-900">{data.twitter.postFrequency.avgPerDay.toFixed(2)}件</div>
									</div>
									<div>
										<div class="text-gray-600">1週間平均</div>
										<div class="font-semibold text-gray-900">{data.twitter.postFrequency.avgPerWeek.toFixed(2)}件</div>
									</div>
								</div>
							</div>
						</div>
					{/if}

					<!-- 投稿頻度分析カード -->
					{#if data.twitter.stats.length >= 2}
						{@const filteredStats = data.twitter.stats.slice(0, selectedPeriod)}
						{@const oldestStat = filteredStats[filteredStats.length - 1]}
						{@const latestStat = filteredStats[0]}
						{@const periodTweets = latestStat.tweet_count - oldestStat.tweet_count}
						{@const periodDays = filteredStats.length}
						{@const avgPerDay = periodDays > 0 ? (periodTweets / periodDays).toFixed(1) : '0'}
						{@const avgPerWeek = periodDays > 0 ? (periodTweets / periodDays * 7).toFixed(1) : '0'}
						{@const avgPerMonth = periodDays > 0 ? (periodTweets / periodDays * 30).toFixed(1) : '0'}

						<div class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-md p-6 border-2 border-purple-200">
							<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
								<TrendingUp size={20} class="text-purple-600" />
								投稿頻度分析（直近{selectedPeriod}日間）
							</h3>
							<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
								<div class="bg-white rounded-lg p-4">
									<div class="text-sm text-gray-600 mb-1">期間内投稿数</div>
									<div class="text-2xl font-bold text-purple-600">{periodTweets}</div>
									<div class="text-xs text-gray-500 mt-1">ツイート</div>
								</div>
								<div class="bg-white rounded-lg p-4">
									<div class="text-sm text-gray-600 mb-1">1日平均</div>
									<div class="text-2xl font-bold text-blue-600">{avgPerDay}</div>
									<div class="text-xs text-gray-500 mt-1">ツイート/日</div>
								</div>
								<div class="bg-white rounded-lg p-4">
									<div class="text-sm text-gray-600 mb-1">1週間平均</div>
									<div class="text-2xl font-bold text-indigo-600">{avgPerWeek}</div>
									<div class="text-xs text-gray-500 mt-1">ツイート/週</div>
								</div>
								<div class="bg-white rounded-lg p-4">
									<div class="text-sm text-gray-600 mb-1">1ヶ月平均</div>
									<div class="text-2xl font-bold text-pink-600">{avgPerMonth}</div>
									<div class="text-xs text-gray-500 mt-1">ツイート/月</div>
								</div>
							</div>
						</div>
					{/if}

					<!-- 投稿履歴 -->
					{#if data.twitter.posts && data.twitter.posts.length > 0}
						<div class="bg-white rounded-xl shadow-md p-6">
							<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
								<MessageCircle size={20} class="text-sky-600" />
								投稿履歴（最新50件）
							</h3>
							<div class="space-y-3 max-h-96 overflow-y-auto">
								{#each data.twitter.posts as post}
									<div class="p-4 border border-gray-200 rounded-lg hover:border-sky-300 transition-colors">
										<div class="flex items-center justify-between gap-2 mb-2">
											<div class="flex items-center gap-2">
												<span class="text-sm text-gray-600">{formatDate(post.posted_at)}</span>
												{#if post.tweet_id && post.username}
													<a
														href="https://twitter.com/{post.username}/status/{post.tweet_id}"
														target="_blank"
														rel="noopener noreferrer"
														class="text-xs text-sky-600 hover:underline"
													>
														Twitterで表示
													</a>
												{/if}
											</div>
											<div class="flex items-center gap-3 text-xs text-gray-600">
												{#if post.impression_count > 0}
													<span title="閲覧数" class="flex items-center gap-1">
														<Eye size={14} />
														{formatNumber(post.impression_count)}
													</span>
												{/if}
												{#if post.like_count > 0}
													<span title="いいね" class="flex items-center gap-1">
														<Heart size={14} class="text-red-500" />
														{formatNumber(post.like_count)}
													</span>
												{/if}
												{#if post.retweet_count > 0}
													<span title="リツイート" class="flex items-center gap-1">
														<RefreshCw size={14} class="text-green-500" />
														{formatNumber(post.retweet_count)}
													</span>
												{/if}
												{#if post.reply_count > 0}
													<span title="リプライ" class="flex items-center gap-1">
														<MessageCircle size={14} class="text-blue-500" />
														{formatNumber(post.reply_count)}
													</span>
												{/if}
												{#if post.quote_count > 0}
													<span title="引用" class="flex items-center gap-1">
														<MessageCircle size={14} class="text-purple-500" />
														{formatNumber(post.quote_count)}
													</span>
												{/if}
											</div>
										</div>
										<p class="text-gray-800">{post.content}</p>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- コントロールバー -->
					<div class="bg-white rounded-xl shadow-md p-4">
						<div class="flex items-center justify-between flex-wrap gap-4">
							<div class="flex items-center gap-2">
								<span class="text-sm text-gray-600">表示期間:</span>
								<div class="flex gap-2">
									<button
										onclick={() => selectedPeriod = 7}
										class="px-4 py-2 rounded-lg transition-colors {selectedPeriod === 7 ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
									>
										7日間
									</button>
									<button
										onclick={() => selectedPeriod = 30}
										class="px-4 py-2 rounded-lg transition-colors {selectedPeriod === 30 ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
									>
										30日間
									</button>
									<button
										onclick={() => selectedPeriod = 90}
										class="px-4 py-2 rounded-lg transition-colors {selectedPeriod === 90 ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
									>
										90日間
									</button>
								</div>
							</div>
							<div class="flex items-center gap-2">
								<span class="text-sm text-gray-600">表示形式:</span>
								<div class="flex gap-2">
									<button
										onclick={() => viewMode = 'chart'}
										class="px-4 py-2 rounded-lg transition-colors flex items-center gap-2 {viewMode === 'chart' ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
									>
										<TrendingUp size={16} />
										グラフ
									</button>
									<button
										onclick={() => viewMode = 'table'}
										class="px-4 py-2 rounded-lg transition-colors flex items-center gap-2 {viewMode === 'table' ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
									>
										<Table size={16} />
										テーブル
									</button>
								</div>
							</div>
						</div>
					</div>

					<!-- グラフ表示 -->
					{#if viewMode === 'chart'}
						<div class="bg-white rounded-xl shadow-md p-6">
							<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
								<TrendingUp size={20} class="text-sky-600" />
								統計推移グラフ
							</h3>
							<div class="h-96">
								<canvas bind:this={chartCanvas}></canvas>
							</div>
						</div>
					{/if}

					<!-- テーブル表示 -->
					{#if viewMode === 'table'}
						<div class="bg-white rounded-xl shadow-md p-6">
							<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
								<Calendar size={20} class="text-sky-600" />
								詳細統計データ（直近{selectedPeriod}日間）
							</h3>
							<div class="overflow-x-auto">
								<table class="w-full">
									<thead>
										<tr class="border-b-2 border-gray-200">
											<th class="text-left py-3 px-4 text-gray-600 font-semibold">日付</th>
											<th class="text-right py-3 px-4 text-gray-600 font-semibold">フォロワー数</th>
											<th class="text-right py-3 px-4 text-gray-600 font-semibold">増減</th>
											<th class="text-right py-3 px-4 text-gray-600 font-semibold">フォロー数</th>
											<th class="text-right py-3 px-4 text-gray-600 font-semibold">増減</th>
											<th class="text-right py-3 px-4 text-gray-600 font-semibold">ツイート数</th>
											<th class="text-right py-3 px-4 text-gray-600 font-semibold">増減</th>
										</tr>
									</thead>
									<tbody>
										{#each data.twitter.stats.slice(0, selectedPeriod) as stat, index}
											<tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
												<td class="py-3 px-4 font-medium text-gray-900">
													{formatFullDate(stat.recorded_date)}
												</td>
												<td class="py-3 px-4 text-right font-semibold text-gray-900">
													{formatNumber(stat.followers_count)}
												</td>
												<td class="py-3 px-4 text-right {getChangeColor(stat.follower_change)}">
													{#if stat.follower_change !== 0}
														{getChangeIcon(stat.follower_change)} {Math.abs(stat.follower_change)}
													{:else}
														-
													{/if}
												</td>
												<td class="py-3 px-4 text-right font-semibold text-gray-900">
													{formatNumber(stat.following_count)}
												</td>
												<td class="py-3 px-4 text-right {getChangeColor(stat.following_change)}">
													{#if stat.following_change !== 0}
														{getChangeIcon(stat.following_change)} {Math.abs(stat.following_change)}
													{:else}
														-
													{/if}
												</td>
												<td class="py-3 px-4 text-right font-semibold text-gray-900">
													{formatNumber(stat.tweet_count)}
												</td>
												<td class="py-3 px-4 text-right {getChangeColor(stat.tweet_change)}">
													{#if stat.tweet_change !== 0}
														{getChangeIcon(stat.tweet_change)} {Math.abs(stat.tweet_change)}
													{:else}
														-
													{/if}
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					{/if}

					<!-- アカウント情報 -->
					<div class="bg-white rounded-xl shadow-md p-6">
						<h3 class="text-lg font-semibold text-gray-800 mb-4">アカウント情報</h3>
						<div class="space-y-2">
							<div class="flex items-center gap-2">
								<span class="text-gray-600">ユーザー名:</span>
								<span class="font-medium">@{data.twitter.latest.username}</span>
							</div>
							{#if data.twitter.latest.display_name}
								<div class="flex items-center gap-2">
									<span class="text-gray-600">表示名:</span>
									<span class="font-medium">{data.twitter.latest.display_name}</span>
								</div>
							{/if}
							<div class="flex items-center gap-2">
								<span class="text-gray-600">最終更新:</span>
								<span class="font-medium">{formatFullDate(data.twitter.latest.recorded_date)}</span>
							</div>
						</div>
					</div>
				{:else}
					<div class="bg-white rounded-xl shadow-md p-12 text-center">
						<Users size={48} class="text-gray-400 mx-auto mb-4" />
						<p class="text-gray-600">Twitterアカウントが連携されていません</p>
						<a
							href="/dashboard/projects/{data.project.id}/twitter"
							class="inline-block mt-4 px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
						>
							連携する
						</a>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Instagram分析 -->
		{#if activeTab === 'instagram'}
			<div class="space-y-6">
				{#if data.instagram.latest}
					<!-- サマリーカード -->
					<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div class="bg-white rounded-xl shadow-md p-6">
							<div class="flex items-center justify-between mb-2">
								<div class="text-sm text-gray-600">フォロワー数</div>
								<Users size={20} class="text-pink-600" />
							</div>
							<div class="text-3xl font-bold text-gray-900">
								{formatNumber(data.instagram.latest.followers_count)}
							</div>
							<div class="text-sm {getChangeColor(data.instagram.latest.follower_change)} mt-1">
								{getChangeIcon(data.instagram.latest.follower_change)} {Math.abs(data.instagram.latest.follower_change)}
							</div>
						</div>

						<div class="bg-white rounded-xl shadow-md p-6">
							<div class="flex items-center justify-between mb-2">
								<div class="text-sm text-gray-600">フォロー数</div>
								<Users size={20} class="text-pink-600" />
							</div>
							<div class="text-3xl font-bold text-gray-900">
								{formatNumber(data.instagram.latest.following_count)}
							</div>
							<div class="text-sm {getChangeColor(data.instagram.latest.following_change)} mt-1">
								{getChangeIcon(data.instagram.latest.following_change)} {Math.abs(data.instagram.latest.following_change)}
							</div>
						</div>

						<div class="bg-white rounded-xl shadow-md p-6">
							<div class="flex items-center justify-between mb-2">
								<div class="text-sm text-gray-600">投稿数</div>
								<MessageCircle size={20} class="text-pink-600" />
							</div>
							<div class="text-3xl font-bold text-gray-900">
								{formatNumber(data.instagram.latest.media_count)}
							</div>
							<div class="text-sm {getChangeColor(data.instagram.latest.media_change)} mt-1">
								{getChangeIcon(data.instagram.latest.media_change)} {Math.abs(data.instagram.latest.media_change)}
							</div>
						</div>
					</div>

					<!-- アカウント情報 -->
					<div class="bg-white rounded-xl shadow-md p-6">
						<h3 class="text-lg font-semibold text-gray-800 mb-4">アカウント情報</h3>
						<div class="space-y-2">
							<div class="flex items-center gap-2">
								<span class="text-gray-600">ユーザー名:</span>
								<span class="font-medium">@{data.instagram.latest.username}</span>
							</div>
							{#if data.instagram.latest.display_name}
								<div class="flex items-center gap-2">
									<span class="text-gray-600">表示名:</span>
									<span class="font-medium">{data.instagram.latest.display_name}</span>
								</div>
							{/if}
						</div>
					</div>
				{:else}
					<div class="bg-white rounded-xl shadow-md p-12 text-center">
						<Users size={48} class="text-gray-400 mx-auto mb-4" />
						<p class="text-gray-600">Instagramアカウントが連携されていません</p>
						<a
							href="/dashboard/projects/{data.project.id}/instagram"
							class="inline-block mt-4 px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
						>
							連携する
						</a>
					</div>
				{/if}
			</div>
		{/if}

		<!-- TikTok分析 -->
		{#if activeTab === 'tiktok'}
			<div class="space-y-6">
				{#if data.tiktok.latest}
					<!-- サマリーカード -->
					<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
						<div class="bg-white rounded-xl shadow-md p-6">
							<div class="flex items-center justify-between mb-2">
								<div class="text-sm text-gray-600">フォロワー数</div>
								<Users size={20} class="text-gray-900" />
							</div>
							<div class="text-3xl font-bold text-gray-900">
								{formatNumber(data.tiktok.latest.followers_count)}
							</div>
							<div class="text-sm {getChangeColor(data.tiktok.latest.follower_change)} mt-1">
								{getChangeIcon(data.tiktok.latest.follower_change)} {Math.abs(data.tiktok.latest.follower_change)}
							</div>
						</div>

						<div class="bg-white rounded-xl shadow-md p-6">
							<div class="flex items-center justify-between mb-2">
								<div class="text-sm text-gray-600">フォロー数</div>
								<Users size={20} class="text-gray-900" />
							</div>
							<div class="text-3xl font-bold text-gray-900">
								{formatNumber(data.tiktok.latest.following_count)}
							</div>
							<div class="text-sm {getChangeColor(data.tiktok.latest.following_change)} mt-1">
								{getChangeIcon(data.tiktok.latest.following_change)} {Math.abs(data.tiktok.latest.following_change)}
							</div>
						</div>

						<div class="bg-white rounded-xl shadow-md p-6">
							<div class="flex items-center justify-between mb-2">
								<div class="text-sm text-gray-600">いいね数</div>
								<Heart size={20} class="text-gray-900" />
							</div>
							<div class="text-3xl font-bold text-gray-900">
								{formatNumber(data.tiktok.latest.likes_count)}
							</div>
							<div class="text-sm {getChangeColor(data.tiktok.latest.likes_change)} mt-1">
								{getChangeIcon(data.tiktok.latest.likes_change)} {Math.abs(data.tiktok.latest.likes_change)}
							</div>
						</div>

						<div class="bg-white rounded-xl shadow-md p-6">
							<div class="flex items-center justify-between mb-2">
								<div class="text-sm text-gray-600">動画数</div>
								<MessageCircle size={20} class="text-gray-900" />
							</div>
							<div class="text-3xl font-bold text-gray-900">
								{formatNumber(data.tiktok.latest.video_count)}
							</div>
							<div class="text-sm {getChangeColor(data.tiktok.latest.video_change)} mt-1">
								{getChangeIcon(data.tiktok.latest.video_change)} {Math.abs(data.tiktok.latest.video_change)}
							</div>
						</div>
					</div>

					<!-- アカウント情報 -->
					<div class="bg-white rounded-xl shadow-md p-6">
						<h3 class="text-lg font-semibold text-gray-800 mb-4">アカウント情報</h3>
						<div class="space-y-2">
							<div class="flex items-center gap-2">
								<span class="text-gray-600">ユーザー名:</span>
								<span class="font-medium">@{data.tiktok.latest.username}</span>
							</div>
							{#if data.tiktok.latest.display_name}
								<div class="flex items-center gap-2">
									<span class="text-gray-600">表示名:</span>
									<span class="font-medium">{data.tiktok.latest.display_name}</span>
								</div>
							{/if}
						</div>
					</div>
				{:else}
					<div class="bg-white rounded-xl shadow-md p-12 text-center">
						<Users size={48} class="text-gray-400 mx-auto mb-4" />
						<p class="text-gray-600">TikTokアカウントが連携されていません</p>
						<a
							href="/dashboard/projects/{data.project.id}/tiktok"
							class="inline-block mt-4 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
						>
							連携する
						</a>
					</div>
				{/if}
			</div>
		{/if}

		<!-- YouTube分析 -->
		{#if activeTab === 'youtube'}
			<div class="space-y-6">
				<!-- YouTube API設定 -->
				<div class="bg-white rounded-xl shadow-md p-6">
					<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
						<Key size={20} class="text-red-600" />
						YouTube API 設定
					</h3>

					{#if data.youtube.hasApiKey && !showYouTubeApiKeyForm}
						<div class="space-y-3">
							<div class="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
								<p class="text-sm text-emerald-700">✓ API キーが設定されています</p>
							</div>
							<button
								onclick={() => showYouTubeApiKeyForm = true}
								class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
							>
								API キーを変更
							</button>
						</div>
					{:else}
						<form method="POST" action="?/saveYouTubeApiKey" use:enhance={handleYouTubeFormSubmit} class="space-y-4">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									YouTube Data API v3 キー <span class="text-red-500">*</span>
								</label>
								<input
									type="password"
									name="api_key"
									required
									placeholder="API キーを入力してください"
									class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
								/>
								<p class="text-xs text-gray-500 mt-1">
									Google Cloud Consoleで取得してください
								</p>
							</div>
							<div class="flex gap-2">
								<button
									type="submit"
									disabled={youtubeLoading}
									class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
								>
									{#if youtubeLoading}
										<RefreshCw size={18} class="animate-spin" />
										保存中...
									{:else}
										保存
									{/if}
								</button>
								{#if data.youtube.hasApiKey}
									<button
										type="button"
										onclick={() => showYouTubeApiKeyForm = false}
										class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
									>
										キャンセル
									</button>
								{/if}
							</div>
						</form>
					{/if}

					{#if form?.error}
						<div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
							{form.error}
						</div>
					{/if}
					{#if form?.success && form?.message}
						<div class="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
							{form.message}
						</div>
					{/if}
				</div>

				<!-- チャンネル管理 -->
				{#if data.youtube.hasApiKey}
					<div class="bg-white rounded-xl shadow-md p-6">
						<h3 class="text-lg font-semibold text-gray-800 mb-4">チャンネル管理</h3>

						{#if !showAddYouTubeChannel}
							<button
								onclick={() => showAddYouTubeChannel = true}
								class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
							>
								<Plus size={18} />
								チャンネルを追加
							</button>
						{:else}
							<form method="POST" action="?/addYouTubeChannel" use:enhance={handleYouTubeFormSubmit} class="space-y-4">
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-2">
										チャンネルハンドル <span class="text-red-500">*</span>
									</label>
									<input
										type="text"
										name="channel_handle"
										required
										placeholder="@example または チャンネルID"
										class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
									/>
									<p class="text-xs text-gray-500 mt-1">
										@から始まるハンドルまたはチャンネルIDを入力してください
									</p>
								</div>
								<div class="flex gap-2">
									<button
										type="submit"
										disabled={youtubeLoading}
										class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
									>
										{#if youtubeLoading}
											<RefreshCw size={18} class="animate-spin" />
											追加中...
										{:else}
											<Plus size={18} />
											追加
										{/if}
									</button>
									<button
										type="button"
										onclick={() => showAddYouTubeChannel = false}
										class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
									>
										キャンセル
									</button>
								</div>
							</form>
						{/if}

						{#if data.youtube.channels.length > 0}
							<div class="mt-6 space-y-3">
								<h4 class="text-sm font-semibold text-gray-700">登録済みチャンネル</h4>
								{#each data.youtube.channels as channel}
									<div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
										<div class="flex items-center gap-3">
											{#if channel.thumbnail_url}
												<img src={channel.thumbnail_url} alt={channel.channel_name} class="w-12 h-12 rounded-full" />
											{:else}
												<div class="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
													<Video size={20} class="text-gray-600" />
												</div>
											{/if}
											<div>
												<p class="font-semibold text-gray-900">{channel.channel_name}</p>
												<p class="text-sm text-gray-500">{channel.channel_handle || channel.channel_id}</p>
											</div>
										</div>
										<div class="flex items-center gap-2">
											<form method="POST" action="?/refreshYouTubeStats" use:enhance={handleYouTubeFormSubmit}>
												<input type="hidden" name="channel_id" value={channel.id} />
												<button
													type="submit"
													disabled={youtubeLoading}
													class="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
													title="統計を更新"
												>
													<RefreshCw size={16} class={youtubeLoading ? 'animate-spin' : ''} />
													統計更新
												</button>
											</form>
											<form method="POST" action="?/fetchYouTubeVideos" use:enhance={handleYouTubeFormSubmit}>
												<input type="hidden" name="channel_id" value={channel.id} />
												<button
													type="submit"
													disabled={youtubeLoading}
													class="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
													title="動画を取得"
												>
													<Download size={16} />
													動画取得
												</button>
											</form>
											<form
												method="POST"
												action="?/deleteYouTubeChannel"
												use:enhance={handleYouTubeFormSubmit}
												onsubmit={(e) => {
													if (!confirm('このチャンネルと関連データをすべて削除しますか？')) {
														e.preventDefault();
													}
												}}
											>
												<input type="hidden" name="channel_id" value={channel.id} />
												<button
													type="submit"
													disabled={youtubeLoading}
													class="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
													title="チャンネルを削除"
												>
													<Trash2 size={16} />
												</button>
											</form>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}

				{#if data.youtube.channels.length > 0}
					<!-- ヘッダー：チャンネル選択 -->
					{#if data.youtube.channels.length > 1}
						<div class="bg-white rounded-xl shadow-md p-4">
							<div class="flex items-center gap-2">
								<span class="text-sm text-gray-600">表示チャンネル:</span>
								<select
									bind:value={selectedYoutubeChannel}
									class="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-red-500"
								>
									{#each data.youtube.channels as channel}
										<option value={channel.id}>{channel.channel_name}</option>
									{/each}
								</select>
							</div>
						</div>
					{/if}

					{@const selectedChannel = data.youtube.channels.find((c: any) => c.id === selectedYoutubeChannel)}
					{#if selectedChannel}
						<!-- サマリーカード -->
						<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div class="bg-white rounded-xl shadow-md p-6">
								<div class="flex items-center justify-between mb-2">
									<div class="text-sm text-gray-600">登録者数</div>
									<Users size={20} class="text-red-600" />
								</div>
								<div class="text-3xl font-bold text-gray-900">
									{formatNumber(selectedChannel.stats?.subscriber_count || 0)}
								</div>
								<div class="text-sm {getChangeColor(selectedChannel.subscriberChange)} mt-1">
									{getChangeIcon(selectedChannel.subscriberChange)} {Math.abs(selectedChannel.subscriberChange)}
								</div>
							</div>

							<div class="bg-white rounded-xl shadow-md p-6">
								<div class="flex items-center justify-between mb-2">
									<div class="text-sm text-gray-600">総再生数</div>
									<Eye size={20} class="text-red-600" />
								</div>
								<div class="text-3xl font-bold text-gray-900">
									{formatNumber(selectedChannel.stats?.view_count || 0)}
								</div>
								<div class="text-sm {getChangeColor(selectedChannel.viewChange)} mt-1">
									{getChangeIcon(selectedChannel.viewChange)} {Math.abs(selectedChannel.viewChange)}
								</div>
							</div>

							<div class="bg-white rounded-xl shadow-md p-6">
								<div class="flex items-center justify-between mb-2">
									<div class="text-sm text-gray-600">動画数</div>
									<Video size={20} class="text-red-600" />
								</div>
								<div class="text-3xl font-bold text-gray-900">
									{formatNumber(selectedChannel.stats?.video_count || 0)}
								</div>
							</div>
						</div>

						<!-- 動画投稿頻度分析 -->
						{#if data.youtube.postFrequency}
							<div class="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl shadow-md p-6 border-2 border-orange-200">
								<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
									<Calendar size={20} class="text-orange-600" />
									動画投稿頻度分析
								</h3>
								<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
									<!-- 最近1週間の投稿 -->
									<div class="bg-white rounded-lg p-4">
										<div class="text-sm text-gray-600 mb-1">最近1週間の投稿</div>
										<div class="text-3xl font-bold text-orange-600">{data.youtube.postFrequency.weekVideos}</div>
										<div class="text-xs text-gray-500 mt-2">
											平均: {data.youtube.postFrequency.avgPerWeek.toFixed(1)}本/週
										</div>
										{#if data.youtube.postFrequency.weekVideos > data.youtube.postFrequency.avgPerWeek}
											<div class="text-xs text-emerald-600 mt-1">
												📈 平均より {(data.youtube.postFrequency.weekVideos - data.youtube.postFrequency.avgPerWeek).toFixed(1)}本多い
											</div>
										{:else if data.youtube.postFrequency.weekVideos < data.youtube.postFrequency.avgPerWeek}
											<div class="text-xs text-amber-600 mt-1">
												📉 平均より {(data.youtube.postFrequency.avgPerWeek - data.youtube.postFrequency.weekVideos).toFixed(1)}本少ない
											</div>
										{:else}
											<div class="text-xs text-gray-600 mt-1">
												➡️ 平均と同じ
											</div>
										{/if}
									</div>

									<!-- 最近30日間の投稿 -->
									<div class="bg-white rounded-lg p-4">
										<div class="text-sm text-gray-600 mb-1">最近30日間の投稿</div>
										<div class="text-3xl font-bold text-red-600">{data.youtube.postFrequency.monthVideos}</div>
										<div class="text-xs text-gray-500 mt-2">
											平均: {data.youtube.postFrequency.avgPerMonth.toFixed(1)}本/月
										</div>
										{#if data.youtube.postFrequency.monthVideos > data.youtube.postFrequency.avgPerMonth}
											<div class="text-xs text-emerald-600 mt-1">
												📈 平均より {(data.youtube.postFrequency.monthVideos - data.youtube.postFrequency.avgPerMonth).toFixed(1)}本多い
											</div>
										{:else if data.youtube.postFrequency.monthVideos < data.youtube.postFrequency.avgPerMonth}
											<div class="text-xs text-amber-600 mt-1">
												📉 平均より {(data.youtube.postFrequency.avgPerMonth - data.youtube.postFrequency.monthVideos).toFixed(1)}本少ない
											</div>
										{:else}
											<div class="text-xs text-gray-600 mt-1">
												➡️ 平均と同じ
											</div>
										{/if}
									</div>
								</div>

								<!-- 統計サマリー -->
								<div class="bg-white rounded-lg p-4">
									<div class="text-sm font-medium text-gray-700 mb-3">全期間の統計</div>
									<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
										<div>
											<div class="text-gray-600">総動画数</div>
											<div class="font-semibold text-gray-900">{data.youtube.postFrequency.totalVideos}本</div>
										</div>
										<div>
											<div class="text-gray-600">計測期間</div>
											<div class="font-semibold text-gray-900">{data.youtube.postFrequency.totalDays}日間</div>
										</div>
										<div>
											<div class="text-gray-600">1週間平均</div>
											<div class="font-semibold text-gray-900">{data.youtube.postFrequency.avgPerWeek.toFixed(2)}本</div>
										</div>
										<div>
											<div class="text-gray-600">1ヶ月平均</div>
											<div class="font-semibold text-gray-900">{data.youtube.postFrequency.avgPerMonth.toFixed(2)}本</div>
										</div>
									</div>
								</div>
							</div>
						{/if}

						<!-- 成長トレンドグラフ -->
						{#if selectedChannel.statsHistory.length > 1}
							<div class="bg-white rounded-xl shadow-md p-6">
								<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
									<TrendingUp size={20} class="text-red-600" />
									成長トレンド
								</h3>
								<div class="h-96">
									<canvas use:initYoutubeChart={selectedChannel.id}></canvas>
								</div>
							</div>
						{/if}

						<!-- 動画パフォーマンス -->
						{#if selectedChannel.videos.length > 0}
							<div class="bg-white rounded-xl shadow-md">
								<div class="p-4 border-b border-gray-200">
									<h3 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
										<PlayCircle size={20} class="text-red-600" />
										動画パフォーマンス（再生数順）
									</h3>
								</div>
								<div class="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
									{#each selectedChannel.videos as video, i}
										<div class="p-4 hover:bg-gray-50 transition-colors">
											<div class="flex items-center gap-4">
												<span class="text-xl font-bold text-gray-400 w-8 text-center">#{i + 1}</span>
												{#if video.thumbnail_url}
													<a
														href="https://youtube.com/watch?v={video.video_id}"
														target="_blank"
														rel="noopener"
														class="relative group flex-shrink-0"
													>
														<img src={video.thumbnail_url} alt={video.title} class="w-32 h-18 rounded object-cover" />
														<div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 flex items-center justify-center transition-all rounded">
															<PlayCircle size={24} class="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
														</div>
														{#if video.duration}
															<span class="absolute bottom-1 right-1 bg-black bg-opacity-80 text-white text-xs px-1 rounded">
																{formatDuration(video.duration)}
															</span>
														{/if}
													</a>
												{:else}
													<div class="w-32 h-18 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
														<Video size={20} class="text-gray-400" />
													</div>
												{/if}
												<div class="flex-1 min-w-0">
													<a
														href="https://youtube.com/watch?v={video.video_id}"
														target="_blank"
														rel="noopener"
														class="text-sm font-medium text-gray-900 hover:text-red-600 line-clamp-2 transition-colors"
													>
														{video.title}
													</a>
													{#if video.published_at}
														<span class="text-xs text-gray-500 flex items-center gap-1 mt-1">
															<Calendar size={10} />
															{formatFullDate(video.published_at)}
														</span>
													{/if}
												</div>
												<div class="flex items-center gap-6 text-center flex-shrink-0">
													<div>
														<p class="text-sm font-bold text-blue-600">{formatNumber(video.view_count || 0)}</p>
														<p class="text-xs text-gray-500 flex items-center gap-1">
															<Eye size={10} /> 再生
														</p>
													</div>
													<div>
														<p class="text-sm font-bold text-green-600">{formatNumber(video.like_count || 0)}</p>
														<p class="text-xs text-gray-500 flex items-center gap-1">
															<ThumbsUp size={10} /> いいね
														</p>
													</div>
													<div>
														<p class="text-sm font-bold text-purple-600">{formatNumber(video.comment_count || 0)}</p>
														<p class="text-xs text-gray-500 flex items-center gap-1">
															<MessageCircle size={10} /> コメント
														</p>
													</div>
												</div>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{:else}
							<div class="bg-white rounded-xl shadow-md p-12 text-center">
								<Video size={48} class="text-gray-400 mx-auto mb-4" />
								<p class="text-gray-600">動画データがありません</p>
								<p class="text-sm text-gray-500 mt-2">YouTube設定ページで動画を取得してください</p>
							</div>
						{/if}
					{/if}
				{:else}
					<div class="bg-white rounded-xl shadow-md p-12 text-center">
						<Video size={48} class="text-gray-400 mx-auto mb-4" />
						<p class="text-gray-600 mb-2">YouTubeチャンネルが登録されていません</p>
						<p class="text-sm text-gray-500">上の「YouTube API 設定」でAPIキーを設定し、チャンネルを追加してください</p>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
