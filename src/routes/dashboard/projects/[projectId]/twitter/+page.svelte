<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { Twitter, Save, X, Check, Users, MessageSquare, Send, Key, Link, RefreshCw, TrendingUp, Download, Upload } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showAddAccount = $state(!data.account);
	let showAddStats = $state(false);
	let showEditSettings = $state(false);
	let updatingStats = $state(false);

	function handleFormSubmit() {
		return async ({ result }: { result: { type: string } }) => {
			if (result.type === 'success' || result.type === 'redirect') {
				showAddAccount = false;
				showAddStats = false;
				await invalidateAll();
			}
		};
	}
</script>

<svelte:head>
	<title>Twitter/X設定 - {data.project.title}</title>
</svelte:head>

<div class="p-6 max-w-4xl mx-auto space-y-6">
	<!-- ヘッダー -->
	<div class="mb-6">
		<div class="flex items-center justify-between">
			<div>
				<h2 class="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
					<Twitter size={28} class="text-sky-600" />
					Twitter/X 設定
				</h2>
				<p class="text-gray-600">アカウント情報と統計を管理</p>
			</div>
			<div class="flex gap-2">
				<a
					href="/dashboard/projects/{data.project.id}/twitter/stats"
					class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
				>
					<TrendingUp size={18} />
					詳細統計
				</a>
				<a
					href="/dashboard/projects/{data.project.id}/twitter/import"
					class="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
				>
					<Upload size={18} />
					CSVインポート
				</a>
			</div>
		</div>
	</div>

	<!-- API認証設定 -->
	<div class="bg-white rounded-xl shadow-md p-6 mb-6">
		<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
			<Key size={20} class="text-sky-600" />
			Twitter API 認証設定
		</h3>

		{#if data.settings && !showEditSettings}
			<div class="space-y-3">
				<div class="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
					<p class="text-sm text-emerald-700 mb-2">✓ API認証設定済み</p>
					<div class="grid grid-cols-2 gap-2 text-xs text-gray-600">
						<div>API Key: ****{data.settings.api_key_last4}</div>
						<div>API Secret: ****{data.settings.api_secret_last4}</div>
						<div>Access Token: ****{data.settings.access_token_last4}</div>
						<div>Access Token Secret: ****{data.settings.access_token_secret_last4}</div>
					</div>
				</div>
				<div class="flex gap-2">
					<button
						onclick={() => showEditSettings = true}
						class="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
					>
						編集
					</button>
					<form method="POST" action="?/testConnection" use:enhance={handleFormSubmit}>
						<button
							type="submit"
							class="px-4 py-2 border border-sky-600 text-sky-600 rounded-lg hover:bg-sky-50 transition-colors"
						>
							接続をテスト
						</button>
					</form>
				</div>
			</div>
		{:else}
			<form method="POST" action="?/saveSettings" use:enhance={handleFormSubmit} class="space-y-4">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							API Key (Consumer Key) <span class="text-red-500">*</span>
						</label>
						<input
							type="password"
							name="api_key"
							required
							placeholder="API Key"
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							API Secret (Consumer Secret) <span class="text-red-500">*</span>
						</label>
						<input
							type="password"
							name="api_secret"
							required
							placeholder="API Secret"
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Access Token <span class="text-red-500">*</span>
						</label>
						<input
							type="password"
							name="access_token"
							required
							placeholder="Access Token"
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Access Token Secret <span class="text-red-500">*</span>
						</label>
						<input
							type="password"
							name="access_token_secret"
							required
							placeholder="Access Token Secret"
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
						/>
					</div>
				</div>
				<div class="flex gap-2">
					<button
						type="submit"
						class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
					>
						<Save size={18} />
						保存
					</button>
					{#if data.settings}
						<button
							type="button"
							onclick={() => showEditSettings = false}
							class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
						>
							キャンセル
						</button>
					{/if}
				</div>
			</form>
		{/if}
	</div>

	<!-- OAuth連携（統計取得用） -->
	<div class="bg-white rounded-xl shadow-md p-6 mb-6">
		<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
			<Link size={20} class="text-sky-600" />
			Twitter OAuth連携（統計取得用）
		</h3>

		{#if !data.settings}
			<div class="p-4 bg-amber-50 rounded-lg border border-amber-200">
				<p class="text-sm text-amber-700">⚠️ まずAPI認証設定を保存してください</p>
			</div>
		{:else if data.oauthConnected}
			<div class="space-y-4">
				<div class="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
					<p class="text-sm text-emerald-700 mb-2">✓ Twitter連携済み</p>
					<p class="text-xs text-gray-600">アカウント: @{data.oauthInfo?.twitter_screen_name}</p>
					<p class="text-xs text-gray-500 mt-1">
						連携日時: {new Date(data.oauthInfo?.created_at).toLocaleString('ja-JP')}
					</p>
				</div>

				<!-- 統計表示 -->
				{#if data.accountStats && data.accountStats.length > 0}
					{@const latestStat = data.accountStats[0]}
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div class="p-4 bg-gradient-to-br from-sky-50 to-sky-100 rounded-lg">
							<p class="text-sm text-gray-600 mb-1">フォロワー</p>
							<p class="text-2xl font-bold text-sky-700">{latestStat.followers_count.toLocaleString()}</p>
							{#if latestStat.followers_change !== 0}
								<p class="text-xs {latestStat.followers_change > 0 ? 'text-emerald-600' : 'text-red-600'} mt-1">
									{latestStat.followers_change > 0 ? '+' : ''}{latestStat.followers_change}
								</p>
							{/if}
						</div>
						<div class="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
							<p class="text-sm text-gray-600 mb-1">フォロー</p>
							<p class="text-2xl font-bold text-purple-700">{latestStat.following_count.toLocaleString()}</p>
							{#if latestStat.following_change !== 0}
								<p class="text-xs {latestStat.following_change > 0 ? 'text-emerald-600' : 'text-red-600'} mt-1">
									{latestStat.following_change > 0 ? '+' : ''}{latestStat.following_change}
								</p>
							{/if}
						</div>
						<div class="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg">
							<p class="text-sm text-gray-600 mb-1">ツイート数</p>
							<p class="text-2xl font-bold text-emerald-700">{latestStat.tweet_count.toLocaleString()}</p>
							{#if latestStat.tweet_change !== 0}
								<p class="text-xs {latestStat.tweet_change > 0 ? 'text-emerald-600' : 'text-red-600'} mt-1">
									{latestStat.tweet_change > 0 ? '+' : ''}{latestStat.tweet_change}
								</p>
							{/if}
						</div>
					</div>
				{/if}

				<div class="flex gap-2">
					<form method="POST" action="?/fetchStats" use:enhance={() => {
						updatingStats = true;
						return async ({ result }) => {
							updatingStats = false;
							if (result.type === 'success') {
								await invalidateAll();
							}
						};
					}}>
						<button
							type="submit"
							disabled={updatingStats}
							class="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 transition-colors"
						>
							<RefreshCw size={18} class={updatingStats ? 'animate-spin' : ''} />
							{updatingStats ? '更新中...' : '統計を更新'}
						</button>
					</form>
					<form method="POST" action="?/disconnectOAuth" use:enhance={handleFormSubmit}>
						<button
							type="submit"
							class="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
						>
							連携解除
						</button>
					</form>
				</div>
			</div>
		{:else}
			<div class="space-y-4">
				<p class="text-sm text-gray-600">
					Twitterと連携して、フォロワー数やツイート数などの統計情報を自動取得できます。
				</p>
				<form method="POST" action="?/initiateOAuth">
					<button
						type="submit"
						class="flex items-center gap-2 px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
					>
						<Twitter size={20} />
						Twitterで連携する
					</button>
				</form>
			</div>
		{/if}
	</div>

	<!-- アカウント情報 -->
	<div class="bg-white rounded-xl shadow-md p-6">
		<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
			<Users size={20} class="text-sky-600" />
			アカウント情報
		</h3>

		{#if data.account && !showAddAccount}
			<div class="space-y-4">
				<div class="flex items-start justify-between p-4 bg-sky-50 rounded-lg border border-sky-200">
					<div class="flex-1">
						<p class="text-sm text-gray-600 mb-1">ユーザー名</p>
						<p class="font-semibold text-gray-800">@{data.account.username}</p>
						{#if data.account.name}
							<p class="text-sm text-gray-600 mt-2">表示名: {data.account.name}</p>
						{/if}
					</div>
					<button
						onclick={() => showAddAccount = true}
						class="px-3 py-1.5 text-sm text-sky-600 hover:bg-sky-100 rounded-lg transition-colors"
					>
						編集
					</button>
				</div>

				{#if data.latestStats}
					<div class="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
						<div>
							<p class="text-xs text-gray-600 mb-1">フォロワー</p>
							<p class="text-xl font-bold text-gray-800">{data.latestStats.followers_count?.toLocaleString() || 0}</p>
						</div>
						<div>
							<p class="text-xs text-gray-600 mb-1">フォロー中</p>
							<p class="text-xl font-bold text-gray-800">{data.latestStats.following_count?.toLocaleString() || 0}</p>
						</div>
						<div>
							<p class="text-xs text-gray-600 mb-1">ツイート</p>
							<p class="text-xl font-bold text-gray-800">{data.latestStats.tweet_count?.toLocaleString() || 0}</p>
						</div>
					</div>
					<div class="flex gap-2">
						<a
							href="/dashboard/projects/{data.project.id}/twitter/post"
							class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors font-semibold"
						>
							<Send size={18} />
							投稿する
						</a>
						<button
							onclick={() => showAddStats = true}
							class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
						>
							統計を更新
						</button>
					</div>
				{:else}
					<div class="flex gap-2">
						<a
							href="/dashboard/projects/{data.project.id}/twitter/post"
							class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors font-semibold"
						>
							<Send size={18} />
							投稿する
						</a>
					<form method="POST" action="?/fetchStats" use:enhance={handleFormSubmit}>
							<button
								type="submit"
								class="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
							>
								<Download size={18} />
								統計を自動取得
							</button>
						</form>
						<button
							onclick={() => showAddStats = true}
							class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
						>
							統計を追加
						</button>
					</div>
				{/if}
			</div>
		{:else}
			<form method="POST" action="?/saveAccount" use:enhance={handleFormSubmit} class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						ユーザー名 <span class="text-red-500">*</span>
					</label>
					<div class="flex items-center gap-2">
						<span class="text-gray-600">@</span>
						<input
							type="text"
							name="username"
							value={data.account?.username || ''}
							required
							placeholder="username"
							class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
						/>
					</div>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						表示名
					</label>
					<input
						type="text"
						name="name"
						value={data.account?.name || ''}
						placeholder="表示名（任意）"
						class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
					/>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						アカウントID
					</label>
					<input
						type="text"
						name="account_id"
						value={data.account?.account_id || ''}
						placeholder="数字のアカウントID（任意）"
						class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
					/>
				</div>

				<div class="flex gap-2">
					<button
						type="submit"
						class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
					>
						<Save size={18} />
						保存
					</button>
					{#if data.account}
						<button
							type="button"
							onclick={() => showAddAccount = false}
							class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
						>
							キャンセル
						</button>
					{/if}
				</div>
			</form>
		{/if}
	</div>

	<!-- 統計更新フォーム -->
	{#if showAddStats && data.account}
		<div class="bg-white rounded-xl shadow-md p-6 border border-sky-200">
			<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
				<MessageSquare size={20} class="text-sky-600" />
				統計を更新
			</h3>

			<form method="POST" action="?/updateStats" use:enhance={handleFormSubmit} class="space-y-4">
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							フォロワー数 <span class="text-red-500">*</span>
						</label>
						<input
							type="number"
							name="followers_count"
							value={data.latestStats?.followers_count || 0}
							required
							min="0"
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							フォロー中
						</label>
						<input
							type="number"
							name="following_count"
							value={data.latestStats?.following_count || 0}
							min="0"
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							ツイート数
						</label>
						<input
							type="number"
							name="tweet_count"
							value={data.latestStats?.tweet_count || 0}
							min="0"
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
						/>
					</div>
				</div>

				<div class="flex gap-2">
					<button
						type="submit"
						class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
					>
						<Check size={18} />
						統計を保存
					</button>
					<button
						type="button"
						onclick={() => showAddStats = false}
						class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
					>
						<X size={18} />
						キャンセル
					</button>
				</div>
			</form>
		</div>
	{/if}

	{#if form?.error}
		<div class="bg-red-50 border border-red-200 rounded-lg p-4">
			<p class="text-red-700">{form.error}</p>
		</div>
	{/if}

	{#if form?.success}
		<div class="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
			<p class="text-emerald-700">保存しました</p>
		</div>
	{/if}
</div>
