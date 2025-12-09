<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { LayoutGrid, Plus, Trash2, ExternalLink, Calendar, Edit2, X, Check } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll, goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showAddBoard = $state(false);
	let showAddList = $state(false);
	let showAddCardInList = $state<number | null>(null);
	let editingCard = $state<number | null>(null);

	function handleFormSubmit() {
		return async ({ result }: { result: { type: string } }) => {
			if (result.type === 'success' || result.type === 'redirect') {
				showAddBoard = false;
				showAddList = false;
				showAddCardInList = null;
				editingCard = null;
				await invalidateAll();
			}
		};
	}

	function selectBoard(boardId: number) {
		goto(`/dashboard/projects/${data.project.id}/boards?board=${boardId}`);
	}
</script>

<svelte:head>
	<title>ボード管理 - {data.project.title}</title>
</svelte:head>

<div class="p-6">
	<!-- ボード管理エリア -->
	<div class="max-w-7xl mx-auto">
		<!-- ヘッダー -->
		<div class="flex items-center justify-between mb-6">
			<div>
				<h2 class="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
					<LayoutGrid size={28} class="text-indigo-600" />
					ボード管理
				</h2>
				<p class="text-gray-600">タスクをボード形式で整理しましょう</p>
			</div>
			{#if !showAddBoard}
				<button
					onclick={() => showAddBoard = true}
					class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
				>
					<Plus size={20} />
					新しいボード
				</button>
			{/if}
		</div>

		<!-- 新規ボード作成フォーム -->
		{#if showAddBoard}
			<div class="bg-white rounded-xl shadow-md p-6 border border-indigo-200 mb-6">
				<h3 class="text-lg font-semibold text-gray-800 mb-4">新しいボードを作成</h3>
				<form method="POST" action="?/createBoard" use:enhance={handleFormSubmit}>
					<div class="flex gap-3 items-end">
						<div class="flex-1">
							<input
								type="text"
								name="title"
								placeholder="ボード名を入力..."
								required
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
							/>
						</div>
						<button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
							作成
						</button>
						<button type="button" onclick={() => showAddBoard = false} class="px-3 py-2 text-gray-500 hover:bg-gray-200 rounded-lg">
							<X size={18} />
						</button>
					</div>
				</form>
			</div>
		{/if}

		<!-- ボード一覧またはボード詳細 -->
		{#if data.selectedBoard && data.lists}
			<!-- 選択されたボードの詳細表示 -->
			<div class="bg-white rounded-xl shadow-md overflow-hidden">
				<div class="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-gray-200 flex items-center justify-between">
					<h3 class="text-xl font-semibold text-gray-800">{data.selectedBoard.title}</h3>
					<div class="flex items-center gap-2">
						{#if !showAddList}
							<button
								onclick={() => showAddList = true}
								class="flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
							>
								<Plus size={16} />
								リスト追加
							</button>
						{/if}
						<form method="POST" action="?/deleteBoard" use:enhance={handleFormSubmit}>
							<input type="hidden" name="id" value={data.selectedBoard.id} />
							<button
								type="submit"
								onclick={(e) => {
									if (!confirm('このボードを削除しますか？すべてのリストとカードも削除されます。')) {
										e.preventDefault();
									}
								}}
								class="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
							>
								<Trash2 size={16} />
							</button>
						</form>
					</div>
				</div>

				<!-- リスト追加フォーム -->
				{#if showAddList}
					<div class="p-4 bg-blue-50 border-b border-gray-200">
						<form method="POST" action="?/createList" use:enhance={handleFormSubmit}>
							<input type="hidden" name="board_id" value={data.selectedBoard.id} />
							<div class="flex gap-2">
								<input
									type="text"
									name="title"
									placeholder="リスト名..."
									required
									class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
								/>
								<button type="submit" class="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
									作成
								</button>
								<button type="button" onclick={() => showAddList = false} class="px-3 py-2 text-sm text-gray-500 hover:bg-gray-200 rounded-lg">
									<X size={16} />
								</button>
							</div>
						</form>
					</div>
				{/if}

				<!-- リスト一覧 -->
				<div class="p-4">
					{#if data.lists.length === 0}
						<div class="text-center py-12">
							<LayoutGrid size={48} class="mx-auto text-gray-300 mb-3" />
							<p class="text-gray-500 mb-4">リストがありません</p>
							<button
								onclick={() => showAddList = true}
								class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
							>
								<Plus size={16} />
								最初のリストを作成
							</button>
						</div>
					{:else}
						<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
							{#each data.lists as list}
								<div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
									<!-- リストヘッダー -->
									<div class="flex items-center justify-between mb-3">
										<h4 class="font-semibold text-gray-800 text-sm">{list.title}</h4>
										<form method="POST" action="?/deleteList" use:enhance={handleFormSubmit}>
											<input type="hidden" name="id" value={list.id} />
											<button
												type="submit"
												onclick={(e) => {
													if (!confirm('このリストを削除しますか？すべてのカードも削除されます。')) {
														e.preventDefault();
													}
												}}
												class="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
											>
												<Trash2 size={14} />
											</button>
										</form>
									</div>

									<!-- カード一覧 -->
									<div class="space-y-2 mb-3">
										{#each list.cards || [] as card}
											{#if editingCard === card.id}
												<!-- カード編集フォーム -->
												<form method="POST" action="?/updateCard" use:enhance={handleFormSubmit} class="p-2 bg-white rounded border border-indigo-300">
													<input type="hidden" name="id" value={card.id} />
													<input
														type="text"
														name="title"
														value={card.title}
														class="w-full px-2 py-1 text-sm border border-gray-300 rounded mb-2"
													/>
													<textarea
														name="description"
														value={card.description || ''}
														rows="2"
														placeholder="説明..."
														class="w-full px-2 py-1 text-xs border border-gray-300 rounded mb-2"
													></textarea>
													<input
														type="date"
														name="due_date"
														value={card.due_date || ''}
														class="w-full px-2 py-1 text-xs border border-gray-300 rounded mb-2"
													/>
													<div class="flex gap-1">
														<button type="submit" class="flex-1 px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700">
															<Check size={12} />
														</button>
														<button type="button" onclick={() => editingCard = null} class="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300">
															<X size={12} />
														</button>
													</div>
												</form>
											{:else}
												<!-- カード表示 -->
												<div class="p-2 bg-white rounded shadow-sm border border-gray-200 hover:border-indigo-300 group">
													<div class="flex items-start justify-between gap-2">
														<button
															onclick={() => editingCard = card.id}
															class="flex-1 text-left text-sm text-gray-800 hover:text-indigo-600"
														>
															{card.title}
														</button>
														<form method="POST" action="?/deleteCard" use:enhance={handleFormSubmit}>
															<input type="hidden" name="id" value={card.id} />
															<button
																type="submit"
																onclick={(e) => {
																	if (!confirm('このカードを削除しますか？')) {
																		e.preventDefault();
																	}
																}}
																class="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 rounded"
															>
																<Trash2 size={12} />
															</button>
														</form>
													</div>
													{#if card.due_date}
														<div class="flex items-center gap-1 text-xs text-gray-500 mt-1">
															<Calendar size={10} />
															{new Date(card.due_date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
														</div>
													{/if}
												</div>
											{/if}
										{/each}
									</div>

									<!-- カード追加ボタン -->
									{#if showAddCardInList === list.id}
										<form method="POST" action="?/createCard" use:enhance={handleFormSubmit}>
											<input type="hidden" name="list_id" value={list.id} />
											<div class="flex gap-1">
												<input
													type="text"
													name="title"
													placeholder="カード名..."
													required
													class="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
												/>
												<button type="submit" class="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700">
													<Plus size={12} />
												</button>
												<button type="button" onclick={() => showAddCardInList = null} class="px-2 py-1 text-xs text-gray-500 hover:bg-gray-200 rounded">
													<X size={12} />
												</button>
											</div>
										</form>
									{:else}
										<button
											onclick={() => showAddCardInList = list.id}
											class="w-full px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded flex items-center justify-center gap-1"
										>
											<Plus size={14} />
											カード追加
										</button>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<!-- ボード一覧表示 -->
			{#if data.boards.length === 0}
				<div class="text-center py-16">
					<LayoutGrid size={64} class="mx-auto text-gray-300 mb-4" />
					<p class="text-gray-600 text-lg mb-2">ボードがありません</p>
					<p class="text-gray-500 mb-6">新しいボードを作成してタスク管理を始めましょう</p>
					{#if !showAddBoard}
						<button
							onclick={() => showAddBoard = true}
							class="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
						>
							<Plus size={20} />
							最初のボードを作成
						</button>
					{/if}
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each data.boards as board}
						<button
							onclick={() => selectBoard(board.id)}
							class="bg-white rounded-xl shadow-md hover:shadow-lg transition-all p-5 text-left border border-gray-200 hover:border-indigo-300"
						>
							<h3 class="text-lg font-semibold text-gray-800 mb-2">{board.title}</h3>
							<div class="flex items-center gap-3 text-sm text-gray-600 mb-3">
								<span>{board.list_count || 0} リスト</span>
								<span>•</span>
								<span>{board.card_count || 0} カード</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-xs text-gray-500">
									{new Date(board.created_at).toLocaleDateString('ja-JP')}
								</span>
								<ExternalLink size={14} class="text-indigo-600" />
							</div>
						</button>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</div>
