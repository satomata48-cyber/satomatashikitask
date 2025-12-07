<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { Target, Plus, Edit2, Trash2, Calendar, TrendingUp, Check, X } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showAddGoal = $state(false);
	let editingGoal = $state<number | null>(null);
	let updatingProgress = $state<number | null>(null);

	function handleFormSubmit() {
		return async ({ result }: { result: { type: string } }) => {
			if (result.type === 'success' || result.type === 'redirect') {
				showAddGoal = false;
				editingGoal = null;
				updatingProgress = null;
				await invalidateAll();
			}
		};
	}

	function getProgressPercentage(current: number, target: number): number {
		if (target === 0) return 0;
		return Math.min(Math.round((current / target) * 100), 100);
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
			case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-300';
			case 'pending': return 'bg-gray-100 text-gray-700 border-gray-300';
			default: return 'bg-gray-100 text-gray-700 border-gray-300';
		}
	}

	function getStatusText(status: string): string {
		switch (status) {
			case 'completed': return '達成';
			case 'in_progress': return '進行中';
			case 'pending': return '未着手';
			default: return status;
		}
	}

	function isOverdue(deadline: string | null): boolean {
		if (!deadline) return false;
		return new Date(deadline) < new Date();
	}
</script>

<svelte:head>
	<title>目標管理 - {data.project.title}</title>
</svelte:head>

