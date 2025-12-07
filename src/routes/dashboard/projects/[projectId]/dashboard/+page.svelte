<script lang="ts">
	import type { PageData } from './$types';
	import { LayoutGrid, FileText, Users, TrendingUp, BarChart3, Calendar, ExternalLink } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>ダッシュボード - {data.project.title}</title>
</svelte:head>

<div class="p-6 space-y-6">
	<!-- ヘッダー -->
	<div class="mb-6">
		<h2 class="text-2xl font-bold text-gray-800 mb-2">ダッシュボード</h2>
		<p class="text-gray-600">プロジェクトの概要と統計情報</p>
	</div>

	<!-- 統計カード -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- ボード統計 -->
		<div class="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl shadow-md p-5 border border-indigo-200">
			<div class="flex items-center justify-between mb-3">
				<div class="p-2 bg-indigo-100 rounded-lg">
					<LayoutGrid size={24} class="text-indigo-600" />
				</div>
				<span class="text-xs font-medium text-indigo-600">ボード</span>
			</div>
			<div class="space-y-1">
				<p class="text-3xl font-bold text-gray-800">{data.boardStats?.total_boards || 0}</p>
				<p class="text-sm text-gray-600">{data.boardStats?.total_lists || 0} リスト / {data.boardStats?.total_cards || 0} カード</p>
			</div>
		</div>

		<!-- ドキュメント統計 -->
		<div class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-md p-5 border border-purple-200">
			<div class="flex items-center justify-between mb-3">
				<div class="p-2 bg-purple-100 rounded-lg">
					<FileText size={24} class="text-purple-600" />
				</div>
				<span class="text-xs font-medium text-purple-600">ドキュメント</span>
			</div>
			<div class="space-y-1">
				<p class="text-3xl font-bold text-gray-800">{data.documentStats?.total_documents || 0}</p>
				<p class="text-sm text-gray-600">{data.documentStats?.with_content || 0} 件に内容あり</p>
			</div>
		</div>

		<!-- YouTube統計 -->
		<div class="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl shadow-md p-5 border border-red-200">
			<div class="flex items-center justify-between mb-3">
				<div class="p-2 bg-red-100 rounded-lg">
					<Users size={24} class="text-red-600" />
				</div>
				<span class="text-xs font-medium text-red-600">YouTube</span>
			</div>
			{#if data.youtubeStats}
				<div class="space-y-1">
					<p class="text-2xl font-bold text-gray-800">{data.youtubeStats.subscriber_count?.toLocaleString() || 0}</p>
					<p class="text-sm text-gray-600">登録者数</p>
				</div>
			{:else}
				<p class="text-sm text-gray-500">未連携</p>
			{/if}
		</div>

		<!-- アクティビティ -->
		<div class="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl shadow-md p-5 border border-emerald-200">
			<div class="flex items-center justify-between mb-3">
				<div class="p-2 bg-emerald-100 rounded-lg">
					<TrendingUp size={24} class="text-emerald-600" />
				</div>
				<span class="text-xs font-medium text-emerald-600">進捗</span>
			</div>
			<div class="space-y-1">
				<p class="text-3xl font-bold text-gray-800">
					{#if data.boardStats?.total_cards && data.boardStats?.total_cards > 0}
						{Math.round((data.boardStats.total_cards / (data.boardStats.total_boards || 1)) * 10) / 10}
					{:else}
						0
					{/if}
				</p>
				<p class="text-sm text-gray-600">ボードあたりのカード数</p>
			</div>
		</div>
	</div>

	<!-- 最近のアクティビティ -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- 最近のボード -->
		<div class="bg-white rounded-xl shadow-md p-5">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
					<LayoutGrid size={20} class="text-indigo-600" />
					最近のボード
				</h3>
				<a href="/dashboard/projects/{data.project.id}/boards" class="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
					すべて表示 <ExternalLink size={14} />
				</a>
			</div>
			{#if data.recentBoards && data.recentBoards.length > 0}
				<div class="space-y-3">
					{#each data.recentBoards as board}
						<a
							href="/dashboard/projects/{data.project.id}/boards?board={board.id}"
							class="block p-3 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg border border-indigo-200 hover:border-indigo-400 hover:shadow-sm transition-all"
						>
							<div class="flex items-start justify-between mb-2">
								<h4 class="font-semibold text-gray-800 text-sm">{board.title}</h4>
								<ExternalLink size={14} class="text-indigo-600 flex-shrink-0 ml-2" />
							</div>
							<div class="flex items-center gap-3 text-xs text-gray-600">
								<span>{board.list_count || 0} リスト</span>
								<span>•</span>
								<span>{board.card_count || 0} カード</span>
							</div>
						</a>
					{/each}
				</div>
			{:else}
				<div class="text-center py-8">
					<LayoutGrid size={40} class="mx-auto text-gray-300 mb-2" />
					<p class="text-gray-500 text-sm">ボードがありません</p>
				</div>
			{/if}
		</div>

		<!-- 最近のドキュメント -->
		<div class="bg-white rounded-xl shadow-md p-5">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
					<FileText size={20} class="text-purple-600" />
					最近のドキュメント
				</h3>
				<a href="/dashboard/projects/{data.project.id}/documents" class="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1">
					すべて表示 <ExternalLink size={14} />
				</a>
			</div>
			{#if data.recentDocuments && data.recentDocuments.length > 0}
				<div class="space-y-3">
					{#each data.recentDocuments as doc}
						<a
							href="/dashboard/projects/{data.project.id}/documents/{doc.id}"
							class="block p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200 hover:border-purple-400 hover:shadow-sm transition-all"
						>
							<div class="flex items-start justify-between mb-2">
								<h4 class="font-semibold text-gray-800 text-sm">{doc.title}</h4>
								<ExternalLink size={14} class="text-purple-600 flex-shrink-0 ml-2" />
							</div>
							<p class="text-xs text-gray-600">
								更新: {new Date(doc.updated_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
							</p>
						</a>
					{/each}
				</div>
			{:else}
				<div class="text-center py-8">
					<FileText size={40} class="mx-auto text-gray-300 mb-2" />
					<p class="text-gray-500 text-sm">ドキュメントがありません</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- クイックアクション -->
	<div class="bg-white rounded-xl shadow-md p-5">
		<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
			<BarChart3 size={20} class="text-gray-600" />
			クイックアクション
		</h3>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
			<a
				href="/dashboard/projects/{data.project.id}/boards"
				class="p-4 bg-indigo-50 rounded-lg border border-indigo-200 hover:border-indigo-400 hover:shadow-sm transition-all text-center"
			>
				<LayoutGrid size={24} class="mx-auto text-indigo-600 mb-2" />
				<p class="text-sm font-medium text-gray-800">ボード管理</p>
			</a>
			<a
				href="/dashboard/projects/{data.project.id}/documents"
				class="p-4 bg-purple-50 rounded-lg border border-purple-200 hover:border-purple-400 hover:shadow-sm transition-all text-center"
			>
				<FileText size={24} class="mx-auto text-purple-600 mb-2" />
				<p class="text-sm font-medium text-gray-800">ドキュメント</p>
			</a>
			<a
				href="/dashboard/projects/{data.project.id}/sns"
				class="p-4 bg-pink-50 rounded-lg border border-pink-200 hover:border-pink-400 hover:shadow-sm transition-all text-center"
			>
				<Users size={24} class="mx-auto text-pink-600 mb-2" />
				<p class="text-sm font-medium text-gray-800">SNS管理</p>
			</a>
			<a
				href="/dashboard/projects/{data.project.id}/youtube"
				class="p-4 bg-red-50 rounded-lg border border-red-200 hover:border-red-400 hover:shadow-sm transition-all text-center"
			>
				<TrendingUp size={24} class="mx-auto text-red-600 mb-2" />
				<p class="text-sm font-medium text-gray-800">YouTube分析</p>
			</a>
		</div>
	</div>
</div>
