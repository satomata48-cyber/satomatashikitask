<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { Users, Youtube, Instagram, ExternalLink, TrendingUp, Eye, ThumbsUp, Video, Twitter, Music, Settings, Key, Save, Facebook, MessageCircle } from 'lucide-svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showEditSettings = $state(false);
	let isSubmitting = $state(false);
	let isFetching = $state(false);

	function handleFormSubmit() {
		return ({ update, result }: any) => {
			isSubmitting = true;
			update().then(() => {
				isSubmitting = false;
				if (result.type === 'success' && result.data?.success) {
					showEditSettings = false;
				}
			});
		};
	}

	function handleFetchData() {
		return ({ update }: any) => {
			isFetching = true;
			update().then(() => {
				isFetching = false;
			});
		};
	}
</script>

<svelte:head>
	<title>SNS管理 - {data.project.title}</title>
</svelte:head>

<div class="p-6 space-y-6">
	<!-- ヘッダー -->
	<div class="mb-6">
		<h2 class="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
			<Users size={28} class="text-pink-600" />
			SNS管理
		</h2>
		<p class="text-gray-600">SNSアカウントの統計と分析</p>
	</div>

	<!-- Meta API設定 (Facebook/Instagram/Threads) -->
	<div class="bg-white rounded-xl shadow-md p-6 mb-6">
		<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
			<Key size={20} class="text-blue-600" />
			Meta API 認証設定 (Facebook/Instagram/Threads)
		</h3>

		{#if form?.success}
			<div class="mb-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
				<p class="text-sm text-emerald-700">{form.message}</p>
			</div>
		{:else if form?.error}
			<div class="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
				<p class="text-sm text-red-700">{form.error}</p>
			</div>
		{/if}

		{#if data.metaSettings?.hasSettings && !showEditSettings}
			<div class="space-y-4">
				<div class="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
					<p class="text-sm text-emerald-700 mb-2">✓ API認証設定済み</p>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
						<div>App ID: ****{data.metaSettings.app_id_last4}</div>
						<div>ステータス: {data.metaSettings.enabled ? '有効' : '無効'}</div>
					</div>
				</div>
				<div class="flex gap-2">
					<button
						onclick={() => showEditSettings = true}
						class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
					>
						編集
					</button>
					<form method="POST" action="?/fetchMetaData" use:enhance={handleFetchData}>
						<button
							type="submit"
							disabled={isFetching}
							class="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm disabled:opacity-50"
						>
							{isFetching ? 'データ取得中...' : 'データを取得'}
						</button>
					</form>
				</div>
			</div>
		{:else}
			<form method="POST" action="?/saveMetaSettings" use:enhance={handleFormSubmit} class="space-y-4">
				<div class="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
					<p class="text-sm text-blue-700 mb-2">
						<strong>Facebook Developersでの設定:</strong>
					</p>
					<ol class="text-xs text-blue-600 space-y-1 list-decimal list-inside">
						<li>Facebook Developers (<a href="https://developers.facebook.com" target="_blank" class="underline">https://developers.facebook.com</a>) にアクセス</li>
						<li>アプリのダッシュボードで「App ID」と「App Secret」を取得</li>
						<li>Graph API Explorer (<a href="https://developers.facebook.com/tools/explorer" target="_blank" class="underline">https://developers.facebook.com/tools/explorer</a>) でUser Access Tokenを生成</li>
						<li>必要な権限: pages_show_list, pages_read_engagement, instagram_basic, instagram_manage_insights, threads_basic, threads_read_replies</li>
					</ol>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							App ID <span class="text-red-500">*</span>
						</label>
						<input
							type="text"
							name="app_id"
							required
							placeholder="1234567890123456"
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							App Secret <span class="text-red-500">*</span>
						</label>
						<input
							type="password"
							name="app_secret"
							required
							placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
						/>
					</div>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						User Access Token <span class="text-red-500">*</span>
					</label>
					<textarea
						name="access_token"
						required
						placeholder="EAAxxxxxxxxxxxxxx..."
						rows="3"
						class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs"
					></textarea>
					<p class="text-xs text-gray-500 mt-1">Graph API Explorerで生成したUser Access Tokenを貼り付けてください</p>
				</div>
				<div class="flex gap-2">
					<button
						type="submit"
						disabled={isSubmitting}
						class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
					>
						<Save size={18} />
						{isSubmitting ? '保存中...' : '保存'}
					</button>
					{#if data.metaSettings?.hasSettings}
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

	<!-- SNS連携カード -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
		<!-- YouTube -->
		<div class="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl shadow-md p-6 border border-red-200">
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center gap-2">
					<div class="p-2 bg-red-100 rounded-lg">
						<Youtube size={24} class="text-red-600" />
					</div>
					<h3 class="font-semibold text-gray-800">YouTube</h3>
				</div>
				{#if data.youtubeChannel}
					<span class="px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-full">
						連携済み
					</span>
				{:else}
					<span class="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 border border-gray-300 rounded-full">
						未連携
					</span>
				{/if}
			</div>

			{#if data.youtubeChannel}
				<div class="space-y-3 mb-4">
					<div>
						<p class="text-xs text-gray-600 mb-1">チャンネル名</p>
						<p class="font-semibold text-gray-800">{data.youtubeChannel.channel_name}</p>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div>
							<p class="text-xs text-gray-600 mb-1">登録者数</p>
							<p class="text-lg font-bold text-gray-800">{data.youtubeChannel.subscriber_count?.toLocaleString() || 0}</p>
						</div>
						<div>
							<p class="text-xs text-gray-600 mb-1">動画数</p>
							<p class="text-lg font-bold text-gray-800">{data.youtubeChannel.video_count?.toLocaleString() || 0}</p>
						</div>
					</div>
					<div>
						<p class="text-xs text-gray-600 mb-1">総再生回数</p>
						<p class="text-lg font-bold text-gray-800">{data.youtubeChannel.view_count?.toLocaleString() || 0}</p>
					</div>
				</div>
				<a
					href="/dashboard/projects/{data.project.id}/analytics"
					class="flex items-center justify-center gap-2 w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
				>
					<ExternalLink size={14} />
					詳細分析を見る
				</a>
			{:else}
				<div class="text-center py-6">
					<p class="text-sm text-gray-600 mb-4">YouTubeチャンネルを連携して統計を取得しましょう</p>
					<a
						href="/dashboard/projects/{data.project.id}/analytics"
						class="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
					>
						<Youtube size={16} />
						連携する
					</a>
				</div>
			{/if}
		</div>

		<!-- Instagram (Meta API) -->
		<div class="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl shadow-md p-6 border border-pink-200">
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center gap-2">
					<div class="p-2 bg-pink-100 rounded-lg">
						<Instagram size={24} class="text-pink-600" />
					</div>
					<h3 class="font-semibold text-gray-800">Instagram</h3>
				</div>
				{#if data.instagramBusinessAccount || data.instagramAccount}
					<span class="px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-full">
						連携済み
					</span>
				{:else}
					<span class="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 border border-gray-300 rounded-full">
						未連携
					</span>
				{/if}
			</div>

			{#if data.instagramBusinessAccount}
				<!-- Meta API経由のデータ -->
				<div class="space-y-3 mb-4">
					<div>
						<p class="text-xs text-gray-600 mb-1">アカウント名</p>
						<p class="font-semibold text-gray-800">@{data.instagramBusinessAccount.username}</p>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div>
							<p class="text-xs text-gray-600 mb-1">フォロワー数</p>
							<p class="text-lg font-bold text-gray-800">{data.instagramBusinessAccount.followers_count?.toLocaleString() || 0}</p>
						</div>
						<div>
							<p class="text-xs text-gray-600 mb-1">投稿数</p>
							<p class="text-lg font-bold text-gray-800">{data.instagramBusinessAccount.media_count?.toLocaleString() || 0}</p>
						</div>
					</div>
					<div class="text-xs text-blue-600">
						<a href="https://www.instagram.com/{data.instagramBusinessAccount.username}" target="_blank" class="underline">
							Instagramで見る
						</a>
					</div>
				</div>
			{:else if data.instagramAccount}
				<!-- 既存のデータ -->
				<div class="space-y-3 mb-4">
					<div>
						<p class="text-xs text-gray-600 mb-1">アカウント名</p>
						<p class="font-semibold text-gray-800">{data.instagramAccount.username}</p>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div>
							<p class="text-xs text-gray-600 mb-1">フォロワー数</p>
							<p class="text-lg font-bold text-gray-800">{data.instagramAccount.followers_count?.toLocaleString() || 0}</p>
						</div>
						<div>
							<p class="text-xs text-gray-600 mb-1">投稿数</p>
							<p class="text-lg font-bold text-gray-800">{data.instagramAccount.media_count?.toLocaleString() || 0}</p>
						</div>
					</div>
				</div>
			{:else}
				<div class="text-center py-6">
					<p class="text-sm text-gray-600 mb-4">Meta APIでInstagramを連携しましょう</p>
					<p class="text-xs text-gray-500">上部の「Meta API 認証設定」からデータを取得</p>
				</div>
			{/if}
		</div>

		<!-- Facebook Page -->
		<div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-md p-6 border border-blue-200">
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center gap-2">
					<div class="p-2 bg-blue-100 rounded-lg">
						<Facebook size={24} class="text-blue-600" />
					</div>
					<h3 class="font-semibold text-gray-800">Facebook</h3>
				</div>
				{#if data.facebookPage}
					<span class="px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-full">
						連携済み
					</span>
				{:else}
					<span class="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 border border-gray-300 rounded-full">
						未連携
					</span>
				{/if}
			</div>

			{#if data.facebookPage}
				<div class="space-y-3 mb-4">
					<div>
						<p class="text-xs text-gray-600 mb-1">ページ名</p>
						<p class="font-semibold text-gray-800">{data.facebookPage.page_name}</p>
					</div>
					{#if data.facebookPage.category}
						<div>
							<p class="text-xs text-gray-600 mb-1">カテゴリ</p>
							<p class="text-sm text-gray-700">{data.facebookPage.category}</p>
						</div>
					{/if}
					<div>
						<p class="text-xs text-gray-600 mb-1">フォロワー数</p>
						<p class="text-lg font-bold text-gray-800">{data.facebookPage.followers_count?.toLocaleString() || 0}</p>
					</div>
					<div class="text-xs text-blue-600">
						<a href="https://www.facebook.com/{data.facebookPage.page_id}" target="_blank" class="underline">
							Facebookで見る
						</a>
					</div>
				</div>
			{:else}
				<div class="text-center py-6">
					<p class="text-sm text-gray-600 mb-4">Meta APIでFacebookページを連携しましょう</p>
					<p class="text-xs text-gray-500">上部の「Meta API 認証設定」からデータを取得</p>
				</div>
			{/if}
		</div>

		<!-- Threads -->
		<div class="bg-gradient-to-br from-slate-50 to-zinc-50 rounded-xl shadow-md p-6 border border-slate-200">
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center gap-2">
					<div class="p-2 bg-slate-100 rounded-lg">
						<MessageCircle size={24} class="text-slate-600" />
					</div>
					<h3 class="font-semibold text-gray-800">Threads</h3>
				</div>
				{#if data.metaSettings?.hasSettings}
					<span class="px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-full">
						連携済み
					</span>
				{:else}
					<span class="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 border border-gray-300 rounded-full">
						未連携
					</span>
				{/if}
			</div>

			{#if data.metaSettings?.hasSettings}
				<div class="text-center py-6">
					<p class="text-sm text-gray-600 mb-2">Threads投稿を取得できます</p>
					<p class="text-xs text-gray-500">「データを取得」ボタンで最新の投稿を取得</p>
				</div>
			{:else}
				<div class="text-center py-6">
					<p class="text-sm text-gray-600 mb-4">Meta APIでThreadsを連携しましょう</p>
					<p class="text-xs text-gray-500">上部の「Meta API 認証設定」からデータを取得</p>
				</div>
			{/if}
		</div>

		<!-- Twitter/X -->
		<div class="bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl shadow-md p-6 border border-sky-200">
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center gap-2">
					<div class="p-2 bg-sky-100 rounded-lg">
						<Twitter size={24} class="text-sky-600" />
					</div>
					<h3 class="font-semibold text-gray-800">Twitter/X</h3>
				</div>
				{#if data.twitterAccount}
					<span class="px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-full">
						連携済み
					</span>
				{:else}
					<span class="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 border border-gray-300 rounded-full">
						未連携
					</span>
				{/if}
			</div>

			{#if data.twitterAccount}
				<div class="space-y-3 mb-4">
					<div>
						<p class="text-xs text-gray-600 mb-1">アカウント名</p>
						<p class="font-semibold text-gray-800">@{data.twitterAccount.username}</p>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div>
							<p class="text-xs text-gray-600 mb-1">フォロワー数</p>
							<p class="text-lg font-bold text-gray-800">{data.twitterAccount.followers_count?.toLocaleString() || 0}</p>
						</div>
						<div>
							<p class="text-xs text-gray-600 mb-1">ツイート数</p>
							<p class="text-lg font-bold text-gray-800">{data.twitterAccount.tweet_count?.toLocaleString() || 0}</p>
						</div>
					</div>
				</div>
			{:else}
				<div class="text-center py-6">
					<p class="text-sm text-gray-600 mb-4">Twitter/Xアカウントを連携して統計を取得しましょう</p>
					<a
						href="/dashboard/projects/{data.project.id}/twitter"
						class="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors text-sm"
					>
						<Twitter size={16} />
						連携する
					</a>
				</div>
			{/if}
		</div>

		<!-- TikTok -->
		<div class="bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-xl shadow-md p-6 border border-violet-200">
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center gap-2">
					<div class="p-2 bg-violet-100 rounded-lg">
						<Music size={24} class="text-violet-600" />
					</div>
					<h3 class="font-semibold text-gray-800">TikTok</h3>
				</div>
				{#if data.tiktokAccount}
					<span class="px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-full">
						連携済み
					</span>
				{:else}
					<span class="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 border border-gray-300 rounded-full">
						未連携
					</span>
				{/if}
			</div>

			{#if data.tiktokAccount}
				<div class="space-y-3 mb-4">
					<div>
						<p class="text-xs text-gray-600 mb-1">アカウント名</p>
						<p class="font-semibold text-gray-800">@{data.tiktokAccount.username}</p>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div>
							<p class="text-xs text-gray-600 mb-1">フォロワー数</p>
							<p class="text-lg font-bold text-gray-800">{data.tiktokAccount.followers_count?.toLocaleString() || 0}</p>
						</div>
						<div>
							<p class="text-xs text-gray-600 mb-1">いいね数</p>
							<p class="text-lg font-bold text-gray-800">{data.tiktokAccount.likes_count?.toLocaleString() || 0}</p>
						</div>
					</div>
					<div>
						<p class="text-xs text-gray-600 mb-1">動画数</p>
						<p class="text-lg font-bold text-gray-800">{data.tiktokAccount.video_count?.toLocaleString() || 0}</p>
					</div>
				</div>
			{:else}
				<div class="text-center py-6">
					<p class="text-sm text-gray-600 mb-4">TikTokアカウントを連携して統計を取得しましょう</p>
					<a
						href="/dashboard/projects/{data.project.id}/tiktok"
						class="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm"
					>
						<Music size={16} />
						連携する
					</a>
				</div>
			{/if}
		</div>
	</div>

	<!-- 統計サマリー -->
	{#if data.youtubeChannel || data.instagramAccount || data.twitterAccount || data.tiktokAccount}
		<div class="bg-white rounded-xl shadow-md p-6">
			<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
				<TrendingUp size={20} class="text-indigo-600" />
				統計サマリー
			</h3>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{#if data.youtubeChannel}
					<div class="p-4 bg-red-50 rounded-lg border border-red-200">
						<div class="flex items-center gap-2 mb-2">
							<Youtube size={16} class="text-red-600" />
							<span class="text-xs font-medium text-red-700">YouTube登録者</span>
						</div>
						<p class="text-2xl font-bold text-gray-800">{data.youtubeChannel.subscriber_count?.toLocaleString() || 0}</p>
					</div>
					<div class="p-4 bg-orange-50 rounded-lg border border-orange-200">
						<div class="flex items-center gap-2 mb-2">
							<Eye size={16} class="text-orange-600" />
							<span class="text-xs font-medium text-orange-700">YouTube総再生</span>
						</div>
						<p class="text-2xl font-bold text-gray-800">{data.youtubeChannel.view_count?.toLocaleString() || 0}</p>
					</div>
				{/if}
				{#if data.instagramAccount}
					<div class="p-4 bg-pink-50 rounded-lg border border-pink-200">
						<div class="flex items-center gap-2 mb-2">
							<Users size={16} class="text-pink-600" />
							<span class="text-xs font-medium text-pink-700">Instagramフォロワー</span>
						</div>
						<p class="text-2xl font-bold text-gray-800">{data.instagramAccount.followers_count?.toLocaleString() || 0}</p>
					</div>
					<div class="p-4 bg-purple-50 rounded-lg border border-purple-200">
						<div class="flex items-center gap-2 mb-2">
							<Video size={16} class="text-purple-600" />
							<span class="text-xs font-medium text-purple-700">Instagram投稿</span>
						</div>
						<p class="text-2xl font-bold text-gray-800">{data.instagramAccount.media_count?.toLocaleString() || 0}</p>
					</div>
				{/if}
				{#if data.twitterAccount}
					<div class="p-4 bg-sky-50 rounded-lg border border-sky-200">
						<div class="flex items-center gap-2 mb-2">
							<Twitter size={16} class="text-sky-600" />
							<span class="text-xs font-medium text-sky-700">Xフォロワー</span>
						</div>
						<p class="text-2xl font-bold text-gray-800">{data.twitterAccount.followers_count?.toLocaleString() || 0}</p>
					</div>
				{/if}
				{#if data.tiktokAccount}
					<div class="p-4 bg-violet-50 rounded-lg border border-violet-200">
						<div class="flex items-center gap-2 mb-2">
							<Music size={16} class="text-violet-600" />
							<span class="text-xs font-medium text-violet-700">TikTokフォロワー</span>
						</div>
						<p class="text-2xl font-bold text-gray-800">{data.tiktokAccount.followers_count?.toLocaleString() || 0}</p>
					</div>
					<div class="p-4 bg-fuchsia-50 rounded-lg border border-fuchsia-200">
						<div class="flex items-center gap-2 mb-2">
							<ThumbsUp size={16} class="text-fuchsia-600" />
							<span class="text-xs font-medium text-fuchsia-700">TikTokいいね</span>
						</div>
						<p class="text-2xl font-bold text-gray-800">{data.tiktokAccount.likes_count?.toLocaleString() || 0}</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- クイックアクション -->
	<div class="bg-white rounded-xl shadow-md p-6">
		<h3 class="text-lg font-semibold text-gray-800 mb-4">クイックアクション</h3>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
			<a
				href="/dashboard/projects/{data.project.id}/analytics"
				class="p-4 bg-red-50 rounded-lg border border-red-200 hover:border-red-400 hover:shadow-sm transition-all text-center"
			>
				<Youtube size={24} class="mx-auto text-red-600 mb-2" />
				<p class="text-sm font-medium text-gray-800">YouTube分析</p>
			</a>
			<a
				href="/dashboard/projects/{data.project.id}/instagram"
				class="p-4 bg-pink-50 rounded-lg border border-pink-200 hover:border-pink-400 hover:shadow-sm transition-all text-center"
			>
				<Instagram size={24} class="mx-auto text-pink-600 mb-2" />
				<p class="text-sm font-medium text-gray-800">Instagram分析</p>
			</a>
			<a
				href="/dashboard/projects/{data.project.id}/twitter"
				class="p-4 bg-sky-50 rounded-lg border border-sky-200 hover:border-sky-400 hover:shadow-sm transition-all text-center"
			>
				<Twitter size={24} class="mx-auto text-sky-600 mb-2" />
				<p class="text-sm font-medium text-gray-800">Twitter/X設定</p>
			</a>
			<a
				href="/dashboard/projects/{data.project.id}/tiktok"
				class="p-4 bg-violet-50 rounded-lg border border-violet-200 hover:border-violet-400 hover:shadow-sm transition-all text-center"
			>
				<Music size={24} class="mx-auto text-violet-600 mb-2" />
				<p class="text-sm font-medium text-gray-800">TikTok設定</p>
			</a>
		</div>
	</div>
</div>