<div class="p-6 space-y-6">
	<!-- ヘッダー -->
	<div class="flex items-center justify-between mb-6">
		<div>
			<h2 class="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
				<Target size={28} class="text-indigo-600" />
				目標管理
			</h2>
			<p class="text-gray-600">プロジェクトの目標を設定し、進捗を追跡しましょう</p>
		</div>
		{#if !showAddGoal}
			<button
				onclick={() => showAddGoal = true}
				class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
			>
				<Plus size={20} />
				新しい目標
			</button>
		{/if}
	</div>

	<!-- 新規目標作成フォーム -->
	{#if showAddGoal}
		<div class="bg-white rounded-xl shadow-md p-6 border border-indigo-200">
			<h3 class="text-lg font-semibold text-gray-800 mb-4">新しい目標を作成</h3>
			<form method="POST" action="?/createGoal" use:enhance={handleFormSubmit}>
				<div class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">目標名 *</label>
						<input
							type="text"
							name="title"
							placeholder="例: 登録者数1000人達成"
							required
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">説明</label>
						<textarea
							name="description"
							placeholder="目標の詳細や達成方法..."
							rows="3"
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
						></textarea>
					</div>
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">目標値 *</label>
							<input
								type="number"
								name="target_value"
								placeholder="1000"
								required
								step="0.01"
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
							/>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">単位</label>
							<input
								type="text"
								name="unit"
								placeholder="人, 円, %など"
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
							/>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">期限</label>
							<input
								type="date"
								name="deadline"
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
							/>
						</div>
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
							onclick={() => showAddGoal = false}
							class="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
						>
							キャンセル
						</button>
					</div>
				</div>
			</form>
		</div>
	{/if}

	<!-- 目標一覧 -->
	{#if data.goals.length === 0}
		<div class="text-center py-16">
			<Target size={64} class="mx-auto text-gray-300 mb-4" />
			<p class="text-gray-600 text-lg mb-2">目標がありません</p>
			<p class="text-gray-500 mb-6">新しい目標を作成して進捗を追跡しましょう</p>
			{#if !showAddGoal}
				<button
					onclick={() => showAddGoal = true}
					class="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
				>
					<Plus size={20} />
					最初の目標を作成
				</button>
			{/if}
		</div>
	{:else}
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			{#each data.goals as goal}
				<div class="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
					<!-- ヘッダー -->
					<div class="p-5 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-gray-200">
						<div class="flex items-start justify-between mb-3">
							<div class="flex-1">
								{#if editingGoal === goal.id}
									<form method="POST" action="?/updateGoal" use:enhance={handleFormSubmit} class="space-y-2">
										<input type="hidden" name="id" value={goal.id} />
										<input
											type="text"
											name="title"
											value={goal.title}
											class="w-full px-3 py-1.5 text-lg font-semibold border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
										/>
										<textarea
											name="description"
											value={goal.description || ''}
											rows="2"
											class="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
											placeholder="説明..."
										></textarea>
										<div class="grid grid-cols-3 gap-2">
											<input
												type="number"
												name="target_value"
												value={goal.target_value}
												step="0.01"
												class="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
											/>
											<input
												type="text"
												name="unit"
												value={goal.unit}
												placeholder="単位"
												class="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
											/>
											<input
												type="date"
												name="deadline"
												value={goal.deadline || ''}
												class="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
											/>
										</div>
										<div class="flex gap-2">
											<button type="submit" class="px-3 py-1 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
												<Check size={16} />
											</button>
											<button type="button" onclick={() => editingGoal = null} class="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
												<X size={16} />
											</button>
										</div>
									</form>
								{:else}
									<h3 class="text-lg font-semibold text-gray-800 mb-1">{goal.title}</h3>
									{#if goal.description}
										<p class="text-sm text-gray-600">{goal.description}</p>
									{/if}
								{/if}
							</div>
							{#if editingGoal !== goal.id}
								<div class="flex items-center gap-2 ml-3">
									<span class="px-2.5 py-1 text-xs font-medium rounded-full border {getStatusColor(goal.status)}">
										{getStatusText(goal.status)}
									</span>
								</div>
							{/if}
						</div>

						{#if editingGoal !== goal.id}
							<!-- 期限表示 -->
							{#if goal.deadline}
								<div class="flex items-center gap-2 text-sm {isOverdue(goal.deadline) && goal.status !== 'completed' ? 'text-red-600' : 'text-gray-600'}">
									<Calendar size={14} />
									<span>期限: {new Date(goal.deadline).toLocaleDateString('ja-JP')}</span>
									{#if isOverdue(goal.deadline) && goal.status !== 'completed'}
										<span class="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">期限切れ</span>
									{/if}
								</div>
							{/if}
						{/if}
					</div>

					<!-- 進捗バー -->
					<div class="p-5">
						{#if updatingProgress === goal.id}
							<form method="POST" action="?/updateProgress" use:enhance={handleFormSubmit} class="space-y-3">
								<input type="hidden" name="goal_id" value={goal.id} />
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">現在の進捗値</label>
									<input
										type="number"
										name="current_value"
										value={goal.current_value}
										step="0.01"
										class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
								<div class="flex gap-2">
									<button type="submit" class="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
										更新
									</button>
									<button type="button" onclick={() => updatingProgress = null} class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
										キャンセル
									</button>
								</div>
							</form>
						{:else}
							<div class="space-y-2">
								<div class="flex items-center justify-between text-sm">
									<span class="text-gray-600">進捗</span>
									<span class="font-semibold text-gray-800">
										{goal.current_value.toLocaleString()} / {goal.target_value.toLocaleString()} {goal.unit}
									</span>
								</div>
								<div class="relative h-3 bg-gray-200 rounded-full overflow-hidden">
									<div
										class="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-500"
										style="width: {getProgressPercentage(goal.current_value, goal.target_value)}%"
									></div>
								</div>
								<div class="flex items-center justify-between">
									<span class="text-xs text-gray-500">{getProgressPercentage(goal.current_value, goal.target_value)}% 達成</span>
									<button
										onclick={() => updatingProgress = goal.id}
										class="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
									>
										<TrendingUp size={12} />
										進捗を更新
									</button>
								</div>
							</div>
						{/if}
					</div>

					<!-- アクションボタン -->
					{#if updatingProgress !== goal.id}
						<div class="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
							<button
								onclick={() => editingGoal = goal.id}
								class="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
								title="編集"
							>
								<Edit2 size={16} />
							</button>
							<form method="POST" action="?/deleteGoal" use:enhance={handleFormSubmit} class="inline">
								<input type="hidden" name="id" value={goal.id} />
								<button
									type="submit"
									onclick={(e) => {
										if (!confirm('この目標を削除しますか？')) {
											e.preventDefault();
										}
									}}
									class="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
									title="削除"
								>
									<Trash2 size={16} />
								</button>
							</form>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
