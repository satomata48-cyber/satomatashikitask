<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { Pencil, Trash2, Plus, Menu, X, Calendar, LayoutGrid, ChevronLeft, ChevronRight, FileText, Settings, Gamepad2, Palette, ArrowLeft, Tag, GripVertical } from 'lucide-svelte';
	import ColorPalette from '$lib/components/ColorPalette.svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { dndzone, SOURCES, TRIGGERS } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';

	// タグの型定義
	interface CardTag {
		name: string;
		color: string;
	}

	// カードの型定義
	interface Card {
		id: number;
		list_id: number;
		title: string;
		description: string | null;
		due_date: string | null;
		position: number;
		title_color: string | null;
		description_color: string | null;
		due_date_color: string | null;
		title_bg_color: string | null;
		description_bg_color: string | null;
		border_color: string | null;
		discord_notify: number;
		tags?: string | null;
		has_document?: boolean;
	}

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// フォーム送信後のenhance関数
	function handleFormSubmit() {
		return async ({ result }: { result: { type: string } }) => {
			if (result.type === 'success' || result.type === 'redirect') {
				// UI状態をリセット
				showAddList = false;
				showAddCardForList = null;
				editingCardId = null;
				editingCard = null;
				editListModal = null;
				editingDocId = null;
				showCreateDocForm = false;
				activeColorField = null;
				// データを再取得
				await invalidateAll();
			}
		};
	}

	let showAddList = $state(false);
	let showAddCardForList = $state<number | null>(null);
	let editingCardId = $state<number | null>(null);
	let editListModal = $state<{ id: number; title: string } | null>(null);
	let sidebarOpen = $state(false);
	let editingDocId = $state<number | null>(null);
	let showCreateDocForm = $state(false);

	// カード編集時の色選択状態
	let editColors = $state<{
		title_color: string | null;
		description_color: string | null;
		due_date_color: string | null;
		title_bg_color: string | null;
		description_bg_color: string | null;
		border_color: string | null;
	}>({
		title_color: null,
		description_color: null,
		due_date_color: null,
		title_bg_color: null,
		description_bg_color: null,
		border_color: null
	});

	// カラーパレットの表示状態
	let activeColorField = $state<string | null>(null);

	// 編集中のカードデータ
	let editingCard = $state<{
		id: number;
		title: string;
		description: string;
		due_date: string;
		list_id: number;
	} | null>(null);

	// Discord通知設定
	let editDiscordNotify = $state(false);

	// タグ編集用
	let editTags = $state<CardTag[]>([]);
	let newTagName = $state('');
	let newTagColor = $state('#3b82f6');

	// タグ用のカラーパレット
	const tagColors = [
		'#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
		'#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
		'#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
		'#f43f5e', '#64748b', '#374151'
	];

	function addTag() {
		if (newTagName.trim()) {
			editTags = [...editTags, { name: newTagName.trim(), color: newTagColor }];
			newTagName = '';
		}
	}

	function removeTag(index: number) {
		editTags = editTags.filter((_, i) => i !== index);
	}

	function parseTags(tagsJson: string | null | undefined): CardTag[] {
		if (!tagsJson) return [];
		try {
			return JSON.parse(tagsJson);
		} catch {
			return [];
		}
	}

	// ビュータイプ (board or calendar)
	let viewType = $state<'board' | 'calendar'>('board');

	// カレンダー用の現在の月
	let currentMonth = $state(new Date());

	// カードをリストごとにグループ化（カレンダービュー用）
	const cardsByList = $derived(
		data.lists.reduce(
			(acc, list) => {
				acc[list.id] = data.cards
					.filter((card) => card.list_id === list.id)
					.sort((a, b) => a.position - b.position);
				return acc;
			},
			{} as Record<number, Card[]>
		)
	);

	// ドラッグ&ドロップのフリップアニメーション時間
	const flipDurationMs = 200;

	// リストごとのカード状態（svelte-dnd-action用）
	function getCardsByListId(): Record<number, Card[]> {
		const items: Record<number, Card[]> = {};
		for (const list of data.lists) {
			items[list.id] = data.cards
				.filter((card) => card.list_id === list.id)
				.sort((a, b) => a.position - b.position);
		}
		return items;
	}

	let listCardItems = $state<Record<number, Card[]>>(getCardsByListId());

	// data.cardsが変更された時にlistCardItemsを更新
	$effect(() => {
		// data.cardsを参照してeffectの依存関係に含める
		const _ = data.cards;
		listCardItems = getCardsByListId();
	});

	// ドラッグ&ドロップ処理
	function handleDndConsider(listId: number, e: CustomEvent<{ items: Card[] }>) {
		listCardItems[listId] = e.detail.items;
	}

	async function handleDndFinalize(listId: number, e: CustomEvent<{ items: Card[]; info: { source: string; trigger: string } }>) {
		const newItems = e.detail.items;
		listCardItems[listId] = newItems;

		// サーバーに保存
		const cardsToUpdate = newItems.map((card, index) => ({
			id: card.id,
			list_id: listId,
			position: index
		}));

		if (cardsToUpdate.length > 0) {
			const formData = new FormData();
			formData.append('cards', JSON.stringify(cardsToUpdate));

			try {
				const response = await fetch('?/reorderCards', {
					method: 'POST',
					body: formData
				});

				// 常にデータを再取得して同期
				await invalidateAll();
			} catch (error) {
				console.error('Error saving card order:', error);
				await invalidateAll();
			}
		}
	}

	// カレンダー用のヘルパー関数
	function getDaysInMonth(date: Date) {
		const year = date.getFullYear();
		const month = date.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const daysInMonth = lastDay.getDate();
		const startingDayOfWeek = firstDay.getDay();

		const days: Array<{ date: Date | null; isCurrentMonth: boolean }> = [];

		// 前月の日付で埋める
		for (let i = 0; i < startingDayOfWeek; i++) {
			days.push({ date: null, isCurrentMonth: false });
		}

		// 当月の日付
		for (let i = 1; i <= daysInMonth; i++) {
			days.push({ date: new Date(year, month, i), isCurrentMonth: true });
		}

		return days;
	}

	function isSameDay(date1: Date, date2: Date) {
		return (
			date1.getFullYear() === date2.getFullYear() &&
			date1.getMonth() === date2.getMonth() &&
			date1.getDate() === date2.getDate()
		);
	}

	// カレンダー用のカード情報（日付でグループ化）
	const cardsByDate = $derived(() => {
		const grouped: Record<string, typeof data.cards> = {};
		data.cards.forEach((card) => {
			if (card.due_date) {
				const date = new Date(card.due_date);
				const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
				if (!grouped[dateKey]) {
					grouped[dateKey] = [];
				}
				grouped[dateKey].push(card);
			}
		});
		return grouped;
	});
