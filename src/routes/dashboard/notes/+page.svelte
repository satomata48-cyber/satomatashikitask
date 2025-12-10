<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import {
		StickyNote,
		Plus,
		Pin,
		Archive,
		Trash2,
		Palette,
		X,
		ArrowLeft,
		LayoutGrid,
		FolderKanban,
		FileText,
		LogOut,
		Tag,
		FolderOpen,
		Settings,
		Pencil
	} from 'lucide-svelte';

	interface NoteTag {
		name: string;
		color: string;
	}

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showNewNote = $state(false);
	let editingNote = $state<{
		id: number;
		title: string | null;
		content: string | null;
		color: string;
		category_id: number | null;
		tags: NoteTag[];
	} | null>(null);
	let showColorPicker = $state<number | null>(null);
	let showCategoryPicker = $state<number | null>(null);
	let showCategoryManager = $state(false);
	let editingCategory = $state<{ id: number; name: string; color: string } | null>(null);
	let newCategoryName = $state('');
	let newCategoryColor = $state('#6B7280');
	let selectedFilter = $state<'all' | number>('all');

	// 新規メモ用の状態
	let newNoteCategoryId = $state<number | null>(null);
	let newNoteTags = $state<NoteTag[]>([]);
	let newTagInput = $state('');

	// 編集用タグ入力
	let editTagInput = $state('');

	const noteColors = [
		{ name: 'イエロー', value: '#FEF3C7' },
		{ name: 'グリーン', value: '#D1FAE5' },
		{ name: 'ブルー', value: '#DBEAFE' },
		{ name: 'ピンク', value: '#FCE7F3' },
		{ name: 'パープル', value: '#EDE9FE' },
		{ name: 'オレンジ', value: '#FED7AA' },
		{ name: 'グレー', value: '#F3F4F6' },
		{ name: 'ホワイト', value: '#FFFFFF' }
	];

	const categoryColors = [
		'#6B7280', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4'
	];

	const tagColors = [
		'#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'
	];

	function handleFormSubmit() {
		return async ({ result }: { result: { type: string } }) => {
			if (result.type === 'success') {
				showNewNote = false;
				editingNote = null;
				showColorPicker = null;
				showCategoryPicker = null;
				newNoteCategoryId = null;
				newNoteTags = [];
				newTagInput = '';
				editTagInput = '';
				await invalidateAll();
			}
		};
	}

	function handleCategoryFormSubmit() {
		return async ({ result }: { result: { type: string } }) => {
			if (result.type === 'success') {
				editingCategory = null;
				newCategoryName = '';
				newCategoryColor = '#6B7280';
				await invalidateAll();
			}
		};
	}

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));

		if (days === 0) {
			return '今日';
		} else if (days === 1) {
			return '昨日';
		} else if (days < 7) {
			return `${days}日前`;
		} else {
			return `${date.getMonth() + 1}/${date.getDate()}`;
		}
	}

	function truncateText(text: string | null, maxLength: number = 150): string {
		if (!text) return '';
		if (text.length <= maxLength) return text;
		return text.slice(0, maxLength) + '...';
	}

	function parseTags(tagsJson: string | null): NoteTag[] {
		if (!tagsJson) return [];
		try {
			return JSON.parse(tagsJson);
		} catch {
			return [];
		}
	}

	function addNewNoteTag() {
		if (newTagInput.trim() && newNoteTags.length < 5) {
			const randomColor = tagColors[Math.floor(Math.random() * tagColors.length)];
			newNoteTags = [...newNoteTags, { name: newTagInput.trim(), color: randomColor }];
			newTagInput = '';
		}
	}

	function removeNewNoteTag(index: number) {
		newNoteTags = newNoteTags.filter((_, i) => i !== index);
	}

	function addEditTag() {
		if (editTagInput.trim() && editingNote && editingNote.tags.length < 5) {
			const randomColor = tagColors[Math.floor(Math.random() * tagColors.length)];
			editingNote.tags = [...editingNote.tags, { name: editTagInput.trim(), color: randomColor }];
			editTagInput = '';
		}
	}

	function removeEditTag(index: number) {
		if (editingNote) {
			editingNote.tags = editingNote.tags.filter((_, i) => i !== index);
		}
	}

	// フィルタリングされたメモ
	let filteredNotes = $derived(
		selectedFilter === 'all'
			? data.notes
			: data.notes.filter(n => n.category_id === selectedFilter)
	);
