<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { FileText, Plus, Trash2, ExternalLink, Save, Bold, Italic, Underline, List, ListOrdered, Link as LinkIcon, Clock } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll, goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showAddDocument = $state(false);

	// Get selected document from URL parameter
	let selectedDocId = $derived($page.url.searchParams.get('doc') ? parseInt($page.url.searchParams.get('doc')!) : null);
	let selectedDocument = $derived(selectedDocId ? data.documents.find(d => d.id === selectedDocId) : null);

	// Editor state
	let title = $state(selectedDocument?.title || '');
	let editorRef: HTMLDivElement;
	let saving = $state(false);
	let lastSaved = $state<string | null>(null);

	// Update title when selected document changes
	$effect(() => {
		if (selectedDocument) {
			title = selectedDocument.title;
			if (editorRef && selectedDocument.content) {
				editorRef.innerHTML = selectedDocument.content;
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
		goto(`/dashboard/projects/${data.project.id}/documents?doc=${docId}`);
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
	<title>ドキュメント管理 - {data.project.title}</title>
</svelte:head>

<div class="p-6 flex gap-6">
	<!-- 左カラム: 全てのドキュメント -->
	<aside class="w-96">
		<div class="bg-white rounded-xl shadow-md p-4 sticky top-6">
			<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
				<FileText size={20} class="text-purple-600" />
				全てのドキュメント
			</h3>
			{#if data.allDocuments && data.allDocuments.length > 0}
				<div class="space-y-3">
					{#each data.allDocuments as doc}
						<button
							onclick={() => selectDocument(doc.id)}
							class="block w-full p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border transition-all text-left {selectedDocId === doc.id ? 'border-purple-500 shadow-md bg-gradient-to-br from-purple-100 to-pink-100' : 'border-purple-200 hover:border-purple-400 hover:shadow-md'}"
						>
							<div class="flex items-start justify-between mb-2">
								<h4 class="font-semibold text-gray-800 text-sm flex-1 truncate">{doc.title}</h4>
								{#if selectedDocId === doc.id}
									<FileText size={14} class="text-purple-600 flex-shrink-0 ml-2" />
								{:else}
									<ExternalLink size={14} class="text-purple-600 flex-shrink-0 ml-2" />
								{/if}
							</div>
							<p class="text-xs text-gray-600 mb-1">{doc.project_title || 'プロジェクト'}</p>
							<p class="text-xs text-gray-500">
								{new Date(doc.updated_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
							</p>
						</button>
					{/each}
				</div>
			{:else}
				<p class="text-gray-500 text-sm text-center py-8">ドキュメントがありません</p>
			{/if}
		</div>
	</aside>

	<!-- 右カラム: ドキュメント管理エリア -->
	<div class="flex-1">
		{#if selectedDocument}
			<!-- Notionスタイルのドキュメント編集エリア -->
			<div class="min-h-screen bg-white">
				<!-- トップバー（固定） -->
				<div class="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-10">
					<div class="max-w-[900px] mx-auto px-12 py-3">
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
										class="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
									>
										<Save size={12} />
										{saving ? '保存中...' : '保存'}
									</button>
								</form>
								<form method="POST" action="?/deleteDocument" use:enhance={handleFormSubmit}>
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
				<div class="max-w-[900px] mx-auto px-12 pt-16 pb-32">
					<!-- タイトル入力（Notionスタイル） -->
					<input
						type="text"
						bind:value={title}
						placeholder="無題"
						class="w-full text-[40px] font-bold text-gray-900 border-none outline-none bg-transparent focus:ring-0 placeholder-gray-300 mb-2 leading-tight"
					/>

					<!-- メタ情報（控えめ） -->
					<div class="flex items-center gap-3 text-xs text-gray-400 mb-8 pl-1">
						<span>作成: {formatDate(selectedDocument.created_at)}</span>
						<span>•</span>
						<span>更新: {formatDate(selectedDocument.updated_at)}</span>
					</div>

					<!-- フォーマットツールバー（ホバー時に表示） -->
					<div class="mb-4 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity">
						<div class="flex flex-wrap gap-1 p-2 bg-gray-50 rounded-lg border border-gray-200 inline-flex">
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
						placeholder="ここに書き始める..."
						class="min-h-[600px] text-[16px] leading-[1.6] focus:outline-none text-gray-700 notion-editor"
					>
					</div>
				</div>
			</div>
		{:else}
			<!-- ドキュメント未選択時 -->
			<div>
				<!-- ヘッダー -->
				<div class="flex items-center justify-between mb-6">
					<div>
						<h2 class="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
							<FileText size={28} class="text-purple-600" />
							ドキュメント管理
						</h2>
						<p class="text-gray-600">メモ、仕様書、ドキュメントを整理しましょう</p>
					</div>
					{#if !showAddDocument}
						<button
							onclick={() => showAddDocument = true}
							class="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
						>
							<Plus size={20} />
							新しいドキュメント
						</button>
					{/if}
				</div>

				<!-- 新規ドキュメント作成フォーム -->
				{#if showAddDocument}
					<div class="bg-white rounded-xl shadow-md p-6 border border-purple-200 mb-6">
						<h3 class="text-lg font-semibold text-gray-800 mb-4">新しいドキュメントを作成</h3>
						<form method="POST" action="?/createDocument" use:enhance={handleFormSubmit}>
							<div class="flex gap-3 items-end">
								<div class="flex-1">
									<input
										type="text"
										name="title"
										placeholder="ドキュメント名を入力..."
										required
										class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
									/>
								</div>
								<button type="submit" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
									作成
								</button>
								<button type="button" onclick={() => showAddDocument = false} class="px-3 py-2 text-gray-500 hover:bg-gray-200 rounded-lg">
									キャンセル
								</button>
							</div>
						</form>
					</div>
				{/if}

				<!-- ドキュメント選択促進メッセージ -->
				{#if data.documents.length === 0}
					<div class="text-center py-16">
						<FileText size={64} class="mx-auto text-gray-300 mb-4" />
						<p class="text-gray-600 text-lg mb-2">ドキュメントがありません</p>
						<p class="text-gray-500 mb-6">新しいドキュメントを作成して情報を整理しましょう</p>
						{#if !showAddDocument}
							<button
								onclick={() => showAddDocument = true}
								class="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
							>
								<Plus size={20} />
								最初のドキュメントを作成
							</button>
						{/if}
					</div>
				{:else}
					<div class="text-center py-16">
						<FileText size={64} class="mx-auto text-gray-300 mb-4" />
						<p class="text-gray-600 text-lg mb-2">ドキュメントを選択してください</p>
						<p class="text-gray-500">左のリストからドキュメントをクリックして編集を開始しましょう</p>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	/* Notionスタイルのエディター */
	:global(.notion-editor) {
		outline: none;
	}

	/* プレースホルダー */
	:global(.notion-editor:empty:before) {
		content: attr(placeholder);
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
		color: #3b82f6;
		text-decoration: none;
		border-bottom: 1px solid rgba(59, 130, 246, 0.3);
		transition: all 0.15s ease;
	}

	:global(.notion-editor a:hover) {
		color: #2563eb;
		border-bottom-color: #2563eb;
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
		font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
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
		background-color: rgba(147, 51, 234, 0.2);
	}
</style>
