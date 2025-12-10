<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import {
		ArrowLeft,
		Instagram,
		Users,
		Heart,
		MessageSquare,
		Image,
		RefreshCw,
		TrendingUp,
		ExternalLink,
		Grid,
		Clock
	} from 'lucide-svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let isRefreshing = $state(false);

	function handleRefresh() {
		return ({ update }: any) => {
			isRefreshing = true;
			update().then(() => {
				isRefreshing = false;
			});
		};
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '';
		const date = new Date(dateStr);
		return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
	}
</script>

<svelte:head>
	<title>Instagram分析 - {data.project.title}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-red-50">
	<!-- Header -->
	<header class="bg-white shadow-sm">
		<div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<a href="/dashboard/projects/{data.project.id}/sns" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
					<ArrowLeft size={20} class="text-gray-600" />
				</a>
				<Instagram size={24} class="text-pink-600" />
				<h1 class="text-xl md:text-2xl font-bold text-gray-800">Instagram 分析</h1>
			</div>
			<div class="flex items-center gap-2">
				{#if data.hasMetaSettings}
					<form method="POST" action="?/refreshData" use:enhance={handleRefresh}>
						<button
							type="submit"
							disabled={isRefreshing}
							class="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50"
						>
							<RefreshCw size={16} class={isRefreshing ? 'animate-spin' : ''} />
							{isRefreshing ? '更新中...' : 'データ更新'}
						</button>
					</form>
				{/if}
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="max-w-7xl mx-auto px-4 py-8 space-y-6">
		<!-- メッセージ表示 -->
		{#if form?.success}
			<div class="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
				<p class="text-sm text-emerald-700">{form.message}</p>
			</div>
		{:else if form?.error}
			<div class="p-4 bg-red-50 rounded-lg border border-red-200">
				<p class="text-sm text-red-700">{form.error}</p>
			</div>
		{/if}

		{#if !data.hasMetaSettings}
			<!-- Meta API未設定 -->
			<div class="bg-white rounded-xl shadow-md p-8 text-center">
				<Instagram size={48} class="mx-auto text-gray-300 mb-4" />
				<h2 class="text-xl font-semibold text-gray-800 mb-2">Meta APIを設定してください</h2>
				<p class="text-gray-600 mb-4">Instagramデータを取得するには、まずSNS管理ページでMeta APIを設定してください。</p>
				<a
					href="/dashboard/projects/{data.project.id}/sns"
					class="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
				>
					SNS管理ページへ
				</a>
			</div>
		{:else if data.instagramAccount}
			<!-- アカウント情報 -->
			<div class="bg-white rounded-xl shadow-md p-6">
				<div class="flex items-center gap-4">
					{#if data.instagramAccount.profile_picture_url}
						<img
							src={data.instagramAccount.profile_picture_url}
							alt={data.instagramAccount.username}
							class="w-20 h-20 rounded-full border-4 border-pink-200"
						/>
					{:else}
						<div class="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
							<Instagram size={32} class="text-white" />
						</div>
					{/if}
					<div class="flex-1">
						<h2 class="text-2xl font-bold text-gray-800">@{data.instagramAccount.username}</h2>
						<a
							href="https://www.instagram.com/{data.instagramAccount.username}"
							target="_blank"
							class="text-pink-600 hover:underline text-sm flex items-center gap-1"
						>
							Instagramで見る <ExternalLink size={12} />
						</a>
					</div>
					<div class="text-right text-sm text-gray-500">
						<Clock size={14} class="inline mr-1" />
						最終更新: {data.instagramAccount.updated_at ? new Date(data.instagramAccount.updated_at).toLocaleString('ja-JP') : '不明'}
					</div>
				</div>
			</div>

			<!-- 統計カード -->
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
				<div class="bg-white rounded-xl p-5 shadow-md">
					<div class="flex items-center gap-2 mb-2">
						<Users size={18} class="text-pink-600" />
						<span class="text-sm text-gray-600">フォロワー</span>
					</div>
					<p class="text-3xl font-bold text-pink-600">{data.instagramAccount.followers_count?.toLocaleString() || 0}</p>
				</div>
				<div class="bg-white rounded-xl p-5 shadow-md">
					<div class="flex items-center gap-2 mb-2">
						<Grid size={18} class="text-purple-600" />
						<span class="text-sm text-gray-600">投稿数</span>
					</div>
					<p class="text-3xl font-bold text-purple-600">{data.instagramAccount.media_count?.toLocaleString() || 0}</p>
				</div>
				<div class="bg-white rounded-xl p-5 shadow-md">
					<div class="flex items-center gap-2 mb-2">
						<Heart size={18} class="text-red-500" />
						<span class="text-sm text-gray-600">平均いいね</span>
					</div>
					<p class="text-3xl font-bold text-red-500">{data.stats.avgLikes.toLocaleString()}</p>
				</div>
				<div class="bg-white rounded-xl p-5 shadow-md">
					<div class="flex items-center gap-2 mb-2">
						<TrendingUp size={18} class="text-green-600" />
						<span class="text-sm text-gray-600">エンゲージ率</span>
					</div>
					<p class="text-3xl font-bold text-green-600">{data.stats.engagementRate.toFixed(2)}%</p>
				</div>
			</div>

			<!-- 投稿統計サマリー -->
			<div class="bg-white rounded-xl shadow-md p-6">
				<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
					<TrendingUp size={20} class="text-pink-600" />
					投稿パフォーマンス
				</h3>
				<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div class="p-4 bg-pink-50 rounded-lg text-center">
						<p class="text-sm text-gray-600 mb-1">総いいね</p>
						<p class="text-2xl font-bold text-pink-700">{data.stats.totalLikes.toLocaleString()}</p>
					</div>
					<div class="p-4 bg-purple-50 rounded-lg text-center">
						<p class="text-sm text-gray-600 mb-1">総コメント</p>
						<p class="text-2xl font-bold text-purple-700">{data.stats.totalComments.toLocaleString()}</p>
					</div>
					<div class="p-4 bg-indigo-50 rounded-lg text-center">
						<p class="text-sm text-gray-600 mb-1">平均いいね</p>
						<p class="text-2xl font-bold text-indigo-700">{data.stats.avgLikes.toLocaleString()}</p>
					</div>
					<div class="p-4 bg-violet-50 rounded-lg text-center">
						<p class="text-sm text-gray-600 mb-1">平均コメント</p>
						<p class="text-2xl font-bold text-violet-700">{data.stats.avgComments.toLocaleString()}</p>
					</div>
				</div>
			</div>

			<!-- 投稿一覧 -->
			{#if data.instagramMedia.length > 0}
				<div class="bg-white rounded-xl shadow-md p-6">
					<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
						<Image size={20} class="text-pink-600" />
						最新の投稿 ({data.instagramMedia.length}件)
					</h3>
					<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
						{#each data.instagramMedia as media}
							<a
								href={media.permalink}
								target="_blank"
								class="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
							>
								{#if media.media_url}
									<img
										src={media.media_url}
										alt={media.caption || ''}
										class="w-full h-full object-cover group-hover:scale-105 transition-transform"
									/>
								{:else}
									<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
										<Image size={32} class="text-gray-400" />
									</div>
								{/if}
								<!-- オーバーレイ -->
								<div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
									<span class="flex items-center gap-1">
										<Heart size={16} />
										{media.like_count || 0}
									</span>
									<span class="flex items-center gap-1">
										<MessageSquare size={16} />
										{media.comments_count || 0}
									</span>
								</div>
								<!-- タイプバッジ -->
								{#if media.media_type === 'VIDEO'}
									<div class="absolute top-2 right-2 px-2 py-0.5 bg-black/60 rounded text-xs text-white">
										動画
									</div>
								{:else if media.media_type === 'CAROUSEL_ALBUM'}
									<div class="absolute top-2 right-2 px-2 py-0.5 bg-black/60 rounded text-xs text-white">
										複数
									</div>
								{/if}
								<!-- 日付 -->
								<div class="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 rounded text-xs text-white">
									{formatDate(media.timestamp)}
								</div>
							</a>
						{/each}
					</div>
				</div>
			{:else}
				<div class="bg-white rounded-xl shadow-md p-8 text-center">
					<Image size={48} class="mx-auto text-gray-300 mb-3" />
					<p class="text-gray-600">投稿データがありません</p>
					<p class="text-sm text-gray-500 mt-1">「データ更新」ボタンをクリックして取得してください</p>
				</div>
			{/if}
		{:else}
			<!-- アカウント未連携 -->
			<div class="bg-white rounded-xl shadow-md p-8 text-center">
				<Instagram size={48} class="mx-auto text-gray-300 mb-4" />
				<h2 class="text-xl font-semibold text-gray-800 mb-2">Instagramアカウントを連携</h2>
				<p class="text-gray-600 mb-4">「データ更新」ボタンをクリックしてInstagramデータを取得してください。</p>
				<form method="POST" action="?/refreshData" use:enhance={handleRefresh}>
					<button
						type="submit"
						disabled={isRefreshing}
						class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
					>
						<RefreshCw size={18} class={isRefreshing ? 'animate-spin' : ''} />
						{isRefreshing ? 'データ取得中...' : 'Instagramデータを取得'}
					</button>
				</form>
			</div>
		{/if}
	</main>
</div>
