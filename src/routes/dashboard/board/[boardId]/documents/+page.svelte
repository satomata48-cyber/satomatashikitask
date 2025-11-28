<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { ArrowLeft, Plus, FileText, Clock, Save, Bold, Italic, Underline, List, ListOrdered, Link as LinkIcon, Trash2, ChevronRight, ChevronDown, Type, Highlighter, Smile } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// ルートドキュメントを自動選択
	const rootDoc = $derived(data.documents.find(d => d.parent_id === null));
	let selectedDocId = $state<number | null>(null);
	let isCreatingNew = $state(false);
	let parentIdForNew = $state<number | null>(null);
	let title = $state('');
	let editorRef: HTMLDivElement | undefined = $state();
	let saving = $state(false);
	let lastSaved = $state<string | null>(null);
	let expandedDocs = $state<Set<number>>(new Set());
	let showColorPicker = $state(false);
	let showHighlightPicker = $state(false);
	let showEmojiPicker = $state(false);
	let showFontSizePicker = $state(false);
	let showH1TemplatePicker = $state(false);

	const selectedDoc = $derived(
		data.documents.find(d => d.id === selectedDocId)
	);

	// ルートドキュメントIDを自動設定
	$effect(() => {
		if (rootDoc && !selectedDocId && !isCreatingNew) {
			selectedDocId = rootDoc.id;
			console.log('Auto-selected root document:', rootDoc.id, rootDoc);
		}
	});

	// Debug: Log selected document
	$effect(() => {
		console.log('Selected Doc ID:', selectedDocId);
		console.log('Selected Doc:', selectedDoc);
		console.log('Is Creating New:', isCreatingNew);
		console.log('Save button should be visible:', !isCreatingNew && !!selectedDoc);
		console.log('editorRef:', editorRef);
		if (editorRef) {
			console.log('Editor innerHTML:', editorRef.innerHTML);
		}
	});

	// Build document hierarchy
	const docHierarchy = $derived.by(() => {
		const rootDocs = data.documents.filter(d => d.parent_id === null);
		const buildTree = (parentId: number | null): any[] => {
			return data.documents
				.filter(d => d.parent_id === parentId)
				.map(doc => ({
					...doc,
					children: buildTree(doc.id)
				}));
		};
		return buildTree(null);
	});

	// Get children of a document
	function getChildren(parentId: number) {
		return data.documents.filter(d => d.parent_id === parentId);
	}

	// Set editor content when document changes
	let lastLoadedDocId = $state<number | null>(null);
	let lastLoadedContent = $state<string>('');

	$effect(() => {
		if (!editorRef) return;

		if (isCreatingNew) {
			if (lastLoadedDocId !== -1) {
				editorRef.innerHTML = '<p>ここにドキュメントの内容を入力してください...</p>';
				title = '無題のドキュメント';
				lastLoadedDocId = -1;
				lastLoadedContent = editorRef.innerHTML;
			}
		} else if (selectedDoc) {
			const newContent = selectedDoc.content || '<p>ここからドキュメントを作成してください...</p>';

			// Only update if document ID changed OR content changed from database
			// Don't overwrite if user has been editing (content differs from last loaded)
			const contentChanged = newContent !== lastLoadedContent;
			const docChanged = selectedDoc.id !== lastLoadedDocId;
			const userEdited = editorRef.innerHTML !== lastLoadedContent;

			if (docChanged || (contentChanged && !userEdited)) {
				editorRef.innerHTML = newContent;
				title = selectedDoc.title || '無題のドキュメント';
				lastLoadedDocId = selectedDoc.id;
				lastLoadedContent = newContent;
			}
		}
	});

	function selectDocument(docId: number) {
		selectedDocId = docId;
		isCreatingNew = false;
		parentIdForNew = null;
	}

	function createNewDocument(parentId: number | null = null) {
		isCreatingNew = true;
		selectedDocId = null;
		parentIdForNew = parentId;
	}

	let creatingSubPageForId = $state<number | null>(null);
	let newSubPageTitle = $state('');

	function createSubDocument(parentId: number) {
		creatingSubPageForId = parentId;
		newSubPageTitle = '';
		// Auto-expand parent
		expandedDocs.add(parentId);
	}

	function cancelCreateSubPage() {
		creatingSubPageForId = null;
		newSubPageTitle = '';
	}

	async function submitNewSubPage(parentId: number) {
		if (!newSubPageTitle.trim()) return;

		const formData = new FormData();
		formData.append('title', newSubPageTitle);
		formData.append('content', '<p>新しいサブページ</p>');
		formData.append('parentId', parentId.toString());

		try {
			const response = await fetch('?/create', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				creatingSubPageForId = null;
				newSubPageTitle = '';
				// Reload data
				window.location.reload();
			}
		} catch (err) {
			console.error('Failed to create subpage:', err);
		}
	}

	function toggleExpand(docId: number) {
		if (expandedDocs.has(docId)) {
			expandedDocs.delete(docId);
		} else {
			expandedDocs.add(docId);
		}
		expandedDocs = new Set(expandedDocs);
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

	function applyTextColor() {
		showColorPicker = !showColorPicker;
		showHighlightPicker = false;
		showEmojiPicker = false;
		showFontSizePicker = false;
		showH1TemplatePicker = false;
	}

	function applyHighlight() {
		showHighlightPicker = !showHighlightPicker;
		showColorPicker = false;
		showEmojiPicker = false;
		showFontSizePicker = false;
		showH1TemplatePicker = false;
	}

	function toggleEmojiPicker() {
		showEmojiPicker = !showEmojiPicker;
		showColorPicker = false;
		showHighlightPicker = false;
		showFontSizePicker = false;
		showH1TemplatePicker = false;
	}

	function toggleFontSizePicker() {
		showFontSizePicker = !showFontSizePicker;
		showColorPicker = false;
		showHighlightPicker = false;
		showEmojiPicker = false;
		showH1TemplatePicker = false;
	}

	function toggleH1TemplatePicker() {
		showH1TemplatePicker = !showH1TemplatePicker;
		showColorPicker = false;
		showHighlightPicker = false;
		showEmojiPicker = false;
		showFontSizePicker = false;
	}

	function insertH1WithBackground(bgColor: string, textColor: string = '#1f2937') {
		editorRef?.focus();
		const selection = window.getSelection();
		if (selection && selection.rangeCount > 0) {
			const range = selection.getRangeAt(0);
			const h1 = document.createElement('h1');
			h1.style.backgroundColor = bgColor;
			h1.style.color = textColor;
			h1.style.padding = '12px 16px';
			h1.style.borderRadius = '8px';
			h1.style.marginTop = '16px';
			h1.style.marginBottom = '16px';
			h1.textContent = 'ここに見出しを入力...';

			range.deleteContents();
			range.insertNode(h1);

			// カーソルをh1の中に移動
			const newRange = document.createRange();
			newRange.selectNodeContents(h1);
			selection.removeAllRanges();
			selection.addRange(newRange);
		}
		showH1TemplatePicker = false;
		editorRef?.focus();
	}

	function insertEmoji(emoji: string) {
		editorRef?.focus();
		const selection = window.getSelection();
		if (selection && selection.rangeCount > 0) {
			const range = selection.getRangeAt(0);
			range.deleteContents();
			const emojiNode = document.createTextNode(emoji);
			range.insertNode(emojiNode);
			range.setStartAfter(emojiNode);
			range.setEndAfter(emojiNode);
			selection.removeAllRanges();
			selection.addRange(range);
		} else {
			// フォールバック: エディターの最後に追加
			const emojiNode = document.createTextNode(emoji);
			editorRef?.appendChild(emojiNode);
		}
		showEmojiPicker = false;
		editorRef?.focus();
	}

	function setTextColor(color: string) {
		execCommand('foreColor', color);
		showColorPicker = false;
	}

	function setHighlightColor(color: string) {
		execCommand('backColor', color);
		showHighlightPicker = false;
	}

	function setFontSize(size: string) {
		execCommand('fontSize', '7'); // まず最大サイズに設定
		// 選択されたテキストを取得してspanでラップ
		const selection = window.getSelection();
		if (selection && selection.rangeCount > 0) {
			const range = selection.getRangeAt(0);
			const span = document.createElement('span');
			span.style.fontSize = size;
			range.surroundContents(span);
		}
		showFontSizePicker = false;
		editorRef?.focus();
	}

	function getEditorContent() {
		const content = editorRef?.innerHTML || '';
		console.log('getEditorContent() called, returning:', content);
		return content;
	}

	function updateSaveStatus() {
		const now = new Date();
		lastSaved = now.toLocaleTimeString('ja-JP');
	}

	function formatDate(dateStr: string) {
		const date = new Date(dateStr);
		return date.toLocaleString('ja-JP', {
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function stripHtml(html: string) {
		const tmp = document.createElement('div');
		tmp.innerHTML = html;
		return tmp.textContent || tmp.innerText || '';
	}

	function confirmDelete() {
		if (confirm('このドキュメントを削除してもよろしいですか？子ドキュメントも削除されます。')) {
			const form = document.getElementById('delete-form') as HTMLFormElement;
			form.submit();
		}
	}

	const textColors = [
		{ name: '黒', value: '#000000' },
		{ name: '赤', value: '#ef4444' },
		{ name: '青', value: '#3b82f6' },
		{ name: '緑', value: '#10b981' },
		{ name: '黄', value: '#f59e0b' },
		{ name: '紫', value: '#8b5cf6' },
		{ name: 'ピンク', value: '#ec4899' },
		{ name: 'グレー', value: '#6b7280' }
	];

	const highlightColors = [
		{ name: 'なし', value: 'transparent' },
		{ name: '薄赤', value: '#fee2e2' },
		{ name: '薄青', value: '#dbeafe' },
		{ name: '薄緑', value: '#d1fae5' },
		{ name: '薄黄', value: '#fef3c7' },
		{ name: '薄紫', value: '#ede9fe' },
		{ name: '薄ピンク', value: '#fce7f3' },
		{ name: '薄グレー', value: '#f3f4f6' }
	];

	const fontSizes = [
		{ name: '小', value: '12px' },
		{ name: '通常', value: '16px' },
		{ name: '中', value: '20px' },
		{ name: '大', value: '24px' },
		{ name: '特大', value: '32px' },
		{ name: '超特大', value: '40px' }
	];

	const h1Templates = [
		{ name: '青', bgColor: '#dbeafe', textColor: '#1e40af' },
		{ name: '緑', bgColor: '#d1fae5', textColor: '#065f46' },
		{ name: '黄', bgColor: '#fef3c7', textColor: '#92400e' },
		{ name: '赤', bgColor: '#fee2e2', textColor: '#991b1b' },
		{ name: '紫', bgColor: '#ede9fe', textColor: '#5b21b6' },
		{ name: 'ピンク', bgColor: '#fce7f3', textColor: '#9f1239' },
		{ name: 'グレー', bgColor: '#f3f4f6', textColor: '#1f2937' },
		{ name: 'オレンジ', bgColor: '#fed7aa', textColor: '#9a3412' }
	];

	const emojis = [
		// 顔文字
		'😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
		'😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
		'😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
		'🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏',
		'😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖',
		'😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡',
		'🤯', '😳', '🥶', '😱', '😨', '😰', '😥', '😓',
		'🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑',
		// ジェスチャー
		'👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙',
		'👏', '🙌', '👐', '🤲', '🙏', '✍️', '💪', '🦾',
		// ハート
		'❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
		'💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘',
		// シンボル
		'⭐', '🌟', '✨', '💫', '🔥', '💥', '💯', '✅',
		'📌', '📍', '🎯', '🎉', '🎊', '🎈', '🎁', '🏆',
		'❗', '❓', '❕', '❔', '⁉️', '‼️', '⚠️', '🚫',
		// フラットな図形（マテリアル風）
		'🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '🟤', '⚫',
		'⚪', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '🟫',
		'⬛', '⬜', '🔶', '🔷', '🔸', '🔹', '🔺', '🔻',
		'💠', '🔘', '🔳', '🔲', '◼️', '◻️', '◾', '◽',
		'▪️', '▫️', '🟰', '➕', '➖', '✖️', '➗', '🟰',
		// 矢印（マテリアル風）
		'➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️',
		'↕️', '↔️', '↩️', '↪️', '⤴️', '⤵️', '🔀', '🔁',
		'🔂', '🔃', '🔄', '🔙', '🔚', '🔛', '🔜', '🔝',
		// チェックマークと記号
		'☑️', '✔️', '✅', '❎', '✖️', '➰', '➿', '〰️',
		'©️', '®️', '™️', '🔣', '#️⃣', '*️⃣', '0️⃣', '1️⃣',
		'2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣',
		// その他のアイコン
		'📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '💾',
		'💿', '📀', '🎮', '🕹️', '📷', '📹', '🎥', '📞',
		'☎️', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭',
		'⏱️', '⏰', '⏲️', '⏳', '⌛', '📡', '🔋', '🔌',
		'💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵',
		'💴', '💶', '💷', '💰', '💳', '📝', '📄', '📃',
		'📑', '📊', '📈', '📉', '📋', '📁', '📂', '🗂️'
	];
</script>

<svelte:head>
	<title>{data.card.title} - ドキュメント</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
	<!-- Header -->
	<header class="bg-white shadow-sm border-b border-blue-200 sticky top-0 z-10">
		<div class="px-6 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<a
						href="/dashboard/board/{data.board.id}"
						class="p-2 text-gray-600 hover:bg-blue-50 rounded-lg transition-colors"
						title="ボードに戻る"
					>
						<ArrowLeft size={20} />
					</a>
					<div>
						<h1 class="text-2xl font-bold text-gray-800">{data.board.title} - ドキュメント</h1>
						<p class="text-sm text-gray-500">ボードのドキュメント</p>
					</div>
				</div>

				<div class="flex items-center gap-4">
					{#if lastSaved}
						<div class="flex items-center gap-2 text-sm text-gray-500">
							<Clock size={14} />
							<span>最終保存: {lastSaved}</span>
						</div>
					{/if}

					{#if !isCreatingNew && selectedDoc}
						<form
							method="POST"
							action="?/save"
							use:enhance={() => {
								saving = true;
								return async ({ result, update }) => {
									saving = false;
									if (result.type === 'success') {
										updateSaveStatus();
									}
									await update({ reset: false });
									await invalidateAll();
								};
							}}
						>
							<input type="hidden" name="docId" value={selectedDoc.id} />
							<input type="hidden" name="title" value={title} />
							<input type="hidden" name="content" value={getEditorContent()} />
							<button
								type="submit"
								disabled={saving}
								class="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 text-base"
							>
								<Save size={18} />
								{saving ? '保存中...' : '保存'}
							</button>
						</form>

						{#if selectedDoc.parent_id !== null}
							<button
								type="button"
								onclick={confirmDelete}
								class="px-4 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2 border border-red-200"
								title="削除"
							>
								<Trash2 size={18} />
							</button>

							<form id="delete-form" method="POST" action="?/delete" use:enhance={async () => {
								return async ({ result, update }) => {
									if (result.type === 'success') {
										isCreatingNew = false;
										selectedDocId = rootDoc?.id || null;
									}
									await update();
									await invalidateAll();
								};
							}}>
								<input type="hidden" name="docId" value={selectedDoc.id} />
							</form>
						{/if}
					{:else if isCreatingNew}
						<form
							method="POST"
							action="?/create"
							use:enhance={() => {
								saving = true;
								return async ({ result, update }) => {
									saving = false;
									if (result.type === 'success') {
										updateSaveStatus();
										isCreatingNew = false;
										parentIdForNew = null;
									}
									await update({ reset: false });
									await invalidateAll();
								};
							}}
						>
							<input type="hidden" name="title" value={title} />
							<input type="hidden" name="content" value={getEditorContent()} />
							{#if parentIdForNew}
								<input type="hidden" name="parentId" value={parentIdForNew} />
							{/if}
							<button
								type="submit"
								disabled={saving}
								class="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 text-base"
							>
								<Save size={18} />
								{saving ? '作成中...' : '作成'}
							</button>
						</form>
					{/if}
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Sidebar - Document List -->
		<aside class="w-80 bg-white border-r border-blue-200 flex flex-col">
			<div class="flex-1 overflow-y-auto p-4">
				{#if data.documents.length === 0}
					<div class="text-center py-12 px-4">
						<FileText size={48} class="mx-auto text-gray-300 mb-3" />
						<p class="text-sm text-gray-500">ドキュメントがありません</p>
					</div>
				{:else}
					{@render docTree(docHierarchy, 0)}
				{/if}
			</div>
		</aside>

		<!-- Editor Area -->
		<main class="flex-1 overflow-y-auto bg-white">
			{#if !isCreatingNew && !selectedDoc}
				<div class="h-full flex items-center justify-center">
					<div class="text-center">
						<FileText size={64} class="mx-auto text-gray-300 mb-4" />
						<h2 class="text-xl font-semibold text-gray-600 mb-2">ドキュメントを選択してください</h2>
						<p class="text-gray-500 mb-6">左側のリストからドキュメントを選択するか、新規作成してください</p>
					</div>
				</div>
			{:else}
				<div class="max-w-4xl mx-auto px-20 py-16">
					<!-- Save Button - Floating Top Right -->
					{#if !isCreatingNew && selectedDoc}
						<div class="mb-12 flex items-center justify-between">
							<div class="flex items-center gap-3 text-xs text-gray-400">
								<span>更新: {formatDate(selectedDoc.updated_at)}</span>
								{#if lastSaved}
									<span>•</span>
									<span>保存: {lastSaved}</span>
								{/if}
							</div>
							<form
								method="POST"
								action="?/save"
								use:enhance={({ formData }) => {
									const contentToSave = getEditorContent();
									console.log('=== SAVE BUTTON CLICKED ===');
									console.log('Doc ID:', selectedDoc.id);
									console.log('Title:', title);
									console.log('Content to save:', contentToSave);
									console.log('Content length:', contentToSave.length);

									// Update formData with current values at submit time
									formData.set('content', contentToSave);
									formData.set('title', title);
									formData.set('docId', selectedDoc.id.toString());

									saving = true;
									return async ({ result, update }) => {
										console.log('Save result:', result);
										saving = false;
										if (result.type === 'success') {
											updateSaveStatus();
										}
										await update({ reset: false });
										await invalidateAll();
									};
								}}
							>
								<input type="hidden" name="docId" value={selectedDoc.id} />
								<input type="hidden" name="title" value={title} />
								<input type="hidden" name="content" value={getEditorContent()} />
								<button
									type="submit"
									disabled={saving}
									class="px-3 py-1.5 text-sm text-gray-600 hover:text-blue-900 hover:bg-blue-100/70 rounded-md flex items-center gap-1.5 disabled:opacity-50 transition-colors"
								>
									<Save size={14} />
									<span>{saving ? '保存中...' : '保存'}</span>
								</button>
							</form>
						</div>
					{/if}

					<!-- Title Input -->
					<div class="mb-8">
						<input
							type="text"
							bind:value={title}
							placeholder="無題"
							class="w-full text-5xl font-bold text-gray-900 border-none outline-none bg-transparent focus:ring-0 placeholder-gray-300 px-0 py-2"
							style="font-family: ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif;"
						/>
					</div>

					<!-- Formatting Toolbar -->
					<div class="bg-blue-50/50 rounded-lg border border-blue-100 p-2 mb-4 sticky top-[73px] z-10 backdrop-blur-sm">
						<div class="flex flex-wrap gap-1 items-center">
							<button
								type="button"
								onclick={() => execCommand('bold')}
								class="p-2 text-gray-600 hover:bg-blue-100/70 hover:text-blue-900 rounded transition-colors"
								title="太字"
							>
								<Bold size={16} />
							</button>
							<button
								type="button"
								onclick={() => execCommand('italic')}
								class="p-2 text-gray-600 hover:bg-blue-100/70 hover:text-blue-900 rounded transition-colors"
								title="斜体"
							>
								<Italic size={16} />
							</button>
							<button
								type="button"
								onclick={() => execCommand('underline')}
								class="p-2 text-gray-600 hover:bg-blue-100/70 hover:text-blue-900 rounded transition-colors"
								title="下線"
							>
								<Underline size={16} />
							</button>

							<div class="w-px bg-blue-200 mx-1 h-6"></div>

							<!-- Text Color -->
							<div class="relative">
								<button
									type="button"
									onclick={applyTextColor}
									class="p-2 text-gray-600 hover:bg-blue-100/70 hover:text-blue-900 rounded transition-colors"
									title="文字色"
								>
									<Type size={16} />
								</button>
								{#if showColorPicker}
									<div class="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-blue-200 p-3 z-20">
										<div class="flex gap-2 flex-wrap w-48">
											{#each textColors as color}
												<button
													type="button"
													onclick={() => setTextColor(color.value)}
													class="w-8 h-8 rounded border-2 border-gray-300 hover:border-blue-400 transition-all"
													style="background-color: {color.value}"
													title={color.name}
												></button>
											{/each}
										</div>
									</div>
								{/if}
							</div>

							<!-- Highlight Color -->
							<div class="relative">
								<button
									type="button"
									onclick={applyHighlight}
									class="p-2 text-gray-600 hover:bg-blue-100/70 hover:text-blue-900 rounded transition-colors"
									title="マーカー"
								>
									<Highlighter size={16} />
								</button>
								{#if showHighlightPicker}
									<div class="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-blue-200 p-3 z-20">
										<div class="flex gap-2 flex-wrap w-48">
											{#each highlightColors as color}
												<button
													type="button"
													onclick={() => setHighlightColor(color.value)}
													class="w-8 h-8 rounded border-2 border-gray-300 hover:border-blue-400 transition-all"
													style="background-color: {color.value}"
													title={color.name}
												></button>
											{/each}
										</div>
									</div>
								{/if}
							</div>

							<!-- Font Size -->
							<div class="relative">
								<button
									type="button"
									onclick={toggleFontSizePicker}
									class="p-2 text-gray-600 hover:bg-blue-100/70 hover:text-blue-900 rounded transition-colors flex items-center gap-1"
									title="文字サイズ"
								>
									<span class="font-bold text-sm">A</span>
								</button>
								{#if showFontSizePicker}
									<div class="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-blue-200 p-3 z-20">
										<div class="flex flex-col gap-1 w-32">
											{#each fontSizes as size}
												<button
													type="button"
													onclick={() => setFontSize(size.value)}
													class="px-3 py-2 text-left rounded hover:bg-blue-50 transition-colors border border-gray-200"
													style="font-size: {size.value}"
												>
													{size.name}
												</button>
											{/each}
										</div>
									</div>
								{/if}
							</div>

							<div class="w-px bg-blue-200 mx-1 h-6"></div>

							<!-- Emoji Picker -->
							<div class="relative">
								<button
									type="button"
									onclick={toggleEmojiPicker}
									class="p-2 text-gray-600 hover:bg-blue-100/70 hover:text-blue-900 rounded transition-colors"
									title="絵文字"
								>
									<Smile size={16} />
								</button>
								{#if showEmojiPicker}
									<div class="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-blue-200 p-3 z-20">
										<div class="flex gap-1 flex-wrap w-64 max-h-64 overflow-y-auto">
											{#each emojis as emoji}
												<button
													type="button"
													onclick={() => insertEmoji(emoji)}
													class="w-8 h-8 text-xl hover:bg-blue-50 rounded transition-all"
													title={emoji}
												>{emoji}</button>
											{/each}
										</div>
									</div>
								{/if}
							</div>

							<div class="w-px bg-blue-200 mx-1 h-6"></div>

							<!-- H1 Template Picker -->
							<div class="relative">
								<button
									type="button"
									onclick={toggleH1TemplatePicker}
									class="px-2 py-1.5 text-gray-600 hover:bg-blue-100/70 hover:text-blue-900 rounded transition-colors font-bold text-xs flex items-center gap-1"
									title="背景色付き見出し"
								>
									H1
									<span class="text-[10px]">⬛</span>
								</button>
								{#if showH1TemplatePicker}
									<div class="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-blue-200 p-3 z-20">
										<div class="flex flex-col gap-1 w-48">
											{#each h1Templates as template}
												<button
													type="button"
													onclick={() => insertH1WithBackground(template.bgColor, template.textColor)}
													class="px-3 py-2 text-left rounded transition-colors border border-gray-200 flex items-center justify-between"
													style="background-color: {template.bgColor}; color: {template.textColor};"
												>
													<span class="font-bold">見出し</span>
													<span class="text-xs">{template.name}</span>
												</button>
											{/each}
										</div>
									</div>
								{/if}
							</div>

							<button
								type="button"
								onclick={() => execCommand('formatBlock', '<h1>')}
								class="px-2 py-1.5 text-gray-600 hover:bg-blue-100/70 hover:text-blue-900 rounded transition-colors font-bold text-xs"
								title="見出し1"
							>
								H1
							</button>
							<button
								type="button"
								onclick={() => execCommand('formatBlock', '<h2>')}
								class="px-2 py-1.5 text-gray-600 hover:bg-blue-100/70 hover:text-blue-900 rounded transition-colors font-bold text-xs"
								title="見出し2"
							>
								H2
							</button>
							<button
								type="button"
								onclick={() => execCommand('formatBlock', '<h3>')}
								class="px-2 py-1.5 text-gray-600 hover:bg-blue-100/70 hover:text-blue-900 rounded transition-colors font-bold text-xs"
								title="見出し3"
							>
								H3
							</button>

							<div class="w-px bg-blue-200 mx-1 h-6"></div>

							<button
								type="button"
								onclick={() => execCommand('insertUnorderedList')}
								class="p-2 text-gray-600 hover:bg-blue-100/70 hover:text-blue-900 rounded transition-colors"
								title="箇条書き"
							>
								<List size={16} />
							</button>
							<button
								type="button"
								onclick={() => execCommand('insertOrderedList')}
								class="p-2 text-gray-600 hover:bg-blue-100/70 hover:text-blue-900 rounded transition-colors"
								title="番号付きリスト"
							>
								<ListOrdered size={16} />
							</button>

							<div class="w-px bg-blue-200 mx-1 h-6"></div>

							<button
								type="button"
								onclick={createLink}
								class="p-2 text-gray-600 hover:bg-blue-100/70 hover:text-blue-900 rounded transition-colors"
								title="リンク"
							>
								<LinkIcon size={16} />
							</button>
						</div>
					</div>

					<!-- Editor Content -->
					<div class="mb-24">
						<div
							bind:this={editorRef}
							contenteditable="true"
							oninput={() => {
								console.log('Editor input event fired');
								console.log('Current editor content:', editorRef?.innerHTML);
							}}
							class="min-h-[700px] text-base leading-relaxed focus:outline-none text-gray-700"
							style="font-family: ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif; line-height: 1.8;"
						>
						</div>
					</div>

				</div>
			{/if}
		</main>
	</div>
</div>

{#snippet docTree(docs: any[], level: number)}
	{#each docs as doc}
		<div class="mb-1" style="margin-left: {level * 16}px">
			<!-- Document Button -->
			<button
				type="button"
				onclick={() => selectDocument(doc.id)}
				class="w-full text-left p-3 rounded-lg border border-blue-200 hover:border-blue-300 hover:shadow-sm transition-all {selectedDocId === doc.id ? 'bg-blue-50 border-blue-400 shadow-sm' : 'bg-white'}"
			>
				<div class="flex items-start gap-2">
					<FileText size={16} class="text-blue-500 flex-shrink-0 mt-0.5" />
					<div class="flex-1 min-w-0">
						<h3 class="font-semibold text-gray-800 text-sm truncate">
							{doc.title}
						</h3>
						<div class="flex items-center gap-1 text-xs text-gray-400 mt-1">
							<Clock size={10} />
							<span>{formatDate(doc.updated_at)}</span>
						</div>
					</div>
				</div>
			</button>

			<!-- Add Subpage Button - Below Document (Only for root documents) -->
			{#if doc.parent_id === null}
				<div class="mt-1 ml-6">
					<button
						type="button"
						onclick={() => createSubDocument(doc.id)}
						class="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
						title="サブページを追加"
					>
						<Plus size={12} />
						<span>サブページを追加</span>
					</button>
				</div>

				<!-- Inline Subpage Creation Form -->
				{#if creatingSubPageForId === doc.id}
					<div class="mt-2 mb-2 ml-6">
						<div class="flex items-center gap-2 bg-blue-50 p-2 rounded-lg border border-blue-200">
							<input
								type="text"
								bind:value={newSubPageTitle}
								placeholder="サブページのタイトル"
								class="flex-1 px-2 py-1 border border-blue-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
								onkeydown={(e) => {
									if (e.key === 'Enter') submitNewSubPage(doc.id);
									if (e.key === 'Escape') cancelCreateSubPage();
								}}
								autofocus
							/>
							<button
								type="button"
								onclick={() => submitNewSubPage(doc.id)}
								class="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
							>
								追加
							</button>
							<button
								type="button"
								onclick={cancelCreateSubPage}
								class="px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 text-xs"
							>
								×
							</button>
						</div>
					</div>
				{/if}
			{/if}

			<!-- Always show children -->
			{#if doc.children.length > 0}
				<div class="mt-1">
					{@render docTree(doc.children, level + 1)}
				</div>
			{/if}
		</div>
	{/each}
{/snippet}

<style>
	/* Editor Styles */
	[contenteditable] {
		outline: none;
	}

	[contenteditable] h1 {
		font-size: 2rem;
		font-weight: bold;
		margin-top: 1.5rem;
		margin-bottom: 1rem;
		color: #1f2937;
	}

	[contenteditable] h2 {
		font-size: 1.75rem;
		font-weight: bold;
		margin-top: 1.25rem;
		margin-bottom: 0.875rem;
		color: #374151;
	}

	[contenteditable] h3 {
		font-size: 1.5rem;
		font-weight: bold;
		margin-top: 1rem;
		margin-bottom: 0.75rem;
		color: #4b5563;
	}

	[contenteditable] p {
		margin-bottom: 1rem;
		line-height: 1.75;
	}

	[contenteditable] ul,
	[contenteditable] ol {
		margin-left: 1.5rem;
		margin-bottom: 1rem;
	}

	[contenteditable] li {
		margin-bottom: 0.5rem;
		line-height: 1.75;
	}

	[contenteditable] a {
		color: #3b82f6;
		text-decoration: underline;
	}

	[contenteditable] a:hover {
		color: #2563eb;
	}
</style>