</script>

<svelte:head>
	<title>{data.currentBoard.title} - タスク管理</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex">
	<!-- Mobile Sidebar Overlay -->
	{#if sidebarOpen}
		<div
			class="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
			onclick={() => (sidebarOpen = false)}
		></div>
	{/if}

	<!-- Sidebar -->
	<aside
		class="fixed md:relative z-50 md:z-auto bg-white shadow-lg transition-transform duration-300 flex-shrink-0 h-full md:h-auto {sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:hidden'}"
		style="width: 280px;"
	>
		<div class="h-full flex flex-col" style="width: 280px;">
			<!-- Sidebar Header -->
			<div class="p-4 border-b border-gray-200">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-xl font-bold text-gray-800">タスク管理</h2>
					<button
						onclick={() => (sidebarOpen = false)}
						class="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
						title="サイドバーを閉じる"
					>
						<X size={20} />
					</button>
				</div>
			</div>

			<!-- Boards List -->
			<div class="flex-1 overflow-y-auto p-4">
				<div class="mb-4">
					<h3 class="text-xs font-semibold text-gray-500 uppercase mb-2">ボード</h3>
					<div class="space-y-1">
						{#each data.boards as board}
							<div class="flex items-center justify-between px-3 py-2 rounded-md transition-colors {data.currentBoardId === board.id
								? 'bg-blue-100 text-blue-700 font-medium'
								: 'text-gray-700 hover:bg-gray-100'}">
								<a
									href="/dashboard/board/{board.id}"
									class="flex-1 truncate"
								>
									{board.title}
								</a>
								{#if data.currentBoardId === board.id}
									<a
										href="/dashboard/board/{board.id}/settings"
										class="p-0.5 text-blue-600 hover:text-blue-700 hover:bg-blue-200 rounded transition-colors ml-2"
										title="設定"
									>
										<Settings size={14} />
									</a>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<a
					href="/dashboard"
					class="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-2"
				>
					<ArrowLeft size={16} />
					ボード一覧に戻る
				</a>
			</div>

			<!-- Sidebar Footer -->
			<div class="p-4 border-t border-gray-200">
				<form method="POST" action="?/logout" class="w-full" use:enhance>
					<button
						type="submit"
						class="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors text-left"
					>
						ログアウト
					</button>
				</form>
			</div>
		</div>
	</aside>

	<!-- Main Content -->
	<div class="flex-1 flex flex-col min-w-0">
		<!-- Header -->
		<header class="bg-white shadow-sm flex-shrink-0">
			<div class="px-3 py-3 md:px-4 md:py-4">
				<!-- 上段: メニューボタン、タイトル、ビュー切り替え -->
				<div class="flex items-center justify-between gap-2 mb-2 md:mb-0">
					<div class="flex items-center gap-2 min-w-0 flex-1">
						<button
							onclick={() => (sidebarOpen = true)}
							class="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
							title="メニューを開く"
						>
							<Menu size={20} />
						</button>
						<a href="/dashboard" class="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors flex-shrink-0" title="ボード一覧に戻る">
							<ArrowLeft size={20} />
						</a>
						<h1 class="text-base md:text-xl font-bold text-gray-800 truncate">
							{data.currentBoard.title}
						</h1>
					</div>

					<!-- ビュー切り替え -->
					<div class="flex gap-1 bg-gray-100 rounded-lg p-1 flex-shrink-0">
						<button
							onclick={() => (viewType = 'board')}
							class="p-1.5 md:px-3 md:py-1.5 rounded-md text-sm flex items-center gap-1 transition-colors {viewType === 'board' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}"
						>
							<LayoutGrid size={16} />
							<span class="hidden md:inline">ボード</span>
						</button>
						<button
							onclick={() => (viewType = 'calendar')}
							class="p-1.5 md:px-3 md:py-1.5 rounded-md text-sm flex items-center gap-1 transition-colors {viewType === 'calendar' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}"
						>
							<Calendar size={16} />
							<span class="hidden md:inline">カレンダー</span>
						</button>
					</div>
				</div>

				<!-- 下段: ドキュメント・設定 -->
				<div class="flex gap-2 items-center overflow-x-auto pb-1 -mx-3 px-3 md:mx-0 md:px-0 md:mt-3">
					<!-- ドキュメントボタン（最大3つ） -->
					{#each data.boardDocuments ?? [] as doc}
						<div class="relative group flex-shrink-0">
							{#if editingDocId === doc.id}
								<!-- 編集モード -->
								<form method="POST" action="?/updateBoardDocument" class="flex items-center gap-1" use:enhance={handleFormSubmit}>
									<input type="hidden" name="docId" value={doc.id} />
									<input
										type="text"
										name="title"
										value={doc.title}
										autofocus
										class="px-2 py-1.5 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
									/>
									<button
										type="submit"
										class="px-2 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs"
									>
										保存
									</button>
									<button
										type="button"
										onclick={() => (editingDocId = null)}
										class="px-2 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg text-xs"
									>
										×
									</button>
								</form>
							{:else}
								<!-- 通常表示 -->
								<a
									href="/dashboard/board/{data.currentBoardId}/documents/{doc.id}"
									class="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 whitespace-nowrap"
								>
									<FileText size={14} />
									<span class="max-w-20 md:max-w-none truncate">{doc.title}</span>
								</a>
								<!-- ホバー時の編集・削除ボタン -->
								<div class="absolute -top-2 -right-2 hidden group-hover:flex gap-1">
									<button
										onclick={(e) => {
											e.preventDefault();
											editingDocId = doc.id;
										}}
										class="p-1 bg-white rounded-full shadow-md hover:bg-gray-100 text-gray-600"
										title="編集"
									>
										<Pencil size={12} />
									</button>
									<form method="POST" action="?/deleteBoardDocument" class="inline" use:enhance={handleFormSubmit}>
										<input type="hidden" name="docId" value={doc.id} />
										<button
											type="submit"
											onclick={(e) => {
												if (!confirm('このドキュメントを削除しますか？')) {
													e.preventDefault();
												}
											}}
											class="p-1 bg-white rounded-full shadow-md hover:bg-red-100 text-red-600"
											title="削除"
										>
											<Trash2 size={12} />
										</button>
									</form>
								</div>
							{/if}
						</div>
					{/each}

					<!-- 新規ドキュメント作成（3つ未満の場合のみ表示） -->
					{#if (data.boardDocuments ?? []).length < 3}
						{#if showCreateDocForm}
							<form method="POST" action="?/createBoardDocument" class="flex items-center gap-1 flex-shrink-0" use:enhance={handleFormSubmit}>
								<input
									type="text"
									name="title"
									placeholder="ドキュメント名..."
									required
									autofocus
									class="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-28"
								/>
								<button
									type="submit"
									class="px-2 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
								>
									作成
								</button>
								<button
									type="button"
									onclick={() => (showCreateDocForm = false)}
									class="px-2 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
								>
									×
								</button>
							</form>
						{:else}
							<button
								onclick={() => (showCreateDocForm = true)}
								class="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 flex-shrink-0 whitespace-nowrap"
							>
								<Plus size={14} />
								<span class="hidden md:inline">新規</span>
							</button>
						{/if}
					{/if}

					<!-- 区切り線 -->
					<div class="h-6 w-px bg-gray-300 flex-shrink-0"></div>

					<!-- Discord設定ボタン -->
					<a
						href="/dashboard/board/{data.currentBoardId}/settings"
						class="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200 flex-shrink-0 whitespace-nowrap"
						title="Discord連携設定"
					>
						<Settings size={14} />
						<span class="hidden md:inline">Discord設定</span>
					</a>
				</div>
			</div>
		</header>

		<!-- Main Content Area -->
		<main class="flex-1 overflow-auto p-3 md:p-6">
			{#if viewType === 'board'}
				<!-- Board View: Lists -->
				<div class="flex gap-3 md:gap-4 overflow-x-auto pb-4 -mx-3 px-3 md:mx-0 md:px-0 snap-x snap-mandatory md:snap-none">
				{#each data.lists as list}
					<div class="flex-shrink-0 w-72 md:w-80 bg-gray-100 rounded-lg p-3 md:p-4 snap-center">
						<div class="flex items-center justify-between mb-4">
							<h3 class="font-semibold text-gray-800">{list.title}</h3>
							<div class="flex gap-1">
								<button
									onclick={() => (editListModal = { id: list.id, title: list.title })}
									class="p-1 text-gray-600 hover:text-blue-600 hover:bg-gray-200 rounded transition-colors"
									title="リストを編集"
								>
									<Pencil size={14} />
								</button>
								<form method="POST" action="?/deleteList" class="inline" use:enhance={handleFormSubmit}>
									<input type="hidden" name="id" value={list.id} />
									<button
										type="submit"
										onclick={(e) => {
											if (!confirm('このリストを削除しますか？')) {
												e.preventDefault();
											}
										}}
										class="p-1 text-gray-600 hover:text-red-600 hover:bg-gray-200 rounded transition-colors"
										title="リストを削除"
									>
										<Trash2 size={14} />
									</button>
								</form>
							</div>
						</div>

						<div
							class="space-y-2 mb-4 min-h-[100px] pb-4"
							use:dndzone={{
								items: listCardItems[list.id] || [],
								flipDurationMs,
								dropTargetStyle: { outline: '2px dashed #3b82f6', outlineOffset: '2px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.1)' },
								type: 'cards',
								dropFromOthersDisabled: false,
								centreDraggedOnCursor: true
							}}
							onconsider={(e) => handleDndConsider(list.id, e)}
							onfinalize={(e) => handleDndFinalize(list.id, e)}
						>
							{#each listCardItems[list.id] || [] as card (card.id)}
								{@const cardTags = parseTags(card.tags)}
								<!-- カード表示 -->
									<div
										class="bg-white rounded-lg shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
										style="border: 2px solid {card.border_color || '#e5e7eb'}"
										animate:flip={{ duration: flipDurationMs }}
									>
										<!-- タグ表示（一番上） -->
										{#if cardTags.length > 0}
											<div class="flex flex-wrap gap-1 p-2 pb-0">
												{#each cardTags as tag}
													<span
														class="px-2 py-0.5 rounded text-xs font-medium text-white"
														style="background-color: {tag.color}"
													>
														{tag.name}
													</span>
												{/each}
											</div>
										{/if}

										<!-- カード内容 -->
										<div class="p-3 {cardTags.length > 0 ? 'pt-2' : ''}">
											<h4
												class="font-medium px-1 rounded"
												style="color: {card.title_color || '#1f2937'}; background-color: {card.title_bg_color || 'transparent'}"
											>
												{card.title}
											</h4>
											{#if card.description}
												<p
													class="text-sm px-1 rounded mt-1"
													style="color: {card.description_color || '#4b5563'}; background-color: {card.description_bg_color || 'transparent'}"
												>
													{card.description}
												</p>
											{/if}

											<!-- 期限とアクションボタンを同じ行に -->
											<div class="flex items-center justify-between mt-2 flex-wrap gap-1">
												<div class="flex items-center gap-1">
													{#if card.due_date}
														{@const dueDate = new Date(card.due_date)}
														{@const now = new Date()}
														{@const isOverdue = dueDate < now}
														{@const isDueSoon = dueDate > now && dueDate < new Date(now.getTime() + 24 * 60 * 60 * 1000)}
														<div
															class="px-2 py-0.5 rounded text-xs font-medium"
															style="background-color: {card.due_date_color || (isOverdue ? '#fee2e2' : isDueSoon ? '#fef3c7' : '#dbeafe')};
															       color: {card.due_date_color ? '#000000' : (isOverdue ? '#b91c1c' : isDueSoon ? '#a16207' : '#1e40af')}"
														>
															{dueDate.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })} {dueDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
														</div>
														{#if card.discord_notify === 1}
															<Gamepad2 size={14} class="text-purple-600" title="Discord通知ON" />
														{/if}
													{/if}
												</div>

												<!-- アクションボタン -->
												<div class="flex items-center gap-1">
													<button
														onclick={() => {
															if (editingCardId === card.id) {
																editingCardId = null;
																editingCard = null;
																activeColorField = null;
																editTags = [];
															} else {
																editingCardId = card.id;
																editingCard = {
																	id: card.id,
																	title: card.title,
																	description: card.description || '',
																	due_date: card.due_date || '',
																	list_id: card.list_id
																};
																activeColorField = null;
																editColors.title_color = card.title_color;
																editColors.description_color = card.description_color;
																editColors.due_date_color = card.due_date_color;
																editColors.title_bg_color = card.title_bg_color;
																editColors.description_bg_color = card.description_bg_color;
																editColors.border_color = card.border_color;
																editDiscordNotify = card.discord_notify === 1;
																editTags = parseTags(card.tags);
															}
														}}
														class="px-2 py-0.5 text-xs font-medium rounded border transition-colors {editingCardId === card.id ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'}"
													>
														編集
													</button>
													<a
														href="/dashboard/card/{card.id}/documents"
														class="px-2 py-0.5 text-xs font-medium rounded border transition-colors {card.has_document ? 'bg-green-100 border-green-400 text-green-700' : 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100'}"
													>
														メモ
													</a>
													<form method="POST" action="?/deleteCard" class="contents" use:enhance={handleFormSubmit}>
														<input type="hidden" name="id" value={card.id} />
														<button
															type="submit"
															onclick={(e) => {
																if (!confirm('このカードを削除しますか？')) {
																	e.preventDefault();
																}
															}}
															class="px-2 py-0.5 text-xs font-medium rounded border bg-red-50 border-red-200 text-red-600 hover:bg-red-100 transition-colors"
														>
															削除
														</button>
													</form>
												</div>
											</div>
										</div>

										<!-- インライン編集フォーム -->
										{#if editingCardId === card.id && editingCard}
											<div class="border-t-2 border-blue-200 bg-blue-50 p-3">
												<form method="POST" action="?/updateCard" use:enhance={handleFormSubmit}>
													<input type="hidden" name="id" value={editingCard.id} />
													<input type="hidden" name="title_color" value={editColors.title_color || ''} />
													<input type="hidden" name="description_color" value={editColors.description_color || ''} />
													<input type="hidden" name="due_date_color" value={editColors.due_date_color || ''} />
													<input type="hidden" name="title_bg_color" value={editColors.title_bg_color || ''} />
													<input type="hidden" name="description_bg_color" value={editColors.description_bg_color || ''} />
													<input type="hidden" name="border_color" value={editColors.border_color || ''} />
													<input type="hidden" name="tags" value={JSON.stringify(editTags)} />

													<!-- タグ -->
													<div class="mb-3">
														<label class="block text-xs font-semibold text-gray-600 mb-1">タグ</label>
														<!-- 既存のタグ表示 -->
														{#if editTags.length > 0}
															<div class="flex flex-wrap gap-1 mb-2">
																{#each editTags as tag, i}
																	<span
																		class="px-2 py-0.5 rounded text-xs font-medium text-white flex items-center gap-1"
																		style="background-color: {tag.color}"
																	>
																		{tag.name}
																		<button
																			type="button"
																			onclick={() => removeTag(i)}
																			class="hover:bg-white hover:bg-opacity-20 rounded-full p-0.5"
																		>
																			<X size={10} />
																		</button>
																	</span>
																{/each}
															</div>
														{/if}
														<!-- 新規タグ追加 -->
														<div class="flex gap-2 items-center">
															<input
																type="text"
																bind:value={newTagName}
																placeholder="タグ名"
																class="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
																onkeydown={(e) => {
																	if (e.key === 'Enter') {
																		e.preventDefault();
																		addTag();
																	}
																}}
															/>
															<button
																type="button"
																onclick={() => activeColorField = activeColorField === 'newTag' ? null : 'newTag'}
																class="px-2 py-1 text-xs rounded border transition-colors flex items-center gap-1 {activeColorField === 'newTag' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'}"
															>
																<span class="w-4 h-4 rounded" style="background-color: {newTagColor}"></span>
																色
															</button>
															<button
																type="button"
																onclick={addTag}
																class="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
															>
																追加
															</button>
														</div>
														{#if activeColorField === 'newTag'}
															<div class="mt-2 p-2 bg-white rounded-md border border-gray-200">
																<label class="block text-xs font-medium text-gray-700 mb-2">タグの色</label>
																<div class="flex flex-wrap gap-2">
																	{#each tagColors as color}
																		<button
																			type="button"
																			onclick={() => { newTagColor = color; activeColorField = null; }}
																			class="relative w-8 h-8 rounded border-2 transition-all hover:scale-110"
																			style="background-color: {color}; border-color: {newTagColor === color ? '#3b82f6' : '#d1d5db'}"
																			title={color}
																		>
																			{#if newTagColor === color}
																				<span class="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">✓</span>
																			{/if}
																		</button>
																	{/each}
																</div>
															</div>
														{/if}
													</div>

													<!-- タイトル -->
													<div class="mb-3">
														<label class="block text-xs font-semibold text-gray-600 mb-1">タイトル</label>
														<input
															type="text"
															name="title"
															bind:value={editingCard.title}
															required
															class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
															style="color: {editColors.title_color || '#1f2937'}; background-color: {editColors.title_bg_color || '#ffffff'}"
														/>
														<div class="flex justify-end mt-1 gap-1">
															<button
																type="button"
																onclick={() => activeColorField = activeColorField === 'title' ? null : 'title'}
																class="px-2 py-0.5 text-xs rounded border transition-colors flex items-center gap-1 {activeColorField === 'title' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'}"
															>
																<Palette size={12} />
																文字色
															</button>
															<button
																type="button"
																onclick={() => activeColorField = activeColorField === 'title_bg' ? null : 'title_bg'}
																class="px-2 py-0.5 text-xs rounded border transition-colors flex items-center gap-1 {activeColorField === 'title_bg' ? 'bg-yellow-100 border-yellow-300 text-yellow-700' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'}"
															>
																<Palette size={12} />
																マーカー
															</button>
														</div>
														{#if activeColorField === 'title'}
															<div class="mt-2 p-2 bg-white rounded-md border border-gray-200">
																<ColorPalette label="文字色" bind:value={editColors.title_color} onSelect={(c) => editColors.title_color = c} />
															</div>
														{/if}
														{#if activeColorField === 'title_bg'}
															<div class="mt-2 p-2 bg-white rounded-md border border-gray-200">
																<ColorPalette label="マーカー色" bind:value={editColors.title_bg_color} onSelect={(c) => editColors.title_bg_color = c} />
															</div>
														{/if}
													</div>

													<!-- 説明 -->
													<div class="mb-3">
														<label class="block text-xs font-semibold text-gray-600 mb-1">説明</label>
														<textarea
															name="description"
															bind:value={editingCard.description}
															rows="2"
															class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
															style="color: {editColors.description_color || '#4b5563'}; background-color: {editColors.description_bg_color || '#ffffff'}"
														></textarea>
														<div class="flex justify-end mt-1 gap-1">
															<button
																type="button"
																onclick={() => activeColorField = activeColorField === 'desc' ? null : 'desc'}
																class="px-2 py-0.5 text-xs rounded border transition-colors flex items-center gap-1 {activeColorField === 'desc' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'}"
															>
																<Palette size={12} />
																文字色
															</button>
															<button
																type="button"
																onclick={() => activeColorField = activeColorField === 'desc_bg' ? null : 'desc_bg'}
																class="px-2 py-0.5 text-xs rounded border transition-colors flex items-center gap-1 {activeColorField === 'desc_bg' ? 'bg-yellow-100 border-yellow-300 text-yellow-700' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'}"
															>
																<Palette size={12} />
																マーカー
															</button>
														</div>
														{#if activeColorField === 'desc'}
															<div class="mt-2 p-2 bg-white rounded-md border border-gray-200">
																<ColorPalette label="文字色" bind:value={editColors.description_color} onSelect={(c) => editColors.description_color = c} />
															</div>
														{/if}
														{#if activeColorField === 'desc_bg'}
															<div class="mt-2 p-2 bg-white rounded-md border border-gray-200">
																<ColorPalette label="マーカー色" bind:value={editColors.description_bg_color} onSelect={(c) => editColors.description_bg_color = c} />
															</div>
														{/if}
													</div>

													<!-- 期限 -->
													<div class="mb-3">
														<label class="block text-xs font-semibold text-gray-600 mb-1">期限</label>
														<input
															type="datetime-local"
															name="due_date"
															bind:value={editingCard.due_date}
															class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
														/>
														<div class="flex justify-end mt-1 gap-1">
															<button
																type="button"
																onclick={() => activeColorField = activeColorField === 'due' ? null : 'due'}
																class="px-2 py-0.5 text-xs rounded border transition-colors flex items-center gap-1 {activeColorField === 'due' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'}"
															>
																<Palette size={12} />
																バッジ色
															</button>
															<button
																type="button"
																onclick={() => activeColorField = activeColorField === 'border' ? null : 'border'}
																class="px-2 py-0.5 text-xs rounded border transition-colors flex items-center gap-1 {activeColorField === 'border' ? 'bg-purple-100 border-purple-300 text-purple-700' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'}"
															>
																<Palette size={12} />
																枠線色
															</button>
														</div>
														{#if activeColorField === 'due'}
															<div class="mt-2 p-2 bg-white rounded-md border border-gray-200">
																<ColorPalette label="バッジ色" bind:value={editColors.due_date_color} onSelect={(c) => editColors.due_date_color = c} />
															</div>
														{/if}
														{#if activeColorField === 'border'}
															<div class="mt-2 p-2 bg-white rounded-md border border-gray-200">
																<ColorPalette label="カード枠線色" bind:value={editColors.border_color} onSelect={(c) => editColors.border_color = c} />
															</div>
														{/if}
													</div>

													<!-- Discord通知 -->
													<div class="mb-3 p-2 bg-purple-50 rounded-md border border-purple-200">
														<label class="flex items-center gap-2 cursor-pointer">
															<input
																type="checkbox"
																name="discord_notify"
																bind:checked={editDiscordNotify}
																value="1"
																class="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
															/>
															<span class="flex items-center gap-1 text-sm text-gray-700">
																<Gamepad2 size={16} class="text-purple-600" />
																Discord通知
															</span>
														</label>
													</div>

													<!-- ボタン -->
													<div class="flex gap-2">
														<button
															type="submit"
															class="flex-1 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
														>
															保存
														</button>
														<button
															type="button"
															onclick={() => {
																editingCardId = null;
																editingCard = null;
																activeColorField = null;
															}}
															class="px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
														>
															キャンセル
														</button>
													</div>
												</form>
											</div>
										{/if}
									</div>
							{/each}
						</div>

						{#if showAddCardForList === list.id}
							<form method="POST" action="?/createCard" class="mb-2" use:enhance={handleFormSubmit}>
								<input type="hidden" name="list_id" value={list.id} />
								<input
									type="text"
									name="title"
									placeholder="カードのタイトルを入力..."
									required
									autofocus
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
								/>
								<div class="flex gap-2">
									<button
										type="submit"
										class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
									>
										追加
									</button>
									<button
										type="button"
										onclick={() => (showAddCardForList = null)}
										class="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
									>
										キャンセル
									</button>
								</div>
							</form>
						{:else}
							<button
								onclick={() => (showAddCardForList = list.id)}
								class="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
							>
								+ カードを追加
							</button>
						{/if}
					</div>
				{/each}

				<!-- Add List Button -->
				<div class="flex-shrink-0 w-72 md:w-80 snap-center">
					{#if showAddList}
						<div class="bg-gray-100 rounded-lg p-4">
							<form method="POST" action="?/createList" use:enhance={handleFormSubmit}>
								<input
									type="text"
									name="title"
									placeholder="リストのタイトルを入力..."
									required
									autofocus
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
								/>
								<div class="flex gap-2">
									<button
										type="submit"
										class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
									>
										追加
									</button>
									<button
										type="button"
										onclick={() => (showAddList = false)}
										class="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
									>
										キャンセル
									</button>
								</div>
							</form>
						</div>
					{:else}
						<button
							onclick={() => (showAddList = true)}
							class="w-full h-24 bg-white bg-opacity-50 hover:bg-opacity-75 rounded-lg flex items-center justify-center text-gray-700 transition-all"
						>
							+ リストを追加
						</button>
					{/if}
				</div>
			</div>
			{:else}
				<!-- Calendar View -->
				<div class="max-w-7xl mx-auto">
					<!-- Calendar Header -->
					<div class="flex items-center justify-between mb-4 md:mb-6">
						<h2 class="text-lg md:text-2xl font-bold text-gray-800">
							{currentMonth.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}
						</h2>
						<div class="flex gap-1 md:gap-2">
							<button
								onclick={() => currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)}
								class="p-1.5 md:p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
								title="前月"
							>
								<ChevronLeft size={18} />
							</button>
							<button
								onclick={() => currentMonth = new Date()}
								class="px-2 py-1 md:px-4 md:py-2 text-xs md:text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
							>
								今月
							</button>
							<button
								onclick={() => currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)}
								class="p-1.5 md:p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
								title="次月"
							>
								<ChevronRight size={18} />
							</button>
						</div>
					</div>

					<!-- Calendar Grid -->
					<div class="bg-white rounded-lg shadow overflow-hidden">
						<!-- Week Days Header -->
						<div class="grid grid-cols-7 bg-gray-50 border-b border-blue-200">
							{#each ['日', '月', '火', '水', '木', '金', '土'] as day, i}
								<div class="px-1 py-2 md:px-2 md:py-3 text-center text-xs md:text-sm font-semibold text-gray-700 {i === 0 ? 'text-red-600' : i === 6 ? 'text-blue-600' : ''}">
									{day}
								</div>
							{/each}
						</div>

						<!-- Calendar Days -->
						<div class="grid grid-cols-7">
							{#each getDaysInMonth(currentMonth) as day}
								<div class="min-h-16 md:min-h-32 border-b border-r border-blue-200 p-1 md:p-2 {day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'}">
									{#if day.date}
										{@const dateKey = `${day.date.getFullYear()}-${day.date.getMonth()}-${day.date.getDate()}`}
										{@const cardsForDay = cardsByDate()[dateKey] || []}
										{@const today = new Date()}
										{@const isToday = isSameDay(day.date, today)}

										<div class="flex flex-col h-full">
											<div class="flex items-center justify-between mb-0.5 md:mb-1">
												<span class="text-xs md:text-sm font-medium {isToday ? 'bg-blue-600 text-white rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center' : 'text-gray-700'}">
													{day.date.getDate()}
												</span>
											</div>

											<div class="space-y-0.5 md:space-y-1 flex-1 overflow-y-auto">
												{#each cardsForDay as card}
													{@const list = data.lists.find(l => l.id === card.list_id)}
													<div
														class="text-xs px-1 md:px-2 py-0.5 md:py-1 rounded cursor-pointer hover:opacity-80 transition-opacity truncate"
														style="border-left: 2px solid {card.border_color || '#3b82f6'}; background-color: {card.title_bg_color || '#dbeafe'}"
														title={card.title}
													>
														<div class="font-medium truncate text-[10px] md:text-xs" style="color: {card.title_color || '#1f2937'}">
															{card.title}
														</div>
														<div class="hidden md:block">
															{#if list}
																<div class="text-gray-500 text-xs truncate">{list.title}</div>
															{/if}
														</div>
													</div>
												{/each}
											</div>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				</div>
			{/if}
		</main>
	</div>
</div>

<!-- Edit List Modal -->
{#if editListModal}
	<div
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
		onclick={(e) => {
			if (e.target === e.currentTarget) editListModal = null;
		}}
	>
		<div class="bg-white rounded-lg p-6 max-w-md w-full">
			<h2 class="text-xl font-bold mb-4">リストを編集</h2>
			<form method="POST" action="?/updateList" use:enhance={handleFormSubmit}>
				<input type="hidden" name="id" value={editListModal.id} />
				<input
					type="text"
					name="title"
					value={editListModal.title}
					placeholder="リスト名"
					required
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
				/>
				<div class="flex gap-2 justify-end">
					<button
						type="button"
						onclick={() => (editListModal = null)}
						class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
					>
						キャンセル
					</button>
					<button
						type="submit"
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
					>
						更新
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

