<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import {
		FileText,
		Plus,
		Trash2,
		ExternalLink,
		Save,
		Bold,
		Italic,
		Underline,
		List,
		ListOrdered,
		Link as LinkIcon,
		Clock,
		ArrowLeft,
		LayoutGrid,
		FolderKanban,
		StickyNote,
		LogOut,
		Menu,
		X,
		ChevronLeft
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll, goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showAddDocument = $state(false);
	let sidebarOpen = $state(false);

	// Get selected document from URL parameter
	let selectedDocId = $derived(
		$page.url.searchParams.get('doc') ? parseInt($page.url.searchParams.get('doc')!) : null
	);
	let selectedDocument = $derived(
		selectedDocId ? data.documents.find((d) => d.id === selectedDocId) : null
	);

	// Editor state
	let title = $state('');
	let editorRef: HTMLDivElement | undefined = $state();
	let saving = $state(false);
	let lastSaved = $state<string | null>(null);

	// Update title when selected document changes
	$effect(() => {
		if (selectedDocument) {
			title = selectedDocument.title;
			if (editorRef && selectedDocument.content) {
				editorRef.innerHTML = selectedDocument.content;
			} else if (editorRef) {
				editorRef.innerHTML = '';
			}
		}
	});

	function handleFormSubmit() {
		return async ({ result }: { result: { type: string } }) => {
			if (result.type === 'success' || result.type === 'redirect') {
				showAddDocument = false;
				await invalidateAll();
			}
		};
	}

	function selectDocument(docId: number) {
		sidebarOpen = false;
		goto(`/dashboard/documents?doc=${docId}`);
	}

	function execCommand(command: string, value: string | undefined = undefined) {
		document.execCommand(command, false, value);
		editorRef?.focus();
	}

	function createLink() {
		const url = prompt('リンク先のURLを入力してください:');
		if (url) {
			execCommand('createLink', url);
		}
	}

	function getEditorContent() {
		return editorRef?.innerHTML || '';
	}

	function updateSaveStatus() {
		const now = new Date();
		lastSaved = now.toLocaleTimeString('ja-JP');
	}

	function formatDate(dateStr: string) {
		const date = new Date(dateStr);
		return date.toLocaleString('ja-JP', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>ドキュメント - タスク管理</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-100">
	<!-- Mobile Sidebar Overlay -->
	{#if sidebarOpen}
		<div
			class="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
			onclick={() => (sidebarOpen = false)}
		></div>
	{/if}

	<!-- Header -->
	<header class="bg-white shadow-sm sticky top-0 z-40">
		<div class="max-w-7xl mx-auto px-3 md:px-4 py-3">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2 md:gap-4 min-w-0">
					<button
						onclick={() => (sidebarOpen = true)}
						class="p-2 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
						title="ドキュメント一覧を開く"
					>
						<Menu size={20} class="text-gray-600" />
					</button>
					<a
						href="/dashboard"
						class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
						title="ダッシュボードに戻る"
					>
						<ArrowLeft size={20} class="text-gray-600" />
					</a>
					<div class="flex items-center gap-2 md:gap-3 min-w-0">
						<div
							class="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0"
						>
							<FileText size={18} class="text-white md:w-6 md:h-6" />
						</div>
						<div class="min-w-0">
							<h1 class="text-base md:text-xl font-bold text-gray-800 truncate">ドキュメント</h1>
							<p class="text-xs text-gray-500">{data.documents.length} 件</p>
						</div>
					</div>
				</div>

				<!-- Quick Navigation -->
				<div class="flex items-center gap-1 md:gap-2 flex-shrink-0">
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
						href="/dashboard/notes"
						class="p-2 md:flex md:items-center md:gap-2 md:px-3 md:py-2 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-600 rounded-lg transition-colors"
						title="メモ帳"
					>
						<StickyNote size={18} />
						<span class="hidden lg:inline">メモ</span>
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
		</div>
	</header>

	<!-- Main Content -->
	<div class="flex flex-col md:flex-row gap-4 md:gap-6 p-3 md:p-6 max-w-7xl mx-auto">
		<!-- 左カラム: ドキュメント一覧 (モバイルではドロワー) -->
		<aside class="fixed md:relative z-50 md:z-auto bg-white md:bg-transparent transition-transform duration-300 h-full md:h-auto w-80 md:flex-shrink-0 {sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}" style="left: 0; top: 0;">
			<!-- モバイル用ヘッダー -->
			<div class="p-4 border-b border-gray-200 flex items-center justify-between md:hidden">
				<span class="font-semibold text-gray-800">ドキュメント一覧</span>
				<button
					onclick={() => (sidebarOpen = false)}
					class="p-1 hover:bg-gray-100 rounded-lg transition-colors"
				>
					<X size={20} class="text-gray-600" />
				</button>
			</div>
			<div class="bg-white md:rounded-xl md:shadow-md p-4 md:sticky md:top-20 h-[calc(100vh-57px)] md:h-auto overflow-y-auto">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
						<FileText size={20} class="text-emerald-600" />
						ドキュメント
					</h3>
					<button
						onclick={() => (showAddDocument = !showAddDocument)}
						class="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
						title="新規作成"
					>
						<Plus size={18} />
					</button>
				</div>

				<!-- 新規作成フォーム -->
				{#if showAddDocument}
					<form
						method="POST"
						action="?/createDocument"
						use:enhance={handleFormSubmit}
						class="mb-4"
					>
						<div class="flex gap-2">
							<input
								type="text"
								name="title"
								placeholder="ドキュメント名..."
								required
								class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
							/>
							<button
								type="submit"
								class="px-3 py-2 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600"
							>
								作成
							</button>
						</div>
					</form>
				{/if}

				<!-- ドキュメント一覧 -->
				{#if data.documents && data.documents.length > 0}
					<div class="space-y-2 max-h-[calc(100vh-320px)] md:max-h-[calc(100vh-240px)] overflow-y-auto">
						{#each data.documents as doc}
							<button
								onclick={() => selectDocument(doc.id)}
								class="block w-full p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border transition-all text-left {selectedDocId ===
								doc.id
									? 'border-emerald-500 shadow-md bg-gradient-to-br from-emerald-100 to-teal-100'
									: 'border-emerald-200 hover:border-emerald-400 hover:shadow-md'}"
							>
								<div class="flex items-start justify-between mb-1">
									<h4 class="font-semibold text-gray-800 text-sm flex-1 truncate">{doc.title}</h4>
									{#if selectedDocId === doc.id}
										<FileText size={14} class="text-emerald-600 flex-shrink-0 ml-2" />
									{:else}
										<ExternalLink size={14} class="text-emerald-600 flex-shrink-0 ml-2" />
									{/if}
								</div>
								<p class="text-xs text-gray-500">
									{new Date(doc.updated_at).toLocaleDateString('ja-JP', {
										month: 'short',
										day: 'numeric',
										hour: '2-digit',
										minute: '2-digit'
									})}
								</p>
							</button>
						{/each}
					</div>
				{:else}
					<p class="text-gray-500 text-sm text-center py-8">ドキュメントがありません</p>
				{/if}
			</div>
		</aside>

		<!-- 右カラム: エディターエリア -->
		<div class="flex-1">
			{#if selectedDocument}
				<!-- Notionスタイルのドキュメント編集エリア -->
				<div class="min-h-[80vh] md:min-h-screen bg-white rounded-xl shadow-md">
					<!-- トップバー（固定） -->
					<div class="sticky top-14 md:top-20 bg-white/80 backdrop-blur-md border-b border-gray-200 z-10 rounded-t-xl">
						<div class="max-w-[900px] mx-auto px-3 md:px-8 py-2 md:py-3">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									{#if lastSaved}
										<div class="flex items-center gap-2 text-xs text-gray-500">
											<Clock size={12} />
											<span>{lastSaved}</span>
										</div>
									{:else}
										<div class="text-xs text-gray-400">編集中...</div>
									{/if}
								</div>
								<div class="flex items-center gap-2">
									<form
										method="POST"
										action="?/saveDocument"
										use:enhance={() => {
											saving = true;
											return async ({ result, update }) => {
												saving = false;
												if (result.type === 'success') {
													updateSaveStatus();
													await invalidateAll();
												}
												await update({ reset: false });
											};
										}}
									>
										<input type="hidden" name="id" value={selectedDocument.id} />
										<input type="hidden" name="title" value={title} />
										<input type="hidden" name="content" value={getEditorContent()} />
										<button
											type="submit"
											disabled={saving}
											class="px-3 py-1.5 text-xs bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
										>
											<Save size={12} />
											{saving ? '保存中...' : '保存'}
										</button>
									</form>
									<form method="POST" action="?/deleteDocument" use:enhance={() => {
										return async ({ result }) => {
											if (result.type === 'success') {
												goto('/dashboard/documents');
												await invalidateAll();
											}
										};
									}}>
										<input type="hidden" name="id" value={selectedDocument.id} />
										<button
											type="submit"
											onclick={(e) => {
												if (!confirm('このドキュメントを削除しますか？')) {
													e.preventDefault();
												}
											}}
											class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
										>
											<Trash2 size={14} />
										</button>
									</form>
								</div>
							</div>
						</div>
					</div>

					<!-- メインコンテンツエリア -->
					<div class="max-w-[900px] mx-auto px-3 md:px-8 pt-6 md:pt-12 pb-16 md:pb-32">
						<!-- タイトル入力（Notionスタイル） -->
						<input
							type="text"
							bind:value={title}
							placeholder="無題"
							class="w-full text-2xl md:text-[40px] font-bold text-gray-900 border-none outline-none bg-transparent focus:ring-0 placeholder-gray-300 mb-2 leading-tight"
						/>

						<!-- メタ情報（控えめ） -->
						<div class="flex flex-wrap items-center gap-1 md:gap-3 text-xs text-gray-400 mb-4 md:mb-8 pl-1">
							<span>作成: {formatDate(selectedDocument.created_at)}</span>
							<span>•</span>
							<span>更新: {formatDate(selectedDocument.updated_at)}</span>
						</div>

						<!-- フォーマットツールバー -->
						<div
							class="mb-4 md:opacity-0 md:hover:opacity-100 md:focus-within:opacity-100 transition-opacity"
						>
							<div
								class="flex flex-wrap gap-1 p-2 bg-gray-50 rounded-lg border border-gray-200 inline-flex"
							>
								<button
									type="button"
									onclick={() => execCommand('bold')}
									class="p-2 text-gray-600 hover:bg-white hover:text-gray-900 rounded transition-colors"
									title="太字 (Ctrl+B)"
								>
									<Bold size={14} />
								</button>
								<button
									type="button"
									onclick={() => execCommand('italic')}
									class="p-2 text-gray-600 hover:bg-white hover:text-gray-900 rounded transition-colors"
									title="斜体 (Ctrl+I)"
								>
									<Italic size={14} />
								</button>
								<button
									type="button"
									onclick={() => execCommand('underline')}
									class="p-2 text-gray-600 hover:bg-white hover:text-gray-900 rounded transition-colors"
									title="下線 (Ctrl+U)"
								>
									<Underline size={14} />
								</button>

								<div class="w-px bg-gray-300 mx-1"></div>

								<button
									type="button"
									onclick={() => execCommand('formatBlock', '<h1>')}
									class="px-2.5 py-2 text-gray-600 hover:bg-white hover:text-gray-900 rounded transition-colors font-semibold text-xs"
									title="見出し1"
								>
									H1
								</button>
								<button
									type="button"
									onclick={() => execCommand('formatBlock', '<h2>')}
									class="px-2.5 py-2 text-gray-600 hover:bg-white hover:text-gray-900 rounded transition-colors font-semibold text-xs"
									title="見出し2"
								>
									H2
								</button>
								<button
									type="button"
									onclick={() => execCommand('formatBlock', '<h3>')}
									class="px-2.5 py-2 text-gray-600 hover:bg-white hover:text-gray-900 rounded transition-colors font-semibold text-xs"
									title="見出し3"
								>
									H3
								</button>

								<div class="w-px bg-gray-300 mx-1"></div>

								<button
									type="button"
									onclick={() => execCommand('insertUnorderedList')}
									class="p-2 text-gray-600 hover:bg-white hover:text-gray-900 rounded transition-colors"
									title="箇条書き"
								>
									<List size={14} />
								</button>
								<button
									type="button"
									onclick={() => execCommand('insertOrderedList')}
									class="p-2 text-gray-600 hover:bg-white hover:text-gray-900 rounded transition-colors"
									title="番号付きリスト"
								>
									<ListOrdered size={14} />
								</button>

								<div class="w-px bg-gray-300 mx-1"></div>

								<button
									type="button"
									onclick={createLink}
									class="p-2 text-gray-600 hover:bg-white hover:text-gray-900 rounded transition-colors"
									title="リンク"
								>
									<LinkIcon size={14} />
								</button>
							</div>
						</div>

						<!-- エディターコンテンツ（Notionスタイル） -->
						<div
							bind:this={editorRef}
							contenteditable="true"
							role="textbox"
							aria-label="ドキュメント本文"
							data-placeholder="ここに書き始める..."
							class="min-h-[300px] md:min-h-[600px] text-[14px] md:text-[16px] leading-[1.6] focus:outline-none text-gray-700 notion-editor"
						></div>
					</div>
				</div>
			{:else}
				<!-- ドキュメント未選択時 -->
				<div class="bg-white rounded-xl shadow-md p-4 md:p-8">
					<!-- ヘッダー -->
					<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
						<div>
							<h2 class="text-xl md:text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
								<FileText size={24} class="text-emerald-600 md:w-7 md:h-7" />
								ドキュメント管理
							</h2>
							<p class="text-gray-600 text-sm md:text-base">メモ、仕様書、ドキュメントを整理しましょう</p>
						</div>
						{#if !showAddDocument}
							<button
								onclick={() => (showAddDocument = true)}
								class="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors md:hidden"
							>
								<Plus size={20} />
								新しいドキュメント
							</button>
							<button
								onclick={() => (showAddDocument = true)}
								class="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
							>
								<Plus size={20} />
								新しいドキュメント
							</button>
						{/if}
					</div>

					<!-- ドキュメント選択促進メッセージ -->
					{#if data.documents.length === 0}
						<div class="text-center py-8 md:py-16">
							<FileText size={48} class="mx-auto text-gray-300 mb-4 md:w-16 md:h-16" />
							<p class="text-gray-600 text-base md:text-lg mb-2">ドキュメントがありません</p>
							<p class="text-gray-500 text-sm md:text-base mb-6">新しいドキュメントを作成して情報を整理しましょう</p>
							{#if !showAddDocument}
								<button
									onclick={() => (showAddDocument = true)}
									class="inline-flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
								>
									<Plus size={20} />
									最初のドキュメントを作成
								</button>
							{/if}
						</div>
					{:else}
						<div class="text-center py-8 md:py-16">
							<FileText size={48} class="mx-auto text-gray-300 mb-4 md:w-16 md:h-16" />
							<p class="text-gray-600 text-base md:text-lg mb-2">ドキュメントを選択してください</p>
							<p class="text-gray-500 text-sm md:text-base">
								<span class="md:hidden">メニューからドキュメントを選択して編集を開始</span>
								<span class="hidden md:inline">左のリストからドキュメントをクリックして編集を開始しましょう</span>
							</p>
							<button
								onclick={() => (sidebarOpen = true)}
								class="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 md:hidden"
							>
								<Menu size={18} />
								ドキュメント一覧を表示
							</button>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	/* Notionスタイルのエディター */
	:global(.notion-editor) {
		outline: none;
	}

	/* プレースホルダー */
	:global(.notion-editor:empty:before) {
		content: attr(data-placeholder);
		color: #9ca3af;
		pointer-events: none;
	}

	/* 見出し1 - Notionスタイル */
	:global(.notion-editor h1) {
		font-size: 1.875rem;
		font-weight: 700;
		margin-top: 2rem;
		margin-bottom: 0.25rem;
		color: #111827;
		line-height: 1.2;
	}

	:global(.notion-editor h1:first-child) {
		margin-top: 0;
	}

	/* 見出し2 - Notionスタイル */
	:global(.notion-editor h2) {
		font-size: 1.5rem;
		font-weight: 600;
		margin-top: 1.75rem;
		margin-bottom: 0.25rem;
		color: #111827;
		line-height: 1.3;
	}

	/* 見出し3 - Notionスタイル */
	:global(.notion-editor h3) {
		font-size: 1.25rem;
		font-weight: 600;
		margin-top: 1.5rem;
		margin-bottom: 0.25rem;
		color: #111827;
		line-height: 1.4;
	}

	/* 段落 */
	:global(.notion-editor p) {
		margin-bottom: 0.25rem;
		line-height: 1.6;
		color: #374151;
	}

	/* リスト */
	:global(.notion-editor ul),
	:global(.notion-editor ol) {
		margin-left: 1.75rem;
		margin-bottom: 0.25rem;
		margin-top: 0.25rem;
	}

	:global(.notion-editor li) {
		margin-bottom: 0.125rem;
		line-height: 1.6;
		color: #374151;
	}

	:global(.notion-editor ul li) {
		list-style-type: disc;
	}

	:global(.notion-editor ol li) {
		list-style-type: decimal;
	}

	/* リンク */
	:global(.notion-editor a) {
		color: #10b981;
		text-decoration: none;
		border-bottom: 1px solid rgba(16, 185, 129, 0.3);
		transition: all 0.15s ease;
	}

	:global(.notion-editor a:hover) {
		color: #059669;
		border-bottom-color: #059669;
	}

	/* 太字 */
	:global(.notion-editor strong),
	:global(.notion-editor b) {
		font-weight: 600;
		color: #111827;
	}

	/* 斜体 */
	:global(.notion-editor em),
	:global(.notion-editor i) {
		font-style: italic;
		color: #374151;
	}

	/* 下線 */
	:global(.notion-editor u) {
		text-decoration: underline;
		text-decoration-thickness: 1px;
		text-underline-offset: 2px;
	}

	/* コード（インライン） */
	:global(.notion-editor code) {
		background-color: #f3f4f6;
		color: #dc2626;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-size: 0.875em;
		font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New',
			monospace;
	}

	/* 引用 */
	:global(.notion-editor blockquote) {
		border-left: 3px solid #e5e7eb;
		padding-left: 1rem;
		margin-left: 0;
		margin-bottom: 0.5rem;
		color: #6b7280;
		font-style: italic;
	}

	/* 区切り線 */
	:global(.notion-editor hr) {
		border: none;
		border-top: 1px solid #e5e7eb;
		margin: 2rem 0;
	}

	/* テーブル */
	:global(.notion-editor table) {
		border-collapse: collapse;
		width: 100%;
		margin: 1rem 0;
	}

	:global(.notion-editor th),
	:global(.notion-editor td) {
		border: 1px solid #e5e7eb;
		padding: 0.5rem 0.75rem;
		text-align: left;
	}

	:global(.notion-editor th) {
		background-color: #f9fafb;
		font-weight: 600;
		color: #111827;
	}

	/* セレクション（選択範囲） */
	:global(.notion-editor ::selection) {
		background-color: rgba(16, 185, 129, 0.2);
	}
</style>
