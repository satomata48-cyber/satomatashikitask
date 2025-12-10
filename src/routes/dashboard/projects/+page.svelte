<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { Pencil, Trash2, Plus, FolderKanban, Target, CheckCircle2, ArrowLeft, LogOut, LayoutGrid, StickyNote, FileText, Home } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	function handleFormSubmit() {
		return async ({ result }: { result: { type: string } }) => {
			if (result.type === 'success' || result.type === 'redirect') {
				showAddProject = false;
				editProjectModal = null;
				await invalidateAll();
			}
		};
	}

	let showAddProject = $state(false);
	let editProjectModal = $state<{
		id: number;
		title: string;
		description: string | null;
		color: string;
		status: string;
	} | null>(null);
	let newProjectColor = $state('#3B82F6');

	const projectColors = [
		'#3B82F6', // Blue
		'#10B981', // Green
		'#F59E0B', // Yellow
		'#EF4444', // Red
		'#8B5CF6', // Purple
		'#EC4899', // Pink
		'#06B6D4', // Cyan
		'#F97316', // Orange
	];

	function getProgressPercent(completed: number, total: number): number {
		if (total === 0) return 0;
		return Math.round((completed / total) * 100);
	}
</script>

<svelte:head>
	<title>プロジェクト一覧 - タスク管理</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100">
	<!-- Header -->
	<header class="bg-white shadow-sm">
		<div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
			<div class="flex items-center gap-4">
				<a href="/dashboard" class="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="ダッシュボードに戻る">
					<ArrowLeft size={20} class="text-gray-600" />
				</a>
				<div class="flex items-center gap-3">
					<FolderKanban size={28} class="text-indigo-600" />
					<h1 class="text-xl md:text-2xl font-bold text-gray-800">プロジェクト管理</h1>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<!-- ナビゲーションリンク -->
				<a
					href="/dashboard/boards"
					class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
					title="ボード管理"
				>
					<LayoutGrid size={18} />
					<span class="hidden md:inline">ボード</span>
				</a>
				<a
					href="/dashboard/notes"
					class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-600 rounded-lg transition-colors"
					title="メモ帳"
				>
					<StickyNote size={18} />
					<span class="hidden md:inline">メモ</span>
				</a>
				<a
					href="/dashboard/documents"
					class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors"
					title="ドキュメント"
				>
					<FileText size={18} />
					<span class="hidden md:inline">ドキュメント</span>
				</a>
				<div class="w-px h-6 bg-gray-200 mx-1"></div>
				<form method="POST" action="/dashboard?/logout" use:enhance>
					<button
						type="submit"
						class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
					>
						<LogOut size={18} />
						<span class="hidden md:inline">ログアウト</span>
					</button>
				</form>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="max-w-7xl mx-auto px-4 py-8">
		<!-- プロジェクト一覧ヘッダー -->
		<div class="flex items-center justify-between mb-6">
			<h2 class="text-lg md:text-xl font-semibold text-gray-800">プロジェクト一覧</h2>
			{#if !showAddProject}
				<button
					onclick={() => (showAddProject = true)}
					class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm md:text-base"
				>
					<Plus size={18} />
					新しいプロジェクト
				</button>
			{/if}
		</div>

		<!-- 新規プロジェクト作成フォーム -->
		{#if showAddProject}
			<div class="bg-white rounded-xl shadow-md p-6 mb-6">
				<h3 class="text-lg font-semibold text-gray-800 mb-4">新しいプロジェクトを作成</h3>
				<form method="POST" action="?/createProject" use:enhance={handleFormSubmit}>
					<input
						type="text"
						name="title"
						placeholder="プロジェクト名を入力..."
						required
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
					/>
					<textarea
						name="description"
						placeholder="説明（任意）"
						rows="3"
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
					></textarea>
					<!-- カラー選択 -->
					<div class="mb-4">
						<p class="text-sm font-medium text-gray-700 mb-2">プロジェクトカラー</p>
						<div class="flex gap-2">
							{#each projectColors as color}
								<button
									type="button"
									onclick={() => (newProjectColor = color)}
									class="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
									style="background-color: {color}; border-color: {newProjectColor === color ? '#1F2937' : 'transparent'}"
								></button>
							{/each}
						</div>
						<input type="hidden" name="color" value={newProjectColor} />
					</div>
					<div class="flex gap-3">
						<button
							type="submit"
							class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
						>
							作成
						</button>
						<button
							type="button"
							onclick={() => (showAddProject = false)}
							class="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
						>
							キャンセル
						</button>
					</div>
				</form>
			</div>
		{/if}

		<!-- プロジェクト一覧 -->
		{#if data.projects.length === 0}
			<div class="text-center py-16">
				<FolderKanban size={64} class="mx-auto text-gray-300 mb-4" />
				<p class="text-gray-600 text-lg mb-2">プロジェクトがありません</p>
				<p class="text-gray-500 mb-6">新しいプロジェクトを作成して進捗管理を始めましょう</p>
				{#if !showAddProject}
					<button
						onclick={() => (showAddProject = true)}
						class="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
					>
						<Plus size={20} />
						最初のプロジェクトを作成
					</button>
				{/if}
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each data.projects as project}
					{@const progress = getProgressPercent(project.completed_tasks, project.total_tasks)}
					<div class="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden group">
						<!-- カラーバー -->
						<div class="h-2" style="background-color: {project.color}"></div>
						<a
							href="/dashboard/projects/{project.id}"
							class="block p-6"
						>
							<div class="flex items-start justify-between mb-3">
								<h3 class="text-lg font-semibold text-gray-800 truncate flex-1">
									{project.title}
								</h3>
								<span class="ml-2 px-2 py-0.5 text-xs rounded-full {project.status === 'active' ? 'bg-green-100 text-green-700' : project.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}">
									{project.status === 'active' ? '進行中' : project.status === 'completed' ? '完了' : '保留'}
								</span>
							</div>
							{#if project.description}
								<p class="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>
							{/if}

							<!-- 進捗バー -->
							<div class="mb-3">
								<div class="flex justify-between text-sm mb-1">
									<span class="text-gray-600">進捗</span>
									<span class="font-medium" style="color: {project.color}">{progress}%</span>
								</div>
								<div class="w-full bg-gray-200 rounded-full h-2">
									<div
										class="h-2 rounded-full transition-all duration-300"
										style="width: {progress}%; background-color: {project.color}"
									></div>
								</div>
							</div>

							<!-- 統計 -->
							<div class="flex items-center gap-4 text-sm text-gray-500">
								<span class="flex items-center gap-1">
									<Target size={14} />
									{project.milestone_count} マイルストーン
								</span>
								<span class="flex items-center gap-1">
									<CheckCircle2 size={14} />
									{project.completed_tasks}/{project.total_tasks} タスク
								</span>
							</div>
						</a>
						<!-- アクションボタン -->
						<div class="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
							<a
								href="/dashboard/projects/{project.id}"
								class="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
							>
								詳細を見る →
							</a>
							<div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
								<button
									onclick={(e) => {
										e.preventDefault();
										editProjectModal = {
											id: project.id,
											title: project.title,
											description: project.description,
											color: project.color,
											status: project.status
										};
									}}
									class="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
									title="編集"
								>
									<Pencil size={16} />
								</button>
								<form method="POST" action="?/deleteProject" class="inline" use:enhance={handleFormSubmit}>
									<input type="hidden" name="id" value={project.id} />
									<button
										type="submit"
										onclick={(e) => {
											if (!confirm('このプロジェクトを削除しますか？関連するマイルストーン・タスクもすべて削除されます。')) {
												e.preventDefault();
											}
										}}
										class="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
										title="削除"
									>
										<Trash2 size={16} />
									</button>
								</form>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</main>
</div>

<!-- Edit Project Modal -->
{#if editProjectModal}
	<div
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
		role="dialog"
		aria-modal="true"
		onclick={(e) => {
			if (e.target === e.currentTarget) editProjectModal = null;
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') editProjectModal = null;
		}}
	>
		<div class="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
			<h2 class="text-xl font-bold text-gray-800 mb-4">プロジェクトを編集</h2>
			<form method="POST" action="?/updateProject" use:enhance={handleFormSubmit}>
				<input type="hidden" name="id" value={editProjectModal.id} />
				<input
					type="text"
					name="title"
					value={editProjectModal.title}
					placeholder="プロジェクト名"
					required
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
				/>
				<textarea
					name="description"
					value={editProjectModal.description || ''}
					placeholder="説明（任意）"
					rows="3"
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
				></textarea>
				<!-- カラー選択 -->
				<div class="mb-4">
					<p class="text-sm font-medium text-gray-700 mb-2">プロジェクトカラー</p>
					<div class="flex gap-2">
						{#each projectColors as color}
							<button
								type="button"
								onclick={() => {
									if (editProjectModal) editProjectModal.color = color;
								}}
								class="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
								style="background-color: {color}; border-color: {editProjectModal.color === color ? '#1F2937' : 'transparent'}"
							></button>
						{/each}
					</div>
					<input type="hidden" name="color" value={editProjectModal.color} />
				</div>
				<!-- ステータス選択 -->
				<div class="mb-4">
					<p class="text-sm font-medium text-gray-700 mb-2">ステータス</p>
					<select
						name="status"
						value={editProjectModal.status}
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
					>
						<option value="active">進行中</option>
						<option value="completed">完了</option>
						<option value="on_hold">保留</option>
					</select>
				</div>
				<div class="flex gap-3 justify-end">
					<button
						type="button"
						onclick={() => (editProjectModal = null)}
						class="px-5 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
					>
						キャンセル
					</button>
					<button
						type="submit"
						class="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
					>
						更新
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
