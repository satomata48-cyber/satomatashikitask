<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import {
		ArrowLeft,
		MessageCircle,
		Heart,
		MessageSquare,
		Eye,
		RefreshCw,
		TrendingUp,
		ExternalLink,
		Clock,
		Repeat2,
		Quote
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
		return date.toLocaleDateString('ja-JP', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function truncateText(text: string | null, maxLength: number = 100): string {
		if (!text) return '';
		if (text.length <= maxLength) return text;
		return text.slice(0, maxLength) + '...';
	}
</script>

<svelte:head>
	<title>Threads分析 - {data.project.title}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-zinc-50 to-gray-100">
	<!-- Header -->
	<header class="bg-white shadow-sm">
		<div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<a href="/dashboard/projects/{data.project.id}/sns" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
					<ArrowLeft size={20} class="text-gray-600" />
				</a>
				<MessageCircle size={24} class="text-gray-800" />
				<h1 class="text-xl md:text-2xl font-bold text-gray-800">Threads 分析</h1>
			</div>
			<div class="flex items-center gap-2">
				{#if data.hasMetaSettings}
					<form method="POST" action="?/refreshData" use:enhance={handleRefresh}>
						<button
							type="submit"
							disabled={isRefreshing}
							class="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
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
				<MessageCircle size={48} class="mx-auto text-gray-300 mb-4" />
				<h2 class="text-xl font-semibold text-gray-800 mb-2">Meta APIを設定してください</h2>
				<p class="text-gray-600 mb-4">Threadsデータを取得するには、まずSNS管理ページでMeta APIを設定してください。</p>
				<a
					href="/dashboard/projects/{data.project.id}/sns"
					class="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
				>
					SNS管理ページへ
				</a>
			</div>
		{:else}
			<!-- 統計カード -->
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
				<div class="bg-white rounded-xl p-5 shadow-md">
					<div class="flex items-center gap-2 mb-2">
						<MessageCircle size={18} class="text-gray-700" />
						<span class="text-sm text-gray-600">投稿数</span>
					</div>
					<p class="text-3xl font-bold text-gray-800">{data.stats.totalPosts.toLocaleString()}</p>
				</div>
				<div class="bg-white rounded-xl p-5 shadow-md">
					<div class="flex items-center gap-2 mb-2">
						<Heart size={18} class="text-red-500" />
						<span class="text-sm text-gray-600">総いいね</span>
					</div>
					<p class="text-3xl font-bold text-red-500">{data.stats.totalLikes.toLocaleString()}</p>
				</div>
				<div class="bg-white rounded-xl p-5 shadow-md">
					<div class="flex items-center gap-2 mb-2">
						<MessageSquare size={18} class="text-blue-600" />
						<span class="text-sm text-gray-600">総リプライ</span>
					</div>
					<p class="text-3xl font-bold text-blue-600">{data.stats.totalReplies.toLocaleString()}</p>
				</div>
				<div class="bg-white rounded-xl p-5 shadow-md">
					<div class="flex items-center gap-2 mb-2">
						<Eye size={18} class="text-purple-600" />
						<span class="text-sm text-gray-600">総閲覧数</span>
					</div>
					<p class="text-3xl font-bold text-purple-600">{data.stats.totalViews.toLocaleString()}</p>
				</div>
			</div>

			<!-- パフォーマンスサマリー -->
			<div class="bg-white rounded-xl shadow-md p-6">
				<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
					<TrendingUp size={20} class="text-gray-700" />
					投稿パフォーマンス
				</h3>
				<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div class="p-4 bg-gray-50 rounded-lg text-center">
						<p class="text-sm text-gray-600 mb-1">平均いいね</p>
						<p class="text-2xl font-bold text-gray-800">{data.stats.avgLikes.toLocaleString()}</p>
					</div>
					<div class="p-4 bg-gray-50 rounded-lg text-center">
						<p class="text-sm text-gray-600 mb-1">平均リプライ</p>
						<p class="text-2xl font-bold text-gray-800">{data.stats.avgReplies.toLocaleString()}</p>
					</div>
					<div class="p-4 bg-gray-50 rounded-lg text-center">
						<p class="text-sm text-gray-600 mb-1">総いいね</p>
						<p class="text-2xl font-bold text-red-600">{data.stats.totalLikes.toLocaleString()}</p>
					</div>
					<div class="p-4 bg-gray-50 rounded-lg text-center">
						<p class="text-sm text-gray-600 mb-1">総閲覧</p>
						<p class="text-2xl font-bold text-purple-600">{data.stats.totalViews.toLocaleString()}</p>
					</div>
				</div>
			</div>

			<!-- 投稿一覧 -->
			{#if data.threadsPosts.length > 0}
				<div class="bg-white rounded-xl shadow-md p-6">
					<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
						<MessageCircle size={20} class="text-gray-700" />
						投稿一覧 ({data.threadsPosts.length}件)
					</h3>
					<div class="space-y-4">
						{#each data.threadsPosts as post}
							<div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
								<div class="flex items-start justify-between gap-4">
									<div class="flex-1 min-w-0">
										<p class="text-gray-800 whitespace-pre-wrap mb-3">{post.text || '(テキストなし)'}</p>
										<div class="flex flex-wrap items-center gap-4 text-sm text-gray-500">
											<span class="flex items-center gap-1">
												<Heart size={14} class="text-red-500" />
												{post.like_count || 0}
											</span>
											<span class="flex items-center gap-1">
												<MessageSquare size={14} class="text-blue-500" />
												{post.reply_count || 0}
											</span>
											<span class="flex items-center gap-1">
												<Quote size={14} class="text-green-500" />
												{post.quote_count || 0}
											</span>
											<span class="flex items-center gap-1">
												<Repeat2 size={14} class="text-purple-500" />
												{post.repost_count || 0}
											</span>
											<span class="flex items-center gap-1">
												<Eye size={14} class="text-gray-500" />
												{post.views || 0}
											</span>
										</div>
									</div>
									<div class="flex flex-col items-end gap-2">
										<span class="text-xs text-gray-400 flex items-center gap-1">
											<Clock size={12} />
											{formatDate(post.timestamp)}
										</span>
										{#if post.permalink}
											<a
												href={post.permalink}
												target="_blank"
												class="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
											>
												Threadsで見る <ExternalLink size={12} />
											</a>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{:else}
				<div class="bg-white rounded-xl shadow-md p-8 text-center">
					<MessageCircle size={48} class="mx-auto text-gray-300 mb-3" />
					<p class="text-gray-600">Threads投稿データがありません</p>
					<p class="text-sm text-gray-500 mt-1">「データ更新」ボタンをクリックして取得してください</p>
					<form method="POST" action="?/refreshData" use:enhance={handleRefresh} class="mt-4">
						<button
							type="submit"
							disabled={isRefreshing}
							class="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
						>
							<RefreshCw size={18} class={isRefreshing ? 'animate-spin' : ''} />
							{isRefreshing ? 'データ取得中...' : 'Threadsデータを取得'}
						</button>
					</form>
				</div>
			{/if}
		{/if}
	</main>
</div>
