<script lang="ts">
	import { BarChart3, TrendingUp, Users, Eye, Heart, MessageCircle } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Tab = 'twitter' | 'instagram' | 'tiktok' | 'youtube';
	let activeTab = $state<Tab>('twitter');

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
								<div class="text-sm text-gray-600">ツイート数</div>
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
				{#if data.youtube.latest}
					<!-- サマリーカード -->
					<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div class="bg-white rounded-xl shadow-md p-6">
							<div class="flex items-center justify-between mb-2">
								<div class="text-sm text-gray-600">登録者数</div>
								<Users size={20} class="text-red-600" />
							</div>
							<div class="text-3xl font-bold text-gray-900">
								{formatNumber(data.youtube.latest.subscriber_count)}
							</div>
							<div class="text-sm {getChangeColor(data.youtube.latest.subscriber_change)} mt-1">
								{getChangeIcon(data.youtube.latest.subscriber_change)} {Math.abs(data.youtube.latest.subscriber_change)}
							</div>
						</div>

						<div class="bg-white rounded-xl shadow-md p-6">
							<div class="flex items-center justify-between mb-2">
								<div class="text-sm text-gray-600">総再生数</div>
								<Eye size={20} class="text-red-600" />
							</div>
							<div class="text-3xl font-bold text-gray-900">
								{formatNumber(data.youtube.latest.view_count)}
							</div>
							<div class="text-sm {getChangeColor(data.youtube.latest.view_change)} mt-1">
								{getChangeIcon(data.youtube.latest.view_change)} {Math.abs(data.youtube.latest.view_change)}
							</div>
						</div>

						<div class="bg-white rounded-xl shadow-md p-6">
							<div class="flex items-center justify-between mb-2">
								<div class="text-sm text-gray-600">動画数</div>
								<MessageCircle size={20} class="text-red-600" />
							</div>
							<div class="text-3xl font-bold text-gray-900">
								{formatNumber(data.youtube.latest.video_count)}
							</div>
							<div class="text-sm {getChangeColor(data.youtube.latest.video_change)} mt-1">
								{getChangeIcon(data.youtube.latest.video_change)} {Math.abs(data.youtube.latest.video_change)}
							</div>
						</div>
					</div>

					<!-- チャンネル情報 -->
					<div class="bg-white rounded-xl shadow-md p-6">
						<h3 class="text-lg font-semibold text-gray-800 mb-4">チャンネル情報</h3>
						<div class="space-y-2">
							<div class="flex items-center gap-2">
								<span class="text-gray-600">チャンネル名:</span>
								<span class="font-medium">{data.youtube.latest.channel_title}</span>
							</div>
							<div class="flex items-center gap-2">
								<span class="text-gray-600">チャンネルID:</span>
								<span class="font-mono text-sm">{data.youtube.latest.channel_id}</span>
							</div>
						</div>
					</div>
				{:else}
					<div class="bg-white rounded-xl shadow-md p-12 text-center">
						<Users size={48} class="text-gray-400 mx-auto mb-4" />
						<p class="text-gray-600">YouTubeチャンネルが連携されていません</p>
						<a
							href="/dashboard/projects/{data.project.id}/youtube"
							class="inline-block mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
						>
							連携する
						</a>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
