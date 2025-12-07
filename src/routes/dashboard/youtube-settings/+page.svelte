<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { ArrowLeft, Youtube, Key, Plus, RefreshCw, Trash2, Users, Eye, Video, CheckCircle, AlertCircle } from 'lucide-svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let apiKeyInput = $state('');
	let channelInput = $state('');
	let savingApiKey = $state(false);
	let addingChannel = $state(false);
	let refreshingChannels = $state<Record<number, boolean>>({});

	function formatNumber(num: number): string {
		if (num >= 1000000) {
			return (num / 1000000).toFixed(1) + 'M';
		} else if (num >= 1000) {
			return (num / 1000).toFixed(1) + 'K';
		}
		return num.toLocaleString();
	}
</script>

<svelte:head>
	<title>YouTube設定 - タスク管理</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-red-50 to-pink-100">
	<!-- Header -->
	<header class="bg-white shadow-sm border-b border-red-200">
		<div class="max-w-4xl mx-auto px-6 py-4">
			<div class="flex items-center gap-4">
				<a
					href="/dashboard/projects"
					class="p-2 text-gray-600 hover:bg-red-50 rounded-lg transition-colors"
				>
					<ArrowLeft size={20} />
				</a>
				<div class="flex items-center gap-3">
					<div class="p-2 bg-red-100 rounded-lg">
						<Youtube size={24} class="text-red-600" />
					</div>
					<div>
						<h1 class="text-2xl font-bold text-gray-800">YouTube設定</h1>
						<p class="text-sm text-gray-500">YouTube Data APIの設定とチャンネル管理</p>
					</div>
				</div>
			</div>
		</div>
	</header>

	<main class="max-w-4xl mx-auto px-6 py-8 space-y-8">
		<!-- Status Messages -->
		{#if form?.success}
			<div class="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
				<CheckCircle size={20} class="text-green-600" />
				<span class="text-green-800">{form.message}</span>
			</div>
		{/if}

		{#if form?.error}
			<div class="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
				<AlertCircle size={20} class="text-red-600" />
				<span class="text-red-800">{form.error}</span>
			</div>
		{/if}

		<!-- API Key Section -->
		<section class="bg-white rounded-xl shadow-md overflow-hidden">
			<div class="p-4 border-b border-gray-100 bg-red-50">
				<div class="flex items-center gap-2">
					<Key size={20} class="text-red-600" />
					<h2 class="font-semibold text-gray-800">APIキー設定</h2>
				</div>
			</div>
			<div class="p-6">
				{#if data.settings?.hasApiKey}
					<div class="flex items-center gap-3 mb-4">
						<CheckCircle size={20} class="text-green-600" />
						<span class="text-green-700">APIキーが設定されています</span>
					</div>
				{/if}

				<form
					method="POST"
					action="?/saveApiKey"
					use:enhance={() => {
						savingApiKey = true;
						return async ({ update }) => {
							savingApiKey = false;
							apiKeyInput = '';
							await update();
						};
					}}
				>
					<div class="space-y-4">
						<div>
							<label for="api_key" class="block text-sm font-medium text-gray-700 mb-1">
								{data.settings?.hasApiKey ? '新しいAPIキー（変更する場合）' : 'YouTube Data API キー'}
							</label>
							<input
								type="password"
								id="api_key"
								name="api_key"
								bind:value={apiKeyInput}
								placeholder="AIza..."
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
							/>
						</div>
						<div class="flex items-center gap-4">
							<button
								type="submit"
								disabled={savingApiKey || !apiKeyInput}
								class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
							>
								{savingApiKey ? '保存中...' : '保存'}
							</button>
							<a
								href="https://console.cloud.google.com/apis/credentials"
								target="_blank"
								rel="noopener noreferrer"
								class="text-sm text-red-600 hover:text-red-700 underline"
							>
								APIキーの取得方法
							</a>
						</div>
					</div>
				</form>
			</div>
		</section>

		<!-- Add Channel Section -->
		{#if data.settings?.hasApiKey}
			<section class="bg-white rounded-xl shadow-md overflow-hidden">
				<div class="p-4 border-b border-gray-100 bg-red-50">
					<div class="flex items-center gap-2">
						<Plus size={20} class="text-red-600" />
						<h2 class="font-semibold text-gray-800">チャンネルを追加</h2>
					</div>
				</div>
				<div class="p-6">
					<form
						method="POST"
						action="?/addChannel"
						use:enhance={() => {
							addingChannel = true;
							return async ({ update }) => {
								addingChannel = false;
								channelInput = '';
								await update();
							};
						}}
					>
						<div class="flex gap-3">
							<input
								type="text"
								name="channel_input"
								bind:value={channelInput}
								placeholder="@satomata48etfmania または UCxxxxxx"
								class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
							/>
							<button
								type="submit"
								disabled={addingChannel || !channelInput}
								class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
							>
								<Plus size={18} />
								{addingChannel ? '追加中...' : '追加'}
							</button>
						</div>
						<p class="mt-2 text-sm text-gray-500">
							チャンネルハンドル（@xxx）またはチャンネルID（UCxxx）を入力してください
						</p>
					</form>
				</div>
			</section>
		{/if}

		<!-- Registered Channels -->
		<section class="bg-white rounded-xl shadow-md overflow-hidden">
			<div class="p-4 border-b border-gray-100 bg-red-50">
				<div class="flex items-center gap-2">
					<Youtube size={20} class="text-red-600" />
					<h2 class="font-semibold text-gray-800">登録チャンネル</h2>
					<span class="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-sm">
						{data.channels.length}件
					</span>
				</div>
			</div>
			<div class="p-6">
				{#if data.channels.length === 0}
					<div class="text-center py-8">
						<Youtube size={48} class="mx-auto text-gray-300 mb-4" />
						<p class="text-gray-500">登録されているチャンネルはありません</p>
						{#if data.settings?.hasApiKey}
							<p class="text-sm text-gray-400 mt-2">上のフォームからチャンネルを追加してください</p>
						{:else}
							<p class="text-sm text-gray-400 mt-2">まずAPIキーを設定してください</p>
						{/if}
					</div>
				{:else}
					<div class="space-y-4">
						{#each data.channels as channel}
							{@const stats = data.stats[channel.id]}
							<div class="border border-gray-200 rounded-xl p-4 hover:border-red-200 transition-colors">
								<div class="flex items-start gap-4">
									<!-- Thumbnail -->
									{#if channel.thumbnail_url}
										<img
											src={channel.thumbnail_url}
											alt={channel.channel_name || 'Channel'}
											class="w-16 h-16 rounded-full object-cover"
										/>
									{:else}
										<div class="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
											<Youtube size={24} class="text-gray-400" />
										</div>
									{/if}

									<!-- Channel Info -->
									<div class="flex-1">
										<div class="flex items-center gap-2 mb-1">
											<h3 class="font-semibold text-gray-800">{channel.channel_name || 'Unknown Channel'}</h3>
											{#if channel.channel_handle}
												<span class="text-sm text-gray-500">{channel.channel_handle}</span>
											{/if}
										</div>

										<!-- Stats -->
										{#if stats}
											<div class="flex items-center gap-6 mt-3">
												<div class="flex items-center gap-2">
													<Users size={16} class="text-gray-400" />
													<span class="text-sm">
														<span class="font-semibold text-gray-700">{formatNumber(stats.subscriber_count)}</span>
														<span class="text-gray-500"> 登録者</span>
													</span>
												</div>
												<div class="flex items-center gap-2">
													<Eye size={16} class="text-gray-400" />
													<span class="text-sm">
														<span class="font-semibold text-gray-700">{formatNumber(stats.view_count)}</span>
														<span class="text-gray-500"> 再生</span>
													</span>
												</div>
												<div class="flex items-center gap-2">
													<Video size={16} class="text-gray-400" />
													<span class="text-sm">
														<span class="font-semibold text-gray-700">{stats.video_count}</span>
														<span class="text-gray-500"> 動画</span>
													</span>
												</div>
											</div>
											<p class="text-xs text-gray-400 mt-2">最終更新: {stats.recorded_date}</p>
										{/if}
									</div>

									<!-- Actions -->
									<div class="flex items-center gap-2">
										<form
											method="POST"
											action="?/refreshStats"
											use:enhance={() => {
												refreshingChannels[channel.id] = true;
												return async ({ update }) => {
													refreshingChannels[channel.id] = false;
													await update();
												};
											}}
										>
											<input type="hidden" name="channel_id" value={channel.id} />
											<button
												type="submit"
												disabled={refreshingChannels[channel.id]}
												class="p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors disabled:opacity-50"
												title="統計を更新"
											>
												<RefreshCw size={18} class={refreshingChannels[channel.id] ? 'animate-spin' : ''} />
											</button>
										</form>

										<form
											method="POST"
											action="?/deleteChannel"
											use:enhance={() => {
												if (!confirm(`${channel.channel_name} を削除しますか？`)) {
													return async () => {};
												}
												return async ({ update }) => {
													await update();
												};
											}}
										>
											<input type="hidden" name="channel_id" value={channel.id} />
											<button
												type="submit"
												class="p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
												title="チャンネルを削除"
											>
												<Trash2 size={18} />
											</button>
										</form>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</section>

		<!-- Help Section -->
		<section class="bg-red-50 rounded-xl p-6 border border-red-200">
			<h3 class="font-semibold text-red-900 mb-3">YouTube Data API について</h3>
			<ul class="text-sm text-red-800 space-y-2">
				<li>1. <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" class="underline">Google Cloud Console</a> でプロジェクトを作成</li>
				<li>2. 「APIとサービス」→「ライブラリ」で「YouTube Data API v3」を有効化</li>
				<li>3. 「認証情報」→「+ 認証情報を作成」→「APIキー」で発行</li>
				<li>4. 無料枠: 1日10,000クォータ（個人利用には十分です）</li>
			</ul>
		</section>
	</main>
</div>
