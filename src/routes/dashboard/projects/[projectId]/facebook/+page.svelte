<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import {
		ArrowLeft,
		Facebook,
		Users,
		ThumbsUp,
		RefreshCw,
		TrendingUp,
		ExternalLink,
		Clock,
		Tag
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
</script>

<svelte:head>
	<title>Facebook分析 - {data.project.title}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50">
	<!-- Header -->
	<header class="bg-white shadow-sm">
		<div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<a href="/dashboard/projects/{data.project.id}/sns" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
					<ArrowLeft size={20} class="text-gray-600" />
				</a>
				<Facebook size={24} class="text-blue-600" />
				<h1 class="text-xl md:text-2xl font-bold text-gray-800">Facebook 分析</h1>
			</div>
			<div class="flex items-center gap-2">
				{#if data.hasMetaSettings}
					<form method="POST" action="?/refreshData" use:enhance={handleRefresh}>
						<button
							type="submit"
							disabled={isRefreshing}
							class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
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
				<Facebook size={48} class="mx-auto text-gray-300 mb-4" />
				<h2 class="text-xl font-semibold text-gray-800 mb-2">Meta APIを設定してください</h2>
				<p class="text-gray-600 mb-4">Facebookデータを取得するには、まずSNS管理ページでMeta APIを設定してください。</p>
				<a
					href="/dashboard/projects/{data.project.id}/sns"
					class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
				>
					SNS管理ページへ
				</a>
			</div>
		{:else if data.facebookPage}
			<!-- ページ情報 -->
			<div class="bg-white rounded-xl shadow-md p-6">
				<div class="flex items-center gap-4">
					<div class="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
						<Facebook size={32} class="text-white" />
					</div>
					<div class="flex-1">
						<h2 class="text-2xl font-bold text-gray-800">{data.facebookPage.page_name}</h2>
						{#if data.facebookPage.category}
							<p class="text-gray-600 flex items-center gap-1">
								<Tag size={14} />
								{data.facebookPage.category}
							</p>
						{/if}
						<a
							href="https://www.facebook.com/{data.facebookPage.page_id}"
							target="_blank"
							class="text-blue-600 hover:underline text-sm flex items-center gap-1 mt-1"
						>
							Facebookで見る <ExternalLink size={12} />
						</a>
					</div>
					<div class="text-right text-sm text-gray-500">
						<Clock size={14} class="inline mr-1" />
						最終更新: {data.facebookPage.updated_at ? new Date(data.facebookPage.updated_at).toLocaleString('ja-JP') : '不明'}
					</div>
				</div>
			</div>

			<!-- 統計カード -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div class="bg-white rounded-xl p-6 shadow-md">
					<div class="flex items-center gap-2 mb-3">
						<Users size={20} class="text-blue-600" />
						<span class="text-sm text-gray-600">フォロワー数</span>
					</div>
					<p class="text-4xl font-bold text-blue-600">{data.facebookPage.followers_count?.toLocaleString() || 0}</p>
				</div>
				<div class="bg-white rounded-xl p-6 shadow-md">
					<div class="flex items-center gap-2 mb-3">
						<ThumbsUp size={20} class="text-indigo-600" />
						<span class="text-sm text-gray-600">ページID</span>
					</div>
					<p class="text-lg font-mono text-indigo-600">{data.facebookPage.page_id}</p>
				</div>
				<div class="bg-white rounded-xl p-6 shadow-md">
					<div class="flex items-center gap-2 mb-3">
						<TrendingUp size={20} class="text-green-600" />
						<span class="text-sm text-gray-600">ステータス</span>
					</div>
					<p class="text-lg font-semibold text-green-600">連携済み</p>
				</div>
			</div>

			<!-- 追加情報 -->
			<div class="bg-white rounded-xl shadow-md p-6">
				<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
					<TrendingUp size={20} class="text-blue-600" />
					ページ情報
				</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="p-4 bg-blue-50 rounded-lg">
						<p class="text-sm text-gray-600 mb-1">ページ名</p>
						<p class="text-lg font-semibold text-blue-700">{data.facebookPage.page_name}</p>
					</div>
					<div class="p-4 bg-indigo-50 rounded-lg">
						<p class="text-sm text-gray-600 mb-1">カテゴリ</p>
						<p class="text-lg font-semibold text-indigo-700">{data.facebookPage.category || '未設定'}</p>
					</div>
					<div class="p-4 bg-violet-50 rounded-lg">
						<p class="text-sm text-gray-600 mb-1">フォロワー</p>
						<p class="text-lg font-semibold text-violet-700">{data.facebookPage.followers_count?.toLocaleString() || 0} 人</p>
					</div>
					<div class="p-4 bg-purple-50 rounded-lg">
						<p class="text-sm text-gray-600 mb-1">最終更新</p>
						<p class="text-lg font-semibold text-purple-700">
							{data.facebookPage.updated_at ? new Date(data.facebookPage.updated_at).toLocaleDateString('ja-JP') : '不明'}
						</p>
					</div>
				</div>
			</div>

			<!-- 注意事項 -->
			<div class="bg-amber-50 rounded-xl border border-amber-200 p-4">
				<p class="text-sm text-amber-700">
					<strong>Note:</strong> Facebookページのインサイト（リーチ、エンゲージメント等）を取得するには、ページにビジネス認証が必要な場合があります。
					詳細は<a href="https://developers.facebook.com/docs/pages/access-tokens" target="_blank" class="underline">Facebook開発者ドキュメント</a>をご確認ください。
				</p>
			</div>
		{:else}
			<!-- ページ未連携 -->
			<div class="bg-white rounded-xl shadow-md p-8 text-center">
				<Facebook size={48} class="mx-auto text-gray-300 mb-4" />
				<h2 class="text-xl font-semibold text-gray-800 mb-2">Facebookページを連携</h2>
				<p class="text-gray-600 mb-4">「データ更新」ボタンをクリックしてFacebookページデータを取得してください。</p>
				<form method="POST" action="?/refreshData" use:enhance={handleRefresh}>
					<button
						type="submit"
						disabled={isRefreshing}
						class="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
					>
						<RefreshCw size={18} class={isRefreshing ? 'animate-spin' : ''} />
						{isRefreshing ? 'データ取得中...' : 'Facebookページを取得'}
					</button>
				</form>
			</div>
		{/if}
	</main>
</div>
