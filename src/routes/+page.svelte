<script lang="ts">
	import { ArrowRight, CheckCircle, Layout, Tags, Upload } from 'lucide-svelte';
</script>

<svelte:head>
	<title>satomatashikitask - シンプルなタスク管理ツール</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
	<!-- Header -->
	<header class="bg-white/80 backdrop-blur-sm shadow-sm fixed w-full top-0 z-10">
		<nav class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
			<div class="text-2xl font-bold text-indigo-600">satomatashikitask</div>
			<a
				href="/login"
				class="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
			>
				ログイン
			</a>
		</nav>
	</header>

	<!-- Hero Section -->
	<section class="pt-32 pb-20 px-4">
		<div class="max-w-4xl mx-auto text-center">
			<h1 class="text-5xl font-bold text-gray-900 mb-6">
				シンプルで使いやすい<br />タスク管理ツール
			</h1>
			<p class="text-xl text-gray-600 mb-8">
				個人用のTrello風タスク管理システム。<br />ボード、リスト、カードで直感的にタスクを整理できます。
			</p>
			<a
				href="/login"
				class="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white text-lg font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl"
			>
				今すぐ始める
				<ArrowRight size={20} />
			</a>
		</div>
	</section>

	<!-- Features Section -->
	<section class="py-20 px-4">
		<div class="max-w-6xl mx-auto">
			<h2 class="text-3xl font-bold text-center text-gray-900 mb-12">主な機能</h2>

			<div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
				<!-- Feature 1 -->
				<div class="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
					<div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
						<Layout class="text-indigo-600" size={24} />
					</div>
					<h3 class="text-xl font-semibold text-gray-900 mb-2">ボード管理</h3>
					<p class="text-gray-600">
						複数のボードを作成して、プロジェクトごとにタスクを整理できます。
					</p>
				</div>

				<!-- Feature 2 -->
				<div class="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
					<div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
						<CheckCircle class="text-indigo-600" size={24} />
					</div>
					<h3 class="text-xl font-semibold text-gray-900 mb-2">カード管理</h3>
					<p class="text-gray-600">
						タスクをカードとして管理。タイトル、説明、期限を設定できます。
					</p>
				</div>

				<!-- Feature 3 -->
				<div class="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
					<div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
						<Tags class="text-indigo-600" size={24} />
					</div>
					<h3 class="text-xl font-semibold text-gray-900 mb-2">ラベル機能</h3>
					<p class="text-gray-600">カードにラベルを付けて、視覚的に分類・管理できます。</p>
				</div>

				<!-- Feature 4 -->
				<div class="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
					<div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
						<Upload class="text-indigo-600" size={24} />
					</div>
					<h3 class="text-xl font-semibold text-gray-900 mb-2">ファイル添付</h3>
					<p class="text-gray-600">
						カードにファイルを添付して、関連資料を一緒に管理できます。
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- CTA Section -->
	<section class="py-20 px-4">
		<div class="max-w-4xl mx-auto text-center">
			<h2 class="text-3xl font-bold text-gray-900 mb-6">さあ、始めましょう</h2>
			<p class="text-xl text-gray-600 mb-8">無料でアカウントを作成して、すぐに使い始められます。</p>
			<a
				href="/login"
				class="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white text-lg font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl"
			>
				アカウント作成・ログイン
				<ArrowRight size={20} />
			</a>
		</div>
	</section>

	<!-- Footer -->
	<footer class="bg-gray-900 text-white py-12 px-4">
		<div class="max-w-6xl mx-auto text-center">
			<p class="text-gray-400">
				&copy; 2025 satomatashikitask. Built with SvelteKit & Cloudflare.
			</p>
		</div>
	</footer>
</div>
