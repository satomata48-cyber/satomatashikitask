<script lang="ts">
	import type { PageData } from './$types';
	import { LayoutGrid, FolderKanban, StickyNote, FileText, LogOut, ArrowRight } from 'lucide-svelte';
	import { enhance } from '$app/forms';

	let { data }: { data: PageData } = $props();

	const menuItems = [
		{
			title: 'ボード管理',
			description: 'Kanbanボードでタスクを管理',
			icon: LayoutGrid,
			href: '/dashboard/boards',
			color: 'bg-blue-500',
			hoverColor: 'hover:bg-blue-50',
			stats: `${data.stats.boardCount} ボード`
		},
		{
			title: 'プロジェクト',
			description: 'プロジェクトとマイルストーンを管理',
			icon: FolderKanban,
			href: '/dashboard/projects',
			color: 'bg-indigo-500',
			hoverColor: 'hover:bg-indigo-50',
			stats: `${data.stats.projectCount} プロジェクト`
		},
		{
			title: 'メモ帳',
			description: '素早くメモを取る',
			icon: StickyNote,
			href: '/dashboard/notes',
			color: 'bg-amber-500',
			hoverColor: 'hover:bg-amber-50',
			stats: `${data.stats.noteCount} メモ`
		},
		{
			title: 'ドキュメント',
			description: 'ドキュメントを整理・管理',
			icon: FileText,
			href: '/dashboard/documents',
			color: 'bg-emerald-500',
			hoverColor: 'hover:bg-emerald-50',
			stats: `${data.stats.documentCount} ドキュメント`
		}
	];
</script>

<svelte:head>
	<title>ダッシュボード - タスク管理</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
	<!-- Header -->
	<header class="bg-white shadow-sm">
		<div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
					<LayoutGrid size={24} class="text-white" />
				</div>
				<div>
					<h1 class="text-xl md:text-2xl font-bold text-gray-800">ダッシュボード</h1>
					<p class="text-xs text-gray-500">統合タスク管理システム</p>
				</div>
			</div>
			<form method="POST" action="?/logout" use:enhance>
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

	<!-- Main Content -->
	<main class="max-w-7xl mx-auto px-4 py-8">
		<!-- Welcome Section -->
		<div class="mb-8">
			<h2 class="text-2xl font-bold text-gray-800 mb-2">ようこそ</h2>
			<p class="text-gray-600">今日も生産的な1日にしましょう</p>
		</div>

		<!-- Menu Grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			{#each menuItems as item}
				<a
					href={item.href}
					class="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden {item.hoverColor}"
				>
					<div class="p-6">
						<div class="flex items-start justify-between mb-4">
							<div class="w-14 h-14 {item.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
								<item.icon size={28} class="text-white" />
							</div>
							<div class="flex items-center gap-1 text-gray-400 group-hover:text-gray-600 transition-colors">
								<span class="text-sm">開く</span>
								<ArrowRight size={16} class="group-hover:translate-x-1 transition-transform" />
							</div>
						</div>
						<h3 class="text-xl font-bold text-gray-800 mb-2">{item.title}</h3>
						<p class="text-gray-600 text-sm mb-4">{item.description}</p>
						<div class="flex items-center gap-2">
							<span class="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
								{item.stats}
							</span>
						</div>
					</div>
				</a>
			{/each}
		</div>

		<!-- Quick Stats -->
		<div class="mt-8 bg-white rounded-2xl shadow-md p-6">
			<h3 class="text-lg font-semibold text-gray-800 mb-4">クイック統計</h3>
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
				<div class="text-center p-4 bg-blue-50 rounded-xl">
					<p class="text-3xl font-bold text-blue-600">{data.stats.boardCount}</p>
					<p class="text-sm text-gray-600">ボード</p>
				</div>
				<div class="text-center p-4 bg-indigo-50 rounded-xl">
					<p class="text-3xl font-bold text-indigo-600">{data.stats.projectCount}</p>
					<p class="text-sm text-gray-600">プロジェクト</p>
				</div>
				<div class="text-center p-4 bg-amber-50 rounded-xl">
					<p class="text-3xl font-bold text-amber-600">{data.stats.noteCount}</p>
					<p class="text-sm text-gray-600">メモ</p>
				</div>
				<div class="text-center p-4 bg-emerald-50 rounded-xl">
					<p class="text-3xl font-bold text-emerald-600">{data.stats.documentCount}</p>
					<p class="text-sm text-gray-600">ドキュメント</p>
				</div>
			</div>
		</div>
	</main>
</div>
