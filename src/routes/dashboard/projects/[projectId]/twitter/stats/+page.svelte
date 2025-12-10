<script lang="ts">
	import { BarChart3, TrendingUp, Users, Calendar, MessageSquare, ArrowLeft } from 'lucide-svelte';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import Chart from 'chart.js/auto';

	let { data }: { data: PageData } = $props();

	let dailyChart: Chart | null = null;
	let dailyChartCanvas: HTMLCanvasElement | null = $state(null);
	let followerChart: Chart | null = null;
	let followerChartCanvas: HTMLCanvasElement | null = $state(null);

	function formatNumber(num: number): string {
		return num.toLocaleString('ja-JP');
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return `${date.getMonth() + 1}/${date.getDate()}`;
	}

	// 日ごとのツイート数グラフ
	$effect(() => {
		if (data.stats && data.stats.length > 0 && dailyChartCanvas) {
			if (dailyChart) {
				dailyChart.destroy();
			}

			const ctx = dailyChartCanvas.getContext('2d');
			if (!ctx) return;

			const reversedStats = [...data.stats].reverse();
			const dailyTweets = reversedStats.map((stat: any, index: number) => {
				if (index === 0) return 0;
				return stat.tweet_count - reversedStats[index - 1].tweet_count;
			});

			dailyChart = new Chart(ctx, {
				type: 'bar',
				data: {
					labels: reversedStats.map((stat: any) => formatDate(stat.recorded_date)),
					datasets: [
						{
							label: '1日のツイート数',
							data: dailyTweets,
							backgroundColor: 'rgba(59, 130, 246, 0.6)',
							borderColor: 'rgb(59, 130, 246)',
							borderWidth: 1
						}
					]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: {
							display: false
						}
					},
					scales: {
						y: {
							beginAtZero: true,
							ticks: {
								stepSize: 1
							}
						}
					}
				}
			});
		}
	});

	// フォロワー/フォロー推移グラフ
	$effect(() => {
		if (data.stats && data.stats.length > 0 && followerChartCanvas) {
			if (followerChart) {
				followerChart.destroy();
			}

			const ctx = followerChartCanvas.getContext('2d');
			if (!ctx) return;

			const reversedStats = [...data.stats].reverse();

			followerChart = new Chart(ctx, {
				type: 'line',
				data: {
					labels: reversedStats.map((stat: any) => formatDate(stat.recorded_date)),
					datasets: [
						{
							label: 'フォロワー数',
							data: reversedStats.map((stat: any) => stat.followers_count),
							borderColor: 'rgb(59, 130, 246)',
							backgroundColor: 'rgba(59, 130, 246, 0.1)',
							tension: 0.3,
							fill: true
						},
						{
							label: 'フォロー数',
							data: reversedStats.map((stat: any) => stat.following_count),
							borderColor: 'rgb(168, 85, 247)',
							backgroundColor: 'rgba(168, 85, 247, 0.1)',
							tension: 0.3,
							fill: true
						}
					]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: {
							position: 'top'
						}
					},
					scales: {
						y: {
							beginAtZero: false
						}
					}
				}
			});
		}
	});

	onMount(() => {
		return () => {
			if (dailyChart) dailyChart.destroy();
			if (followerChart) followerChart.destroy();
		};
	});
</script>

<svelte:head>
	<title>詳細統計 - {data.project.title}</title>
