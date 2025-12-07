<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import {
		ArrowLeft,
		Youtube,
		Key,
		Plus,
		Trash2,
		Users,
		Eye,
		Video,
		ExternalLink,
		Settings,
		RefreshCw,
		Download,
		TrendingUp,
		TrendingDown,
		Calendar,
		ThumbsUp,
		MessageSquare,
		PlayCircle
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Chart, registerables } from 'chart.js';

	Chart.register(...registerables);

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showApiKeyForm = $state(false);
	let showAddChannel = $state(false);
	let loading = $state(false);
	let chartInstances = $state<Map<number, Chart>>(new Map());

	function handleFormSubmit() {
		loading = true;
		return async ({ result }: { result: { type: string } }) => {
			loading = false;
			if (result.type === 'success') {
				showApiKeyForm = false;
				showAddChannel = false;
				await invalidateAll();
			}
		};
	}

	function formatNumber(num: number): string {
		if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
		if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
		return num.toLocaleString();
	}

	function formatChange(num: number): string {
		if (num > 0) return '+' + formatNumber(num);
		if (num < 0) return formatNumber(num);
		return '0';
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

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '';
		return new Date(dateStr).toLocaleDateString('ja-JP', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}


	function initChart(canvas: HTMLCanvasElement, channelId: number) {
		const channel = data.channels.find(c => c.id === channelId);
		if (!channel || channel.statsHistory.length < 2) return;

		// Destroy existing chart if any
		const existingChart = chartInstances.get(channelId);
		if (existingChart) {
			existingChart.destroy();
		}

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const chart = new Chart(ctx, {
			type: 'line',
			data: {
				labels: channel.statsHistory.map(s => s.recorded_date),
				datasets: [
					{
						label: 'Subscribers',
						data: channel.statsHistory.map(s => s.subscriber_count),
						borderColor: '#EF4444',
						backgroundColor: 'rgba(239, 68, 68, 0.1)',
						fill: true,
						tension: 0.4,
						yAxisID: 'y'
					},
					{
						label: 'Views',
						data: channel.statsHistory.map(s => s.view_count),
						borderColor: '#3B82F6',
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
						labels: {
							color: '#9CA3AF'
						}
					}
				},
				scales: {
					x: {
						grid: {
							color: 'rgba(75, 85, 99, 0.3)'
						},
						ticks: {
							color: '#9CA3AF'
						}
					},
					y: {
						type: 'linear',
						display: true,
						position: 'left',
						grid: {
							color: 'rgba(75, 85, 99, 0.3)'
						},
						ticks: {
							color: '#EF4444',
							callback: (value) => formatNumber(value as number)
						}
					},
					y1: {
						type: 'linear',
						display: true,
						position: 'right',
						grid: {
							drawOnChartArea: false
						},
						ticks: {
							color: '#3B82F6',
							callback: (value) => formatNumber(value as number)
						}
					}
				}
			}
		});

		chartInstances.set(channelId, chart);
	}

	onMount(() => {
		return () => {
			// Cleanup all charts on unmount
			chartInstances.forEach(chart => chart.destroy());
		};
	});
</script>

<svelte:head>
	<title>YouTube Analytics - {data.project.title}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
	<header class="bg-gray-900 border-b border-gray-700">
		<div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<a href="/dashboard/projects/{data.project.id}" class="p-2 hover:bg-gray-800 rounded-lg transition-colors" title="Back to project">
					<ArrowLeft size={20} class="text-gray-400" />
				</a>
				<Youtube size={24} class="text-red-500" />
				<div>
					<h1 class="text-xl font-bold text-white">YouTube Analytics</h1>
					<p class="text-sm text-gray-400">{data.project.title}</p>
				</div>
			</div>
			<button onclick={() => showApiKeyForm = !showApiKeyForm} class="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors">
				<Settings size={18} />
				<span class="hidden md:inline">Settings</span>
			</button>
		</div>
	</header>

	<main class="max-w-7xl mx-auto px-4 py-8">
		{#if showApiKeyForm || !data.hasApiKey}
			<div class="bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-700">
				<div class="flex items-center gap-2 mb-4">
					<Key size={20} class="text-yellow-500" />
					<h2 class="font-semibold text-white">YouTube Data API Settings</h2>
				</div>
				<form method="POST" action="?/saveApiKey" use:enhance={handleFormSubmit}>
					<div class="flex gap-3">
						<input
							type="password"
							name="api_key"
							placeholder="YouTube Data API Key"
							value={data.settings?.api_key || ''}
							required
							class="flex-1 px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
						/>
						<button type="submit" disabled={loading} class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
							{loading ? 'Saving...' : 'Save'}
						</button>
					</div>
					<p class="text-xs text-gray-400 mt-2">
						Get your API key from <a href="https://console.developers.google.com/" target="_blank" rel="noopener" class="text-red-400 hover:underline">Google Cloud Console</a>
					</p>
				</form>
			</div>
		{/if}

		{#if data.hasApiKey}
			<div class="flex items-center justify-between mb-6">
				<h2 class="text-lg font-semibold text-white">Registered Channels</h2>
				<button onclick={() => showAddChannel = !showAddChannel} class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
					<Plus size={18} />
					Add Channel
				</button>
			</div>

			{#if showAddChannel}
				<div class="bg-gray-800 rounded-xl p-4 mb-6 border border-gray-700">
					<form method="POST" action="?/addChannel" use:enhance={handleFormSubmit}>
						<div class="flex gap-3">
							<input
								type="text"
								name="channel_handle"
								placeholder="@channelhandle or channel name"
								required
								class="flex-1 px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500"
							/>
							<button type="submit" disabled={loading} class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
								{loading ? 'Adding...' : 'Add'}
							</button>
						</div>
					</form>
				</div>
			{/if}

			{#if data.channels.length === 0}
				<div class="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
					<Youtube size={64} class="mx-auto text-gray-600 mb-4" />
					<p class="text-gray-400 text-lg">No channels registered</p>
					<p class="text-sm text-gray-500 mt-2">Add a YouTube channel to start tracking analytics</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each data.channels as channel}
						<div class="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
							<!-- Channel Header (always visible) -->
							<div class="p-4">
								<div class="flex items-center gap-4">
									{#if channel.thumbnail_url}
										<img src={channel.thumbnail_url} alt={channel.channel_name} class="w-16 h-16 rounded-full object-cover border-2 border-gray-600" />
									{:else}
										<div class="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center border-2 border-gray-600">
											<Youtube size={24} class="text-gray-500" />
										</div>
									{/if}
									<div class="flex-1 min-w-0">
										<h3 class="text-lg font-semibold text-white">{channel.channel_name}</h3>
										{#if channel.channel_handle}
											<a href="https://youtube.com/{channel.channel_handle}" target="_blank" rel="noopener" class="text-sm text-gray-400 hover:text-red-400 flex items-center gap-1">
												{channel.channel_handle}
												<ExternalLink size={12} />
											</a>
										{/if}
									</div>

									<!-- Stats Summary -->
									{#if channel.stats}
										<div class="hidden md:flex items-center gap-6 text-center">
											<div>
												<p class="text-xl font-bold text-red-400">{formatNumber(channel.stats.subscriber_count)}</p>
												<p class="text-xs text-gray-500 flex items-center gap-1"><Users size={12} /> Subscribers</p>
											</div>
											<div>
												<p class="text-xl font-bold text-blue-400">{formatNumber(channel.stats.view_count)}</p>
												<p class="text-xs text-gray-500 flex items-center gap-1"><Eye size={12} /> Total Views</p>
											</div>
											<div>
												<p class="text-xl font-bold text-purple-400">{formatNumber(channel.stats.video_count)}</p>
												<p class="text-xs text-gray-500 flex items-center gap-1"><Video size={12} /> Videos</p>
											</div>
										</div>
									{/if}

									<!-- Actions -->
									<div class="flex items-center gap-2">
										<form method="POST" action="?/deleteChannel" use:enhance={handleFormSubmit}>
											<input type="hidden" name="channel_id" value={channel.id} />
											<button
												type="submit"
												disabled={loading}
												onclick={(e) => { if (!confirm('Delete this channel?')) e.preventDefault(); }}
												class="p-2 text-gray-500 hover:text-red-500 hover:bg-gray-700 rounded-lg transition-colors"
											>
												<Trash2 size={18} />
											</button>
										</form>
									</div>
								</div>

								<!-- Mobile Stats -->
								{#if channel.stats}
									<div class="md:hidden mt-4 grid grid-cols-3 gap-4 text-center border-t border-gray-700 pt-4">
										<div>
											<p class="text-lg font-bold text-red-400">{formatNumber(channel.stats.subscriber_count)}</p>
											<p class="text-xs text-gray-500">Subscribers</p>
										</div>
										<div>
											<p class="text-lg font-bold text-blue-400">{formatNumber(channel.stats.view_count)}</p>
											<p class="text-xs text-gray-500">Views</p>
										</div>
										<div>
											<p class="text-lg font-bold text-purple-400">{formatNumber(channel.stats.video_count)}</p>
											<p class="text-xs text-gray-500">Videos</p>
										</div>
									</div>
								{/if}
							</div>

							<!-- Analytics Section -->
							<div class="border-t border-gray-700 p-4 bg-gray-850">
									<!-- Action Buttons -->
									<div class="flex items-center gap-2 mb-6">
										<form method="POST" action="?/refreshStats" use:enhance={handleFormSubmit}>
											<input type="hidden" name="channel_id" value={channel.id} />
											<button type="submit" disabled={loading} class="flex items-center gap-2 px-3 py-2 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors">
												<RefreshCw size={16} class={loading ? 'animate-spin' : ''} />
												Refresh Stats
											</button>
										</form>
										<form method="POST" action="?/fetchVideos" use:enhance={handleFormSubmit}>
											<input type="hidden" name="channel_id" value={channel.id} />
											<button type="submit" disabled={loading} class="flex items-center gap-2 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
												<Download size={16} />
												Fetch Videos
											</button>
										</form>
									</div>

									<!-- Detailed Stats Cards -->
									<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
										<div class="bg-gray-900 rounded-xl p-4 border border-gray-700">
											<div class="flex items-center justify-between mb-2">
												<div class="flex items-center gap-2 text-gray-400">
													<Users size={18} />
													<span class="text-sm">Subscribers</span>
												</div>
												{#if channel.subscriberChange !== 0}
													<div class="flex items-center gap-1 {channel.subscriberChange > 0 ? 'text-green-400' : 'text-red-400'}">
														{#if channel.subscriberChange > 0}
															<TrendingUp size={14} />
														{:else}
															<TrendingDown size={14} />
														{/if}
														<span class="text-xs font-medium">{formatChange(channel.subscriberChange)}</span>
													</div>
												{/if}
											</div>
											<p class="text-2xl font-bold text-red-400">{channel.stats ? formatNumber(channel.stats.subscriber_count) : '---'}</p>
										</div>
										<div class="bg-gray-900 rounded-xl p-4 border border-gray-700">
											<div class="flex items-center justify-between mb-2">
												<div class="flex items-center gap-2 text-gray-400">
													<Eye size={18} />
													<span class="text-sm">Total Views</span>
												</div>
												{#if channel.viewChange !== 0}
													<div class="flex items-center gap-1 {channel.viewChange > 0 ? 'text-green-400' : 'text-red-400'}">
														{#if channel.viewChange > 0}
															<TrendingUp size={14} />
														{:else}
															<TrendingDown size={14} />
														{/if}
														<span class="text-xs font-medium">{formatChange(channel.viewChange)}</span>
													</div>
												{/if}
											</div>
											<p class="text-2xl font-bold text-blue-400">{channel.stats ? formatNumber(channel.stats.view_count) : '---'}</p>
										</div>
										<div class="bg-gray-900 rounded-xl p-4 border border-gray-700">
											<div class="flex items-center gap-2 text-gray-400 mb-2">
												<Video size={18} />
												<span class="text-sm">Videos</span>
											</div>
											<p class="text-2xl font-bold text-purple-400">{channel.stats ? formatNumber(channel.stats.video_count) : '---'}</p>
										</div>
									</div>

									<!-- Growth Chart -->
									{#if channel.statsHistory.length > 1}
										<div class="bg-gray-900 rounded-xl p-4 border border-gray-700 mb-6">
											<h3 class="text-md font-semibold text-white mb-4">Growth Trend</h3>
											<div class="h-48">
												<canvas use:initChart={channel.id}></canvas>
											</div>
										</div>
									{/if}

									<!-- Videos Section -->
									<div class="bg-gray-900 rounded-xl border border-gray-700">
										<div class="p-3 border-b border-gray-700">
											<h3 class="text-md font-semibold text-white flex items-center gap-2">
												<PlayCircle size={18} class="text-red-500" />
												Video Performance
												<span class="text-xs text-gray-500 font-normal">(Sorted by views)</span>
											</h3>
										</div>
										{#if channel.videos.length === 0}
											<div class="p-8 text-center">
												<Video size={32} class="mx-auto text-gray-600 mb-2" />
												<p class="text-gray-400 text-sm">No video data available</p>
												<p class="text-xs text-gray-500 mt-1">Click "Fetch Videos" to load video data</p>
											</div>
										{:else}
											<div class="divide-y divide-gray-700 max-h-96 overflow-y-auto">
												{#each channel.videos as video, i}
													<div class="p-3 hover:bg-gray-800 transition-colors">
														<div class="flex items-center gap-3">
															<span class="text-lg font-bold text-gray-600 w-6 text-center">#{i + 1}</span>
															{#if video.thumbnail_url}
																<a href="https://youtube.com/watch?v={video.video_id}" target="_blank" rel="noopener" class="relative group flex-shrink-0">
																	<img src={video.thumbnail_url} alt={video.title} class="w-24 h-14 rounded object-cover" />
																	<div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 flex items-center justify-center transition-all rounded">
																		<PlayCircle size={20} class="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
																	</div>
																	{#if video.duration}
																		<span class="absolute bottom-0.5 right-0.5 bg-black bg-opacity-80 text-white text-xs px-1 rounded text-[10px]">
																			{formatDuration(video.duration)}
																		</span>
																	{/if}
																</a>
															{:else}
																<div class="w-24 h-14 rounded bg-gray-700 flex items-center justify-center flex-shrink-0">
																	<Video size={16} class="text-gray-500" />
																</div>
															{/if}
															<div class="flex-1 min-w-0">
																<a href="https://youtube.com/watch?v={video.video_id}" target="_blank" rel="noopener" class="text-sm font-medium text-white hover:text-red-400 line-clamp-1 transition-colors">
																	{video.title}
																</a>
																{#if video.published_at}
																	<span class="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
																		<Calendar size={10} />
																		{formatDate(video.published_at)}
																	</span>
																{/if}
															</div>
															<div class="flex items-center gap-4 text-center flex-shrink-0">
																<div>
																	<p class="text-sm font-bold text-blue-400">{formatNumber(video.view_count || 0)}</p>
																	<p class="text-[10px] text-gray-500"><Eye size={10} class="inline" /></p>
																</div>
																<div>
																	<p class="text-sm font-bold text-green-400">{formatNumber(video.like_count || 0)}</p>
																	<p class="text-[10px] text-gray-500"><ThumbsUp size={10} class="inline" /></p>
																</div>
																<div>
																	<p class="text-sm font-bold text-purple-400">{formatNumber(video.comment_count || 0)}</p>
																	<p class="text-[10px] text-gray-500"><MessageSquare size={10} class="inline" /></p>
																</div>
															</div>
														</div>
													</div>
												{/each}
											</div>
										{/if}
									</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		{/if}

		{#if form?.error}
			<div class="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg">
				{form.error}
			</div>
		{/if}
	</main>
</div>

<style>
	.bg-gray-850 {
		background-color: rgb(30, 33, 41);
	}
</style>