</script>

<svelte:head>
	<title>メモ帳 - タスク管理</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
	<!-- Header -->
	<header class="bg-white shadow-sm sticky top-0 z-40">
		<div class="max-w-7xl mx-auto px-3 md:px-4 py-3 md:py-4 flex items-center justify-between">
			<div class="flex items-center gap-2 md:gap-4 min-w-0">
				<a href="/dashboard" class="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0" title="ダッシュボードに戻る">
					<ArrowLeft size={20} class="text-gray-600" />
				</a>
				<div class="flex items-center gap-2 md:gap-3 min-w-0">
					<StickyNote size={24} class="text-amber-600 flex-shrink-0 md:w-7 md:h-7" />
					<h1 class="text-base md:text-xl lg:text-2xl font-bold text-gray-800 truncate">メモ帳</h1>
				</div>
			</div>
			<div class="flex items-center gap-1 md:gap-2 flex-shrink-0">
				<!-- ナビゲーションリンク -->
				<a
					href="/dashboard/boards"
					class="p-2 md:flex md:items-center md:gap-2 md:px-3 md:py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
					title="ボード管理"
				>
					<LayoutGrid size={18} />
					<span class="hidden lg:inline">ボード</span>
				</a>
				<a
					href="/dashboard/projects"
					class="p-2 md:flex md:items-center md:gap-2 md:px-3 md:py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
					title="プロジェクト"
				>
					<FolderKanban size={18} />
					<span class="hidden lg:inline">プロジェクト</span>
				</a>
				<a
					href="/dashboard/documents"
					class="p-2 md:flex md:items-center md:gap-2 md:px-3 md:py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors"
					title="ドキュメント"
				>
					<FileText size={18} />
					<span class="hidden lg:inline">ドキュメント</span>
				</a>
				<div class="w-px h-6 bg-gray-200 mx-1 hidden md:block"></div>
				<form method="POST" action="/dashboard?/logout" use:enhance>
					<button
						type="submit"
						class="p-2 md:flex md:items-center md:gap-2 md:px-3 md:py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
					>
						<LogOut size={18} />
						<span class="hidden lg:inline">ログアウト</span>
					</button>
				</form>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-8">
		<!-- カテゴリフィルター & カテゴリ管理 -->
		<div class="mb-4 md:mb-6 flex flex-wrap items-center gap-2">
			<button
				onclick={() => selectedFilter = 'all'}
				class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors {selectedFilter === 'all' ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}"
			>
				すべて
			</button>
			{#each data.categories as category}
				<button
					onclick={() => selectedFilter = category.id}
					class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5"
					style="background-color: {selectedFilter === category.id ? category.color : 'white'}; color: {selectedFilter === category.id ? 'white' : '#4B5563'}"
				>
					<span class="w-2 h-2 rounded-full" style="background-color: {selectedFilter === category.id ? 'white' : category.color}"></span>
					{category.name}
				</button>
			{/each}
			<button
				onclick={() => showCategoryManager = true}
				class="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
				title="カテゴリ管理"
			>
				<Settings size={18} />
			</button>
		</div>

		<!-- 新規メモ作成エリア -->
		<div class="mb-4 md:mb-8">
			{#if !showNewNote}
				<button
					onclick={() => (showNewNote = true)}
					class="w-full max-w-2xl mx-auto block bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-3 md:p-4 text-left group"
				>
					<div class="flex items-center gap-3 text-gray-500 group-hover:text-amber-600 transition-colors">
						<Plus size={20} />
						<span>メモを作成...</span>
					</div>
				</button>
			{:else}
				<div class="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-4">
					<form method="POST" action="?/create" use:enhance={handleFormSubmit}>
						<input
							type="text"
							name="title"
							placeholder="タイトル"
							class="w-full text-lg font-semibold text-gray-800 placeholder-gray-400 border-none outline-none mb-2"
						/>
						<textarea
							name="content"
							placeholder="メモを入力..."
							rows="4"
							class="w-full text-gray-700 placeholder-gray-400 border-none outline-none resize-none"
						></textarea>
						<input type="hidden" name="color" value="#FEF3C7" />
						<input type="hidden" name="category_id" value={newNoteCategoryId || ''} />
						<input type="hidden" name="tags" value={JSON.stringify(newNoteTags)} />

						<!-- カテゴリ選択 -->
						{#if data.categories.length > 0}
							<div class="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
								<span class="text-xs text-gray-500">カテゴリ:</span>
								<button
									type="button"
									onclick={() => newNoteCategoryId = null}
									class="px-2 py-0.5 rounded text-xs transition-colors {newNoteCategoryId === null ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}"
								>
									なし
								</button>
								{#each data.categories as category}
									<button
										type="button"
										onclick={() => newNoteCategoryId = category.id}
										class="px-2 py-0.5 rounded text-xs transition-colors flex items-center gap-1"
										style="background-color: {newNoteCategoryId === category.id ? category.color : '#F3F4F6'}; color: {newNoteCategoryId === category.id ? 'white' : '#4B5563'}"
									>
										<span class="w-1.5 h-1.5 rounded-full" style="background-color: {newNoteCategoryId === category.id ? 'white' : category.color}"></span>
										{category.name}
									</button>
								{/each}
							</div>
						{/if}

						<!-- タグ入力 -->
						<div class="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
							<span class="text-xs text-gray-500">タグ:</span>
							{#each newNoteTags as tag, i}
								<span
									class="px-2 py-0.5 rounded text-xs text-white flex items-center gap-1"
									style="background-color: {tag.color}"
								>
									{tag.name}
									<button type="button" onclick={() => removeNewNoteTag(i)} class="hover:opacity-70">
										<X size={12} />
									</button>
								</span>
							{/each}
							{#if newNoteTags.length < 5}
								<input
									type="text"
									bind:value={newTagInput}
									onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNewNoteTag(); }}}
									placeholder="タグを追加..."
									class="px-2 py-0.5 text-xs border border-gray-200 rounded outline-none focus:border-amber-400 w-24"
								/>
							{/if}
						</div>

						<div class="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
							<div class="flex items-center gap-2">
								{#each noteColors.slice(0, 4) as color}
									<button
										type="button"
										class="w-6 h-6 rounded-full border-2 border-gray-200 hover:border-gray-400 transition-colors"
										style="background-color: {color.value}"
										title={color.name}
									></button>
								{/each}
							</div>
							<div class="flex items-center gap-2">
								<button
									type="button"
									onclick={() => { showNewNote = false; newNoteCategoryId = null; newNoteTags = []; newTagInput = ''; }}
									class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
								>
									キャンセル
								</button>
								<button
									type="submit"
									class="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
								>
									作成
								</button>
							</div>
						</div>
					</form>
				</div>
			{/if}
		</div>

		<!-- ピン留めメモ -->
		{#if filteredNotes.some((n) => n.pinned)}
			<div class="mb-4 md:mb-8">
				<h2 class="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 md:mb-4 flex items-center gap-2">
					<Pin size={14} />
					ピン留め
				</h2>
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
					{#each filteredNotes.filter((n) => n.pinned) as note}
						{@const noteTags = parseTags(note.tags)}
						<div
							class="group rounded-xl shadow-md hover:shadow-lg transition-all p-4 relative"
							style="background-color: {note.color}"
						>
							<!-- アクションボタン -->
							<div class="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
								<form method="POST" action="?/togglePin" use:enhance={handleFormSubmit}>
									<input type="hidden" name="id" value={note.id} />
									<button
										type="submit"
										class="p-1.5 bg-white/80 hover:bg-white rounded-full shadow transition-colors"
										title="ピン留め解除"
									>
										<Pin size={14} class="text-amber-600" />
									</button>
								</form>
								<button
									onclick={() => (showColorPicker = showColorPicker === note.id ? null : note.id)}
									class="p-1.5 bg-white/80 hover:bg-white rounded-full shadow transition-colors"
									title="色を変更"
								>
									<Palette size={14} class="text-gray-600" />
								</button>
								<form method="POST" action="?/toggleArchive" use:enhance={handleFormSubmit}>
									<input type="hidden" name="id" value={note.id} />
									<button
										type="submit"
										class="p-1.5 bg-white/80 hover:bg-white rounded-full shadow transition-colors"
										title="アーカイブ"
									>
										<Archive size={14} class="text-gray-600" />
									</button>
								</form>
								<form method="POST" action="?/delete" use:enhance={handleFormSubmit}>
									<input type="hidden" name="id" value={note.id} />
									<button
										type="submit"
										onclick={(e) => {
											if (!confirm('このメモを削除しますか？')) e.preventDefault();
										}}
										class="p-1.5 bg-white/80 hover:bg-white rounded-full shadow transition-colors"
										title="削除"
									>
										<Trash2 size={14} class="text-red-600" />
									</button>
								</form>
							</div>

							<!-- カラーピッカー -->
							{#if showColorPicker === note.id}
								<div class="absolute top-10 right-2 bg-white rounded-lg shadow-lg p-2 z-10 grid grid-cols-4 gap-1">
									{#each noteColors as color}
										<form method="POST" action="?/changeColor" use:enhance={handleFormSubmit}>
											<input type="hidden" name="id" value={note.id} />
											<input type="hidden" name="color" value={color.value} />
											<button
												type="submit"
												class="w-6 h-6 rounded-full border-2 border-gray-200 hover:border-gray-400 hover:scale-110 transition-all"
												style="background-color: {color.value}"
												title={color.name}
											></button>
										</form>
									{/each}
								</div>
							{/if}

							<!-- コンテンツ -->
							<button
								onclick={() =>
									(editingNote = {
										id: note.id,
										title: note.title,
										content: note.content,
										color: note.color,
										category_id: note.category_id,
										tags: noteTags
									})}
								class="w-full text-left"
							>
								<!-- カテゴリバッジ -->
								{#if note.category_name}
									<div class="mb-2">
										<span
											class="px-2 py-0.5 rounded text-xs text-white inline-flex items-center gap-1"
											style="background-color: {note.category_color}"
										>
											<FolderOpen size={10} />
											{note.category_name}
										</span>
									</div>
								{/if}
								{#if note.title}
									<h3 class="font-semibold text-gray-800 mb-2">{note.title}</h3>
								{/if}
								{#if note.content}
									<p class="text-gray-700 text-sm whitespace-pre-wrap">{truncateText(note.content)}</p>
								{/if}
								<!-- タグ表示 -->
								{#if noteTags.length > 0}
									<div class="flex flex-wrap gap-1 mt-2">
										{#each noteTags as tag}
											<span
												class="px-1.5 py-0.5 rounded text-xs text-white"
												style="background-color: {tag.color}"
											>
												{tag.name}
											</span>
										{/each}
									</div>
								{/if}
								<p class="text-xs text-gray-500 mt-3">{formatDate(note.updated_at)}</p>
							</button>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- その他のメモ -->
		{#if filteredNotes.some((n) => !n.pinned)}
			<div>
				{#if filteredNotes.some((n) => n.pinned)}
					<h2 class="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 md:mb-4">その他</h2>
				{/if}
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
					{#each filteredNotes.filter((n) => !n.pinned) as note}
						{@const noteTags = parseTags(note.tags)}
						<div
							class="group rounded-xl shadow-md hover:shadow-lg transition-all p-4 relative"
							style="background-color: {note.color}"
						>
							<!-- アクションボタン -->
							<div class="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
								<form method="POST" action="?/togglePin" use:enhance={handleFormSubmit}>
									<input type="hidden" name="id" value={note.id} />
									<button
										type="submit"
										class="p-1.5 bg-white/80 hover:bg-white rounded-full shadow transition-colors"
										title="ピン留め"
									>
										<Pin size={14} class="text-gray-600" />
									</button>
								</form>
								<button
									onclick={() => (showColorPicker = showColorPicker === note.id ? null : note.id)}
									class="p-1.5 bg-white/80 hover:bg-white rounded-full shadow transition-colors"
									title="色を変更"
								>
									<Palette size={14} class="text-gray-600" />
								</button>
								<form method="POST" action="?/toggleArchive" use:enhance={handleFormSubmit}>
									<input type="hidden" name="id" value={note.id} />
									<button
										type="submit"
										class="p-1.5 bg-white/80 hover:bg-white rounded-full shadow transition-colors"
										title="アーカイブ"
									>
										<Archive size={14} class="text-gray-600" />
									</button>
								</form>
								<form method="POST" action="?/delete" use:enhance={handleFormSubmit}>
									<input type="hidden" name="id" value={note.id} />
									<button
										type="submit"
										onclick={(e) => {
											if (!confirm('このメモを削除しますか？')) e.preventDefault();
										}}
										class="p-1.5 bg-white/80 hover:bg-white rounded-full shadow transition-colors"
										title="削除"
									>
										<Trash2 size={14} class="text-red-600" />
									</button>
								</form>
							</div>

							<!-- カラーピッカー -->
							{#if showColorPicker === note.id}
								<div class="absolute top-10 right-2 bg-white rounded-lg shadow-lg p-2 z-10 grid grid-cols-4 gap-1">
									{#each noteColors as color}
										<form method="POST" action="?/changeColor" use:enhance={handleFormSubmit}>
											<input type="hidden" name="id" value={note.id} />
											<input type="hidden" name="color" value={color.value} />
											<button
												type="submit"
												class="w-6 h-6 rounded-full border-2 border-gray-200 hover:border-gray-400 hover:scale-110 transition-all"
												style="background-color: {color.value}"
												title={color.name}
											></button>
										</form>
									{/each}
								</div>
							{/if}

							<!-- コンテンツ -->
							<button
								onclick={() =>
									(editingNote = {
										id: note.id,
										title: note.title,
										content: note.content,
										color: note.color,
										category_id: note.category_id,
										tags: noteTags
									})}
								class="w-full text-left"
							>
								<!-- カテゴリバッジ -->
								{#if note.category_name}
									<div class="mb-2">
										<span
											class="px-2 py-0.5 rounded text-xs text-white inline-flex items-center gap-1"
											style="background-color: {note.category_color}"
										>
											<FolderOpen size={10} />
											{note.category_name}
										</span>
									</div>
								{/if}
								{#if note.title}
									<h3 class="font-semibold text-gray-800 mb-2">{note.title}</h3>
								{/if}
								{#if note.content}
									<p class="text-gray-700 text-sm whitespace-pre-wrap">{truncateText(note.content)}</p>
								{/if}
								<!-- タグ表示 -->
								{#if noteTags.length > 0}
									<div class="flex flex-wrap gap-1 mt-2">
										{#each noteTags as tag}
											<span
												class="px-1.5 py-0.5 rounded text-xs text-white"
												style="background-color: {tag.color}"
											>
												{tag.name}
											</span>
										{/each}
									</div>
								{/if}
								<p class="text-xs text-gray-500 mt-3">{formatDate(note.updated_at)}</p>
							</button>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- メモがない場合 -->
		{#if data.notes.length === 0}
			<div class="text-center py-16">
				<StickyNote size={64} class="mx-auto text-gray-300 mb-4" />
				<p class="text-gray-600 text-lg mb-2">メモがありません</p>
				<p class="text-gray-500">上の入力欄からメモを作成しましょう</p>
			</div>
		{/if}
	</main>
</div>

<!-- 編集モーダル -->
{#if editingNote}
	<div
		class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
		onclick={(e) => {
			if (e.target === e.currentTarget) editingNote = null;
		}}
	>
		<div
			class="w-full max-w-lg rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
			style="background-color: {editingNote.color}"
		>
			<form method="POST" action="?/update" use:enhance={handleFormSubmit}>
				<input type="hidden" name="id" value={editingNote.id} />
				<input
					type="text"
					name="title"
					value={editingNote.title || ''}
					placeholder="タイトル"
					class="w-full text-xl font-semibold text-gray-800 placeholder-gray-400 bg-transparent border-none outline-none mb-3"
				/>
				<textarea
					name="content"
					value={editingNote.content || ''}
					placeholder="メモを入力..."
					rows="8"
					class="w-full text-gray-700 placeholder-gray-400 bg-transparent border-none outline-none resize-none"
				></textarea>

				<!-- カテゴリ選択 -->
				{#if data.categories.length > 0}
					<div class="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-200/50">
						<span class="text-sm text-gray-600 flex items-center gap-1">
							<FolderOpen size={14} />
							カテゴリ:
						</span>
						<button
							type="button"
							onclick={() => { if (editingNote) editingNote.category_id = null; }}
							class="px-2 py-1 rounded text-xs transition-colors {editingNote.category_id === null ? 'bg-gray-600 text-white' : 'bg-white/50 text-gray-600 hover:bg-white/70'}"
						>
							なし
						</button>
						{#each data.categories as category}
							<button
								type="button"
								onclick={() => { if (editingNote) editingNote.category_id = category.id; }}
								class="px-2 py-1 rounded text-xs transition-colors flex items-center gap-1"
								style="background-color: {editingNote.category_id === category.id ? category.color : 'rgba(255,255,255,0.5)'}; color: {editingNote.category_id === category.id ? 'white' : '#4B5563'}"
							>
								<span class="w-2 h-2 rounded-full" style="background-color: {editingNote.category_id === category.id ? 'white' : category.color}"></span>
								{category.name}
							</button>
						{/each}
					</div>
				{/if}
				<input type="hidden" name="category_id" value={editingNote.category_id ?? ''} />

				<!-- タグ編集 -->
				<div class="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-200/50">
					<span class="text-sm text-gray-600 flex items-center gap-1">
						<Tag size={14} />
						タグ:
					</span>
					{#each editingNote.tags as tag, i}
						<span
							class="px-2 py-1 rounded text-xs text-white flex items-center gap-1"
							style="background-color: {tag.color}"
						>
							{tag.name}
							<button type="button" onclick={() => removeEditTag(i)} class="hover:opacity-70">
								<X size={12} />
							</button>
						</span>
					{/each}
					{#if editingNote.tags.length < 5}
						<input
							type="text"
							bind:value={editTagInput}
							onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEditTag(); }}}
							placeholder="タグを追加..."
							class="px-2 py-1 text-xs border border-gray-300 rounded outline-none focus:border-amber-400 bg-white/70 w-24"
						/>
					{/if}
				</div>
				<input type="hidden" name="tags" value={JSON.stringify(editingNote.tags)} />

				<!-- カラー選択 -->
				<div class="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200/50">
					<span class="text-sm text-gray-600 flex items-center gap-1">
						<Palette size={14} />
						色:
					</span>
					{#each noteColors as color}
						<button
							type="button"
							onclick={() => {
								if (editingNote) editingNote.color = color.value;
							}}
							class="w-7 h-7 rounded-full border-2 transition-all {editingNote.color === color.value
								? 'border-gray-600 scale-110'
								: 'border-gray-300 hover:border-gray-400'}"
							style="background-color: {color.value}"
							title={color.name}
						></button>
					{/each}
				</div>
				<input type="hidden" name="color" value={editingNote.color} />

				<div class="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-gray-200/50">
					<button
						type="button"
						onclick={() => { editingNote = null; editTagInput = ''; }}
						class="px-4 py-2 text-gray-600 hover:bg-white/50 rounded-lg transition-colors"
					>
						キャンセル
					</button>
					<button
						type="submit"
						class="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
					>
						保存
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- カテゴリ管理モーダル -->
{#if showCategoryManager}
	<div
		class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
		onclick={(e) => {
			if (e.target === e.currentTarget) {
				showCategoryManager = false;
				editingCategory = null;
				newCategoryName = '';
				newCategoryColor = '#6B7280';
			}
		}}
	>
		<div class="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 max-h-[80vh] overflow-y-auto">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
					<FolderOpen size={20} class="text-amber-600" />
					カテゴリ管理
				</h2>
				<button
					onclick={() => {
						showCategoryManager = false;
						editingCategory = null;
						newCategoryName = '';
						newCategoryColor = '#6B7280';
					}}
					class="p-1 hover:bg-gray-100 rounded-full transition-colors"
				>
					<X size={20} class="text-gray-500" />
				</button>
			</div>

			<!-- 新規カテゴリ作成 -->
			<form method="POST" action="?/createCategory" use:enhance={handleCategoryFormSubmit} class="mb-6">
				<div class="flex items-center gap-2">
					<input
						type="text"
						name="name"
						bind:value={newCategoryName}
						placeholder="新しいカテゴリ名..."
						class="flex-1 px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-amber-400"
					/>
					<div class="relative">
						<button
							type="button"
							onclick={() => {
								const colors = categoryColors;
								const currentIndex = colors.indexOf(newCategoryColor);
								newCategoryColor = colors[(currentIndex + 1) % colors.length];
							}}
							class="w-10 h-10 rounded-lg border-2 border-gray-200 hover:border-gray-400 transition-colors"
							style="background-color: {newCategoryColor}"
							title="色を変更"
						></button>
					</div>
					<input type="hidden" name="color" value={newCategoryColor} />
					<button
						type="submit"
						disabled={!newCategoryName.trim()}
						class="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						追加
					</button>
				</div>
			</form>

			<!-- カテゴリ一覧 -->
			<div class="space-y-2">
				{#each data.categories as category}
					<div class="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 group">
						{#if editingCategory?.id === category.id}
							<form method="POST" action="?/updateCategory" use:enhance={handleCategoryFormSubmit} class="flex-1 flex items-center gap-2">
								<input type="hidden" name="id" value={category.id} />
								<input
									type="text"
									name="name"
									bind:value={editingCategory.name}
									class="flex-1 px-2 py-1 border border-gray-300 rounded outline-none focus:border-amber-400"
								/>
								<button
									type="button"
									onclick={() => {
										const colors = categoryColors;
										const currentIndex = colors.indexOf(editingCategory!.color);
										editingCategory!.color = colors[(currentIndex + 1) % colors.length];
									}}
									class="w-8 h-8 rounded border-2 border-gray-200 hover:border-gray-400 transition-colors"
									style="background-color: {editingCategory.color}"
								></button>
								<input type="hidden" name="color" value={editingCategory.color} />
								<button type="submit" class="p-1 text-green-600 hover:bg-green-50 rounded">
									<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
										<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
									</svg>
								</button>
								<button
									type="button"
									onclick={() => editingCategory = null}
									class="p-1 text-gray-500 hover:bg-gray-100 rounded"
								>
									<X size={18} />
								</button>
							</form>
						{:else}
							<span
								class="w-4 h-4 rounded-full flex-shrink-0"
								style="background-color: {category.color}"
							></span>
							<span class="flex-1 text-gray-700">{category.name}</span>
							<button
								onclick={() => editingCategory = { id: category.id, name: category.name, color: category.color }}
								class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
								title="編集"
							>
								<Pencil size={16} />
							</button>
							<form method="POST" action="?/deleteCategory" use:enhance={handleCategoryFormSubmit}>
								<input type="hidden" name="id" value={category.id} />
								<button
									type="submit"
									onclick={(e) => {
										if (!confirm(`カテゴリ「${category.name}」を削除しますか？このカテゴリに属するメモはカテゴリなしになります。`)) {
											e.preventDefault();
										}
									}}
									class="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
									title="削除"
								>
									<Trash2 size={16} />
								</button>
							</form>
						{/if}
					</div>
				{/each}
				{#if data.categories.length === 0}
					<p class="text-center text-gray-500 py-4">カテゴリがありません</p>
				{/if}
			</div>
		</div>
	</div>
{/if}