</svelte:head>

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
				<a href="/dashboard/projects/{data.project.id}/twitter" class="hover:text-indigo-600">
					Twitter
				</a>
				<span>/</span>
				<span class="text-gray-900">詳細統計</span>
			</div>
			<div class="flex items-center gap-3">
				<BarChart3 size={32} class="text-sky-600" />
				<h1 class="text-3xl font-bold text-gray-900">Twitter詳細統計</h1>
			</div>
			<p class="text-gray-600 mt-2">Twilog風の詳細な統計情報</p>
		</div>

		<!-- 戻るボタン -->
		<a
			href="/dashboard/projects/{data.project.id}/twitter"
			class="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors mb-6"
		>
			<ArrowLeft size={18} />
			Twitterページに戻る
		</a>

		{#if data.account && data.stats && data.stats.length > 0}
			<!-- 基本統計 -->
			<div class="bg-white rounded-xl shadow-md p-6 mb-6">
				<h3 class="text-lg font-semibold text-gray-800 mb-4">基本統計</h3>
				<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div class="p-4 bg-blue-50 rounded-lg">
						<div class="text-sm text-gray-600 mb-1">Twitter歴</div>
						<div class="text-2xl font-bold text-blue-600">{data.accountAgeDays}日</div>
						<div class="text-xs text-gray-500 mt-1">
							{new Date(data.account.created_at).toLocaleDateString('ja-JP', {year: 'numeric', month: 'long', day: 'numeric'})}より
						</div>
					</div>
					<div class="p-4 bg-purple-50 rounded-lg">
						<div class="text-sm text-gray-600 mb-1">総ツイート数</div>
						<div class="text-2xl font-bold text-purple-600">{formatNumber(data.latestStat.tweet_count)}</div>
						<div class="text-xs text-gray-500 mt-1">
							{(data.latestStat.tweet_count / data.accountAgeDays).toFixed(1)}件/日
						</div>
					</div>
					<div class="p-4 bg-emerald-50 rounded-lg">
						<div class="text-sm text-gray-600 mb-1">フォロワー数</div>
						<div class="text-2xl font-bold text-emerald-600">{formatNumber(data.latestStat.followers_count)}</div>
						<div class="text-xs text-gray-500 mt-1">
							{(data.latestStat.followers_count / data.accountAgeDays).toFixed(2)}人/日増
						</div>
					</div>
					<div class="p-4 bg-pink-50 rounded-lg">
						<div class="text-sm text-gray-600 mb-1">フォロワー/フォロー比率</div>
						<div class="text-2xl font-bold text-pink-600">
							{(data.latestStat.followers_count / data.latestStat.following_count).toFixed(2)}
						</div>
						<div class="text-xs text-gray-500 mt-1">
							逆: {(data.latestStat.following_count / data.latestStat.followers_count).toFixed(2)}
						</div>
					</div>
				</div>
			</div>

			<!-- 記録期間統計 -->
			<div class="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-md p-6 mb-6 border-2 border-amber-200">
				<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
					<Calendar size={20} class="text-amber-600" />
					記録期間統計
				</h3>
				<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div class="bg-white rounded-lg p-4">
						<div class="text-sm text-gray-600 mb-1">記録期間</div>
						<div class="text-xl font-bold text-gray-900">{data.recordDays}日間</div>
						<div class="text-xs text-gray-500 mt-1">
							{formatDate(data.oldestStat.recorded_date)} 〜 {formatDate(data.latestStat.recorded_date)}
						</div>
					</div>
					<div class="bg-white rounded-lg p-4">
						<div class="text-sm text-gray-600 mb-1">期間内ツイート数</div>
						<div class="text-xl font-bold text-blue-600">
							{formatNumber(data.latestStat.tweet_count - data.oldestStat.tweet_count)}件
						</div>
						<div class="text-xs text-gray-500 mt-1">
							{((data.latestStat.tweet_count - data.oldestStat.tweet_count) / data.recordDays).toFixed(1)}件/日
						</div>
					</div>
					<div class="bg-white rounded-lg p-4">
						<div class="text-sm text-gray-600 mb-1">つぶやいた日数</div>
						<div class="text-xl font-bold text-emerald-600">{data.tweetedDays}日</div>
						<div class="text-xs text-gray-500 mt-1">
							つぶやかなかった日数: {data.recordDays - data.tweetedDays}日
						</div>
					</div>
					<div class="bg-white rounded-lg p-4">
						<div class="text-sm text-gray-600 mb-1">1日の最高ツイート数</div>
						<div class="text-xl font-bold text-purple-600">{data.maxDailyTweets}件</div>
						<div class="text-xs text-gray-500 mt-1">
							{data.maxDailyTweetsDate}
						</div>
					</div>
				</div>
			</div>

			<!-- フォロー可能人数 -->
			<div class="bg-white rounded-xl shadow-md p-6 mb-6">
				<h3 class="text-lg font-semibold text-gray-800 mb-4">フォロー制限情報</h3>
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<span class="text-gray-600">フォロー可能人数</span>
						<span class="font-semibold text-gray-900">5,000人</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-gray-600">現在のフォロー数</span>
						<span class="font-semibold text-gray-900">{formatNumber(data.latestStat.following_count)}人</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-gray-600">残りフォロー可能人数</span>
						<span class="font-semibold text-blue-600">
							{formatNumber(5000 - data.latestStat.following_count)}人
						</span>
					</div>
					<div class="mt-2">
						<div class="bg-gray-200 rounded-full h-2">
							<div
								class="bg-blue-600 h-2 rounded-full transition-all"
								style="width: {(data.latestStat.following_count / 5000 * 100).toFixed(1)}%"
							></div>
						</div>
						<p class="text-xs text-gray-500 mt-1 text-right">
							{(data.latestStat.following_count / 5000 * 100).toFixed(1)}% 使用中
						</p>
					</div>
				</div>
			</div>

			<!-- 日ごとのツイート数グラフ -->
			<div class="bg-white rounded-xl shadow-md p-6 mb-6">
				<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
					<MessageSquare size={20} class="text-sky-600" />
					日ごとのツイート数
				</h3>
				<div class="h-80">
					<canvas bind:this={dailyChartCanvas}></canvas>
				</div>
			</div>

			<!-- フォロワー/フォロー推移グラフ -->
			<div class="bg-white rounded-xl shadow-md p-6 mb-6">
				<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
					<TrendingUp size={20} class="text-sky-600" />
					フォロワー/フォロー数推移
				</h3>
				<div class="h-80">
					<canvas bind:this={followerChartCanvas}></canvas>
				</div>
			</div>

			<!-- 合計ツイート数推移 -->
			<div class="bg-white rounded-xl shadow-md p-6">
				<h3 class="text-lg font-semibold text-gray-800 mb-4">合計ツイート数推移</h3>
				<div class="space-y-2">
					{#each data.stats.slice(0, 10) as stat}
						<div class="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
							<span class="text-sm text-gray-600">{stat.recorded_date}</span>
							<span class="font-semibold text-gray-900">{formatNumber(stat.tweet_count)}件</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- データ不足の注意 -->
			{#if data.stats.length < 7}
				<div class="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 mt-6">
					<h3 class="font-semibold text-yellow-900 mb-2">📊 より詳細な統計情報を表示するには</h3>
					<p class="text-sm text-yellow-800 mb-3">
						現在のデータ: {data.stats.length}日分
					</p>
					<ul class="list-disc list-inside space-y-1 text-sm text-yellow-800">
						<li>CSVインポート機能で過去のデータを追加してください</li>
						<li>毎日「統計を自動取得」を実行して履歴を蓄積してください</li>
						<li>7日分以上のデータがあると、より詳細な分析が可能になります</li>
					</ul>
				</div>
			{/if}
		{:else}
			<div class="bg-white rounded-xl shadow-md p-12 text-center">
				<Users size={48} class="text-gray-400 mx-auto mb-4" />
				<p class="text-gray-600">統計データがありません</p>
				<p class="text-sm text-gray-500 mt-2">Twitterページで統計データを取得してください</p>
				<a
					href="/dashboard/projects/{data.project.id}/twitter"
					class="inline-block mt-4 px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
				>
					Twitterページへ
				</a>
			</div>
		{/if}
	</div>
</div>
