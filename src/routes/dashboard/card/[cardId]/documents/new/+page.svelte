<script lang="ts">
	import type { PageData } from './$types';
	import { ArrowLeft, Save, Bold, Italic, Underline, List, ListOrdered, Link as LinkIcon } from 'lucide-svelte';
	import { enhance } from '$app/forms';

	let { data }: { data: PageData } = $props();

	let title = $state('無題のドキュメント');
	let editorRef: HTMLDivElement;
	let saving = $state(false);

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
</script>

<svelte:head>
	<title>新規ドキュメント - {data.card.title}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
	<!-- Header -->
	<header class="bg-white shadow-sm border-b border-blue-200 sticky top-0 z-10">
		<div class="max-w-7xl mx-auto px-6 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<a
						href="/dashboard/card/{data.card.id}/documents"
						class="p-2 text-gray-600 hover:bg-blue-50 rounded-lg transition-colors"
						title="ドキュメント一覧に戻る"
					>
						<ArrowLeft size={20} />
					</a>
					<div>
						<h1 class="text-2xl font-bold text-gray-800">新規ドキュメント</h1>
						<p class="text-sm text-gray-500">{data.boardTitle} / {data.listTitle} / {data.card.title}</p>
					</div>
				</div>

				<form
					method="POST"
					action="?/create"
					use:enhance={() => {
						saving = true;
						return async ({ result, update }) => {
							saving = false;
							await update();
						};
					}}
				>
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
			</div>
		</div>
	</header>

	<!-- Editor -->
	<main class="max-w-5xl mx-auto px-6 py-8">
		<!-- Title Input -->
		<div class="mb-6">
			<input
				type="text"
				bind:value={title}
				placeholder="ドキュメントのタイトルを入力..."
				class="w-full text-3xl font-bold text-gray-800 border-none outline-none bg-transparent focus:ring-0 placeholder-gray-400 px-2 py-3"
			/>
			<div class="h-px bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200 mt-2"></div>
		</div>

		<!-- Formatting Toolbar -->
		<div class="bg-white rounded-t-xl shadow-sm border border-blue-200 border-b-0 p-3">
			<div class="flex flex-wrap gap-2">
				<button
					type="button"
					onclick={() => execCommand('bold')}
					class="p-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors border border-blue-200"
					title="太字"
				>
					<Bold size={18} />
				</button>
				<button
					type="button"
					onclick={() => execCommand('italic')}
					class="p-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors border border-blue-200"
					title="斜体"
				>
					<Italic size={18} />
				</button>
				<button
					type="button"
					onclick={() => execCommand('underline')}
					class="p-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors border border-blue-200"
					title="下線"
				>
					<Underline size={18} />
				</button>

				<div class="w-px bg-blue-200 mx-1"></div>

				<button
					type="button"
					onclick={() => execCommand('formatBlock', '<h1>')}
					class="px-3 py-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors border border-blue-200 font-bold text-base"
					title="見出し1"
				>
					H1
				</button>
				<button
					type="button"
					onclick={() => execCommand('formatBlock', '<h2>')}
					class="px-3 py-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors border border-blue-200 font-bold text-base"
					title="見出し2"
				>
					H2
				</button>
				<button
					type="button"
					onclick={() => execCommand('formatBlock', '<h3>')}
					class="px-3 py-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors border border-blue-200 font-bold text-base"
					title="見出し3"
				>
					H3
				</button>

				<div class="w-px bg-blue-200 mx-1"></div>

				<button
					type="button"
					onclick={() => execCommand('insertUnorderedList')}
					class="p-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors border border-blue-200"
					title="箇条書き"
				>
					<List size={18} />
				</button>
				<button
					type="button"
					onclick={() => execCommand('insertOrderedList')}
					class="p-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors border border-blue-200"
					title="番号付きリスト"
				>
					<ListOrdered size={18} />
				</button>

				<div class="w-px bg-blue-200 mx-1"></div>

				<button
					type="button"
					onclick={createLink}
					class="p-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors border border-blue-200"
					title="リンク"
				>
					<LinkIcon size={18} />
				</button>
			</div>
		</div>

		<!-- Editor Content -->
		<div class="bg-white rounded-b-xl shadow-sm border border-blue-200 p-8">
			<div
				bind:this={editorRef}
				contenteditable="true"
				class="min-h-[600px] text-lg leading-relaxed focus:outline-none text-gray-800"
				style="font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;"
			>
				<p>ここにドキュメントの内容を入力してください...</p>
			</div>
		</div>

		<!-- Tips -->
		<div class="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-200">
			<h3 class="text-base font-semibold text-blue-900 mb-3">ヒント</h3>
			<ul class="text-sm text-blue-800 space-y-2">
				<li>• ツールバーのボタンを使って、テキストに書式を適用できます</li>
				<li>• 見出し、リスト、リンクなどを使って読みやすい文書を作成しましょう</li>
				<li>• 作成したドキュメントは、カードに関連付けられて保存されます</li>
			</ul>
		</div>
	</main>
</div>

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

	[contenteditable]:empty:before {
		content: attr(placeholder);
		color: #9ca3af;
	}
</style>
