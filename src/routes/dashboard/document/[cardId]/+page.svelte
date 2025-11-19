<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { ArrowLeft, Save } from 'lucide-svelte';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let content = $state(data.document.content);
	let saving = $state(false);
	let lastSaved = $state<string | null>(null);

	// 自動保存の表示を更新
	function updateSaveStatus() {
		const now = new Date();
		lastSaved = now.toLocaleTimeString('ja-JP');
	}
</script>

<svelte:head>
	<title>{data.card.title} - ドキュメント</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="bg-white shadow-sm border-b sticky top-0 z-10">
		<div class="max-w-7xl mx-auto px-4 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<a
						href="/dashboard?board={data.boardId}"
						class="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
						title="ダッシュボードに戻る"
					>
						<ArrowLeft size={20} />
					</a>
					<div>
						<h1 class="text-xl font-bold text-gray-800">{data.card.title}</h1>
						<p class="text-sm text-gray-500">{data.boardTitle} / {data.listTitle}</p>
					</div>
				</div>

				<div class="flex items-center gap-4">
					{#if lastSaved}
						<span class="text-sm text-gray-500">最終保存: {lastSaved}</span>
					{/if}
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
							};
						}}
					>
						<input type="hidden" name="content" value={content} />
						<button
							type="submit"
							disabled={saving}
							class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
						>
							<Save size={16} />
							{saving ? '保存中...' : '保存'}
						</button>
					</form>
				</div>
			</div>
		</div>
	</header>

	<!-- Editor -->
	<main class="max-w-4xl mx-auto px-4 py-8">
		<div class="bg-white rounded-lg shadow-sm border">
			<div class="p-8">
				<textarea
					bind:value={content}
					placeholder="ここにドキュメントを書いてください...

Markdownをサポートしています:
# 見出し1
## 見出し2
**太字**
*斜体*
- リスト
1. 番号付きリスト
[リンク](URL)
`コード`"
					class="w-full min-h-[600px] text-base leading-relaxed resize-none focus:outline-none font-mono"
					style="font-family: 'Source Code Pro', 'Consolas', monospace;"
				></textarea>
			</div>
		</div>

		<!-- Markdown Preview (Optional) -->
		<div class="mt-6 text-sm text-gray-500">
			<p>💡 ヒント: このドキュメントにはボード情報やカード情報を自由に記録できます。</p>
			<p>Markdownフォーマットをサポートしているので、見やすい文書を作成できます。</p>
		</div>
	</main>
</div>
