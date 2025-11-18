<script lang="ts">
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showBoardModal = $state(false);
	let showListModal = $state(false);
	let showCardModal = $state<{ listId: number } | null>(null);

	// カードをリストごとにグループ化
	const cardsByList = $derived(
		data.lists.reduce(
			(acc, list) => {
				acc[list.id] = data.cards.filter((card) => card.list_id === list.id);
				return acc;
			},
			{} as Record<number, typeof data.cards>
		)
	);
</script>

<svelte:head>
	<title>ダッシュボード - タスク管理</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
	<!-- Header -->
	<header class="bg-white shadow-sm">
		<div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
			<div class="flex items-center gap-4">
				<h1 class="text-2xl font-bold text-gray-800">タスク管理</h1>

				{#if data.boards.length > 0}
					<div class="flex items-center gap-2">
						<label for="board-select" class="text-sm text-gray-600">ボード:</label>
						<select
							id="board-select"
							class="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							value={data.currentBoardId}
							onchange={(e) => {
								const target = e.target as HTMLSelectElement;
								window.location.href = `/dashboard?board=${target.value}`;
							}}
						>
							{#each data.boards as board}
								<option value={board.id}>{board.title}</option>
							{/each}
						</select>
					</div>
				{/if}

				<button
					onclick={() => (showBoardModal = true)}
					class="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
				>
					+ 新しいボード
				</button>
			</div>

			<form method="POST" action="?/logout">
				<button
					type="submit"
					class="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 focus:outline-none"
				>
					ログアウト
				</button>
			</form>
		</div>
	</header>

	<!-- Main Content -->
	<main class="max-w-7xl mx-auto px-4 py-6">
		{#if data.boards.length === 0}
			<div class="text-center py-12">
				<p class="text-gray-600 mb-4">ボードがありません</p>
				<button
					onclick={() => (showBoardModal = true)}
					class="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
				>
					最初のボードを作成
				</button>
			</div>
		{:else if !data.currentBoardId}
			<div class="text-center py-12">
				<p class="text-gray-600">ボードを選択してください</p>
			</div>
		{:else}
			<!-- Lists -->
			<div class="flex gap-4 overflow-x-auto pb-4">
				{#each data.lists as list}
					<div class="flex-shrink-0 w-80 bg-gray-100 rounded-lg p-4">
						<h3 class="font-semibold text-gray-800 mb-4">{list.title}</h3>

						<div class="space-y-2 mb-4">
							{#each cardsByList[list.id] || [] as card}
								<div class="bg-white rounded-md p-3 shadow-sm hover:shadow-md transition-shadow">
									<h4 class="font-medium text-gray-800">{card.title}</h4>
									{#if card.description}
										<p class="text-sm text-gray-600 mt-1">{card.description}</p>
									{/if}
									{#if card.due_date}
										<p class="text-xs text-gray-500 mt-2">
											期限: {new Date(card.due_date).toLocaleDateString('ja-JP')}
										</p>
									{/if}
								</div>
							{/each}
						</div>

						<button
							onclick={() => (showCardModal = { listId: list.id })}
							class="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
						>
							+ カードを追加
						</button>
					</div>
				{/each}

				<!-- Add List Button -->
				<div class="flex-shrink-0 w-80">
					<button
						onclick={() => (showListModal = true)}
						class="w-full h-24 bg-white bg-opacity-50 hover:bg-opacity-75 rounded-lg flex items-center justify-center text-gray-700 transition-all"
					>
						+ リストを追加
					</button>
				</div>
			</div>
		{/if}
	</main>
</div>

<!-- Create Board Modal -->
{#if showBoardModal}
	<div
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
		onclick={(e) => {
			if (e.target === e.currentTarget) showBoardModal = false;
		}}
	>
		<div class="bg-white rounded-lg p-6 max-w-md w-full">
			<h2 class="text-xl font-bold mb-4">新しいボード</h2>
			<form method="POST" action="?/createBoard">
				<input
					type="text"
					name="title"
					placeholder="ボード名"
					required
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
				/>
				<div class="flex gap-2 justify-end">
					<button
						type="button"
						onclick={() => (showBoardModal = false)}
						class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
					>
						キャンセル
					</button>
					<button
						type="submit"
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
					>
						作成
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Create List Modal -->
{#if showListModal}
	<div
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
		onclick={(e) => {
			if (e.target === e.currentTarget) showListModal = false;
		}}
	>
		<div class="bg-white rounded-lg p-6 max-w-md w-full">
			<h2 class="text-xl font-bold mb-4">新しいリスト</h2>
			<form method="POST" action="?/createList">
				<input
					type="text"
					name="title"
					placeholder="リスト名"
					required
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
				/>
				<div class="flex gap-2 justify-end">
					<button
						type="button"
						onclick={() => (showListModal = false)}
						class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
					>
						キャンセル
					</button>
					<button
						type="submit"
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
					>
						作成
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Create Card Modal -->
{#if showCardModal}
	<div
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
		onclick={(e) => {
			if (e.target === e.currentTarget) showCardModal = null;
		}}
	>
		<div class="bg-white rounded-lg p-6 max-w-md w-full">
			<h2 class="text-xl font-bold mb-4">新しいカード</h2>
			<form method="POST" action="?/createCard">
				<input type="hidden" name="list_id" value={showCardModal.listId} />
				<input
					type="text"
					name="title"
					placeholder="カード名"
					required
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
				/>
				<div class="flex gap-2 justify-end">
					<button
						type="button"
						onclick={() => (showCardModal = null)}
						class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
					>
						キャンセル
					</button>
					<button
						type="submit"
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
					>
						作成
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
