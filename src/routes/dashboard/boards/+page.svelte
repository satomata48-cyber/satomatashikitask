<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { Pencil, Trash2, Plus, LayoutGrid, Calendar, Settings, ArrowLeft, FolderKanban } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	function handleFormSubmit() {
		return async ({ result }: { result: { type: string } }) => {
			if (result.type === 'success' || result.type === 'redirect') {
				showAddBoard = false;
				editBoardModal = null;
				await invalidateAll();
			}
		};
	}

	let showAddBoard = $state(false);
	let editBoardModal = $state<{ id: number; title: string } | null>(null);
</script>

<svelte:head>
	<title>ボード管理 - タスク管理</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
	<!-- Header -->
	<header class="bg-white shadow-sm">
		<div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<a href="/dashboard" class="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="ダッシュボードへ戻る">
					<ArrowLeft size={20} class="text-gray-600" />
				</a>
				<LayoutGrid size={28} class="text-blue-600" />
				<h1 class="text-xl md:text-2xl font-bold text-gray-800">ボード管理</h1>
			</div>
			<div class="flex items-center gap-3">
				<a
					href="/dashboard"
					class="flex items-center gap-2 px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium"
				>
					<FolderKanban size={18} />
					<span class="hidden md:inline">プロジェクト管理</span>
				</a>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="max-w-7xl mx-auto px-4 py-8">
		<!-- ボード一覧ヘッダー -->
		<div class="flex items-center justify-between mb-6">
			<h2 class="text-lg md:text-xl font-semibold text-gray-800">ボード一覧</h2>
			{#if !showAddBoard}
				<button
					onclick={() => (showAddBoard = true)}
					class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm md:text-base"
				>
					<Plus size={18} />
					新しいボード
				</button>
			{/if}
		</div>

		<!-- 新規ボード作成フォーム -->
		{#if showAddBoard}
			<div class="bg-white rounded-xl shadow-md p-6 mb-6">
				<h3 class="text-lg font-semibold text-gray-800 mb-4">新しいボードを作成</h3>
				<form method="POST" action="?/createBoard" use:enhance={handleFormSubmit}>
					<input
						type="text"
						name="title"
						placeholder="ボード名を入力..."
						required
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
					/>
					<div class="flex gap-3">
						<button
							type="submit"
							class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
						>
							作成
						</button>
						<button
							type="button"
							onclick={() => (showAddBoard = false)}
							class="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
						>
							キャンセル
						</button>
					</div>
				</form>
			</div>
		{/if}

		<!-- ボード一覧 -->
		{#if data.boards.length === 0}
			<div class="text-center py-16">
				<LayoutGrid size={64} class="mx-auto text-gray-300 mb-4" />
				<p class="text-gray-600 text-lg mb-2">ボードがありません</p>
				<p class="text-gray-500 mb-6">新しいボードを作成してタスク管理を始めましょう</p>
				{#if !showAddBoard}
					<button
						onclick={() => (showAddBoard = true)}
						class="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
					>
						<Plus size={20} />
						最初のボードを作成
					</button>
				{/if}
			</div>
		{:else}
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
				{#each data.boards as board}
					<div class="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden group">
						<a
							href="/dashboard/board/{board.id}"
							class="block p-6"
						>
							<div class="flex items-start justify-between">
								<div class="flex-1 min-w-0">
									<h3 class="text-lg font-semibold text-gray-800 truncate mb-2">
										{board.title}
									</h3>
									<div class="flex items-center gap-4 text-sm text-gray-500">
										<span class="flex items-center gap-1">
											<LayoutGrid size={14} />
											{board.list_count || 0} リスト
										</span>
										<span class="flex items-center gap-1">
											<Calendar size={14} />
											{board.card_count || 0} カード
										</span>
									</div>
								</div>
							</div>
						</a>
						<!-- アクションボタン -->
						<div class="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
							<a
								href="/dashboard/board/{board.id}"
								class="text-sm text-blue-600 hover:text-blue-700 font-medium"
							>
								開く
							</a>
							<div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
								<a
									href="/dashboard/board/{board.id}/settings"
									class="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
									title="設定"
								>
									<Settings size={16} />
								</a>
								<button
									onclick={(e) => {
										e.preventDefault();
										editBoardModal = { id: board.id, title: board.title };
									}}
									class="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
									title="編集"
								>
									<Pencil size={16} />
								</button>
								<form method="POST" action="?/deleteBoard" class="inline" use:enhance={handleFormSubmit}>
									<input type="hidden" name="id" value={board.id} />
									<button
										type="submit"
										onclick={(e) => {
											if (!confirm('このボードを削除しますか？関連するリスト・カードもすべて削除されます。')) {
												e.preventDefault();
											}
										}}
										class="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
										title="削除"
									>
										<Trash2 size={16} />
									</button>
								</form>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</main>
</div>

<!-- Edit Board Modal -->
{#if editBoardModal}
	<div
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => {
			if (e.target === e.currentTarget) editBoardModal = null;
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') editBoardModal = null;
		}}
	>
		<div class="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
			<h2 class="text-xl font-bold text-gray-800 mb-4">ボードを編集</h2>
			<form method="POST" action="?/updateBoard" use:enhance={handleFormSubmit}>
				<input type="hidden" name="id" value={editBoardModal.id} />
				<input
					type="text"
					name="title"
					value={editBoardModal.title}
					placeholder="ボード名"
					required
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
				/>
				<div class="flex gap-3 justify-end">
					<button
						type="button"
						onclick={() => (editBoardModal = null)}
						class="px-5 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
					>
						キャンセル
					</button>
					<button
						type="submit"
						class="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
					>
						更新
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
