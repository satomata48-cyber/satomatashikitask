<script lang="ts">
	import type { LayoutData } from './$types';
	import { page } from '$app/stores';
	import { ArrowLeft, LogOut, Target, LayoutGrid, FileText, Users, BarChart3 } from 'lucide-svelte';

	let { data, children }: { data: LayoutData; children: any } = $props();

	// 現在のパスを取得してアクティブなメニューを判定
	let currentPath = $derived($page.url.pathname);
	let projectId = $derived($page.params.projectId);
</script>

<svelte:head>
	<title>{data.project?.title || 'プロジェクト'} - タスク管理</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
	<!-- Header -->
	<header class="bg-white shadow-sm border-b border-gray-200">
		<div class="max-w-full mx-auto px-4 py-4 flex items-center justify-between">
			<div class="flex items-center gap-4">
				<a href="/dashboard/projects" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
					<ArrowLeft size={20} class="text-gray-600" />
				</a>
				<div>
					<h1 class="text-xl font-bold text-gray-800">{data.project?.title || 'プロジェクト'}</h1>
					{#if data.project?.description}
						<p class="text-sm text-gray-600">{data.project.description}</p>
					{/if}
				</div>
			</div>
			<form method="POST" action="/dashboard?/logout">
				<button
					type="submit"
					class="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
				>
					<LogOut size={18} />
					<span class="hidden md:inline">ログアウト</span>
				</button>
			</form>
		</div>
	</header>

	<!-- Main Content with Sidebar -->
	<div class="flex h-[calc(100vh-73px)]">
		<!-- Left Navigation Sidebar -->
		<aside class="w-64 bg-white border-r border-gray-200 overflow-y-auto">
			<nav class="p-4">
				<ul class="space-y-1">
					<li>
						<a
							href="/dashboard/projects/{projectId}/dashboard"
							class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors {currentPath.includes('/dashboard') ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-blue-50'}"
						>
							<BarChart3 size={20} />
							<span class="text-sm font-medium">ダッシュボード</span>
						</a>
					</li>
					<li>
						<a
							href="/dashboard/projects/{projectId}/goals"
							class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors {currentPath.includes('/goals') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700 hover:bg-indigo-50'}"
						>
							<Target size={20} />
							<span class="text-sm font-medium">目標管理</span>
						</a>
					</li>
					<li>
						<a
							href="/dashboard/projects/{projectId}/boards"
							class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors {currentPath.includes('/boards') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700 hover:bg-indigo-50'}"
						>
							<LayoutGrid size={20} />
							<span class="text-sm font-medium">ボード管理</span>
						</a>
					</li>
					<li>
						<a
							href="/dashboard/projects/{projectId}/documents"
							class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors {currentPath.includes('/documents') && !currentPath.includes('/documents/') ? 'bg-purple-100 text-purple-700' : 'text-gray-700 hover:bg-purple-50'}"
						>
							<FileText size={20} />
							<span class="text-sm font-medium">ドキュメント管理</span>
						</a>
					</li>
					<li>
						<a
							href="/dashboard/projects/{projectId}/sns"
							class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors {currentPath.includes('/sns') || currentPath.includes('/youtube') || currentPath.includes('/instagram') ? 'bg-pink-100 text-pink-700' : 'text-gray-700 hover:bg-pink-50'}"
						>
							<Users size={20} />
							<span class="text-sm font-medium">SNS管理</span>
						</a>
					</li>
				</ul>
			</nav>
		</aside>

		<!-- Main Content Area -->
		<main class="flex-1 overflow-y-auto">
			{@render children()}
		</main>
	</div>
</div>
