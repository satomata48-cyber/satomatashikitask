<script lang="ts">
	import { Upload, FileText, AlertCircle, CheckCircle, Download, ArrowLeft } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let selectedFile = $state<File | null>(null);
	let fileInput: HTMLInputElement | null = $state(null);
	let uploading = $state(false);

	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			selectedFile = target.files[0];
		}
	}

	function handleFormSubmit() {
		uploading = true;
		return async ({ result, update }: any) => {
			uploading = false;
			await update();
			if (result.type === 'success') {
				selectedFile = null;
				if (fileInput) fileInput.value = '';
			}
		};
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-100 p-6">
	<div class="max-w-4xl mx-auto">
		<!-- ヘッダー -->
		<div class="mb-6">
			<div class="flex items-center gap-2 text-sm text-gray-600 mb-2">
				<a href="/dashboard/projects" class="hover:text-indigo-600">プロジェクト</a>
				<span>/</span>
				<a href="/dashboard/projects/{data.project.id}" class="hover:text-indigo-600">
					{data.project.title}
				</a>
				<span>/</span>
				<a href="/dashboard/projects/{data.project.id}/twitter" class="hover:text-indigo-600">
					Twitter
				</a>
				<span>/</span>
				<span class="text-gray-900">CSVインポート</span>
			</div>
			<div class="flex items-center gap-3">
				<Upload size={32} class="text-sky-600" />
				<h1 class="text-3xl font-bold text-gray-900">Twitter統計データインポート</h1>
			</div>
			<p class="text-gray-600 mt-2">TwitterのアーカイブCSVから過去の統計データをインポートします</p>
		</div>

		<!-- 戻るボタン -->
		<a
			href="/dashboard/projects/{data.project.id}/twitter"
			class="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors mb-6"
		>
			<ArrowLeft size={18} />
			Twitterページに戻る
		</a>

		<!-- 成功メッセージ -->
		{#if form?.success}
			<div class="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 mb-6">
				<div class="flex items-start gap-3">
					<CheckCircle size={24} class="text-emerald-600 flex-shrink-0 mt-0.5" />
					<div>
						<h3 class="font-semibold text-emerald-900">{form.message}</h3>
						{#if form.stats}
							<p class="text-sm text-emerald-700 mt-1">
								{form.stats.imported}件のデータをインポートしました（スキップ: {form.stats.skipped}件）
							</p>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- エラーメッセージ -->
		{#if form?.error}
			<div class="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
				<div class="flex items-start gap-3">
					<AlertCircle size={24} class="text-red-600 flex-shrink-0 mt-0.5" />
					<div>
						<h3 class="font-semibold text-red-900">エラー</h3>
						<p class="text-sm text-red-700 mt-1">{form.error}</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- 使い方ガイド -->
		<div class="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
			<h3 class="font-semibold text-blue-900 mb-3 flex items-center gap-2">
				<FileText size={20} />
				CSVファイルの準備方法
			</h3>
			<ol class="list-decimal list-inside space-y-2 text-sm text-blue-800">
				<li>Twitterにアクセスして、アカウント設定から「アーカイブをリクエスト」</li>
				<li>ダウンロードしたアーカイブを解凍</li>
				<li>以下のいずれかの方法でCSVを作成：</li>
			</ol>

			<div class="mt-4 bg-white rounded-lg p-4">
				<h4 class="font-semibold text-gray-900 mb-2">方法1: 手動でCSVを作成</h4>
				<p class="text-sm text-gray-700 mb-2">以下の形式のCSVファイルを作成してください：</p>
				<pre class="bg-gray-100 p-3 rounded text-xs overflow-x-auto"><code>date,followers_count,following_count,tweet_count
2025-12-01,234,147,3750
2025-12-02,235,147,3755
2025-12-03,238,148,3762</code></pre>
				<p class="text-xs text-gray-600 mt-2">※ ヘッダー行（1行目）は必須です</p>
			</div>

			<div class="mt-4 bg-white rounded-lg p-4">
				<h4 class="font-semibold text-gray-900 mb-2">方法2: Twitterアーカイブから抽出</h4>
				<p class="text-sm text-gray-700">
					アーカイブ内の <code class="bg-gray-100 px-1 py-0.5 rounded">account.js</code> や
					<code class="bg-gray-100 px-1 py-0.5 rounded">tweets.js</code> から日付ごとのデータを抽出して上記形式に変換
				</p>
			</div>
		</div>

		<!-- アップロードフォーム -->
		<div class="bg-white rounded-xl shadow-md p-6">
			<h3 class="text-lg font-semibold text-gray-800 mb-4">CSVファイルをアップロード</h3>
			<form method="POST" enctype="multipart/form-data" use:enhance={handleFormSubmit} class="space-y-4">
				<div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-sky-500 transition-colors">
					<input
						type="file"
						name="csvfile"
						accept=".csv"
						onchange={handleFileChange}
						bind:this={fileInput}
						class="hidden"
						id="file-upload"
						required
					/>
					<label for="file-upload" class="cursor-pointer">
						<Upload size={48} class="text-gray-400 mx-auto mb-4" />
						{#if selectedFile}
							<p class="text-sm font-medium text-gray-900">{selectedFile.name}</p>
							<p class="text-xs text-gray-500 mt-1">
								{(selectedFile.size / 1024).toFixed(1)} KB
							</p>
						{:else}
							<p class="text-sm text-gray-600">クリックしてCSVファイルを選択</p>
							<p class="text-xs text-gray-500 mt-1">または、ドラッグ&ドロップ</p>
						{/if}
					</label>
				</div>

				<div class="flex gap-2">
					<button
						type="submit"
						disabled={!selectedFile || uploading}
						class="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
					>
						{#if uploading}
							<span class="animate-spin">⏳</span>
							インポート中...
						{:else}
							<Upload size={18} />
							データをインポート
						{/if}
					</button>
				</div>
			</form>
		</div>

		<!-- サンプルCSVダウンロード -->
		<div class="bg-white rounded-xl shadow-md p-6 mt-6">
			<h3 class="text-lg font-semibold text-gray-800 mb-4">サンプルCSVファイル</h3>
			<p class="text-sm text-gray-600 mb-4">
				CSVの形式がわからない場合は、サンプルファイルをダウンロードして参考にしてください。
			</p>
			<a
				href="data:text/csv;charset=utf-8,date,followers_count,following_count,tweet_count%0A2025-12-01,234,147,3750%0A2025-12-02,235,147,3755%0A2025-12-03,238,148,3762"
				download="twitter_stats_sample.csv"
				class="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
			>
				<Download size={18} />
				サンプルCSVをダウンロード
			</a>
		</div>
	</div>
</div>
