<script lang="ts">
	import type { PageData } from './$types';
	import { Users, Youtube, Instagram, ExternalLink, TrendingUp, Eye, ThumbsUp, Video, Twitter, Music } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();
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
					href="/dashboard/projects/{data.project.id}/youtube"
					class="flex items-center justify-center gap-2 w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
				>
					<ExternalLink size={14} />
					詳細分析を見る
				</a>
			{:else}
				<div class="text-center py-6">
					<p class="text-sm text-gray-600 mb-4">YouTubeチャンネルを連携して統計を取得しましょう</p>
					<a
						href="/dashboard/projects/{data.project.id}/youtube"
						class="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
					>
						<Youtube size={16} />
						連携する
					</a>
				</div>
			{/if}
		</div>

		<!-- Instagram -->
		<div class="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl shadow-md p-6 border border-pink-200">
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center gap-2">
					<div class="p-2 bg-pink-100 rounded-lg">
						<Instagram size={24} class="text-pink-600" />
					</div>
					<h3 class="font-semibold text-gray-800">Instagram</h3>
				</div>
				{#if data.instagramAccount}
					<span class="px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-full">
						連携済み
					</span>
				{:else}
					<span class="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 border border-gray-300 rounded-full">
						未連携
					</span>
				{/if}
			</div>

			{#if data.instagramAccount}
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
				<a
					href="/dashboard/projects/{data.project.id}/instagram"
					class="flex items-center justify-center gap-2 w-full px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm font-medium"
				>
					<ExternalLink size={14} />
					詳細分析を見る
				</a>
			{:else}
				<div class="text-center py-6">
					<p class="text-sm text-gray-600 mb-4">Instagramアカウントを連携して統計を取得しましょう</p>
					<a
						href="/dashboard/projects/{data.project.id}/instagram"
						class="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm"
					>
						<Instagram size={16} />
						連携する
					</a>
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
				href="/dashboard/projects/{data.project.id}/youtube"
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
