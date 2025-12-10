<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { Music, Save, X, Check, Users, Heart, Video } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showAddAccount = $state(!data.account);
	let showAddStats = $state(false);

	function handleFormSubmit() {
		return async ({ result }: { result: { type: string } }) => {
			if (result.type === 'success' || result.type === 'redirect') {
				showAddAccount = false;
				showAddStats = false;
				await invalidateAll();
			}
		};
	}
</script>

<svelte:head>
	<title>TikTok設定 - {data.project.title}</title>
</svelte:head>

<div class="p-6 max-w-4xl mx-auto space-y-6">
	<!-- ヘッダー -->
	<div class="mb-6">
		<h2 class="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
			<Music size={28} class="text-violet-600" />
			TikTok 設定
		</h2>
		<p class="text-gray-600">アカウント情報と統計を管理</p>
	</div>

	<!-- アカウント情報 -->
	<div class="bg-white rounded-xl shadow-md p-6">
		<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
			<Users size={20} class="text-violet-600" />
			アカウント情報
		</h3>

		{#if data.account && !showAddAccount}
			<div class="space-y-4">
				<div class="flex items-start justify-between p-4 bg-violet-50 rounded-lg border border-violet-200">
					<div class="flex-1">
						<p class="text-sm text-gray-600 mb-1">ユーザー名</p>
						<p class="font-semibold text-gray-800">@{data.account.username}</p>
						{#if data.account.display_name}
							<p class="text-sm text-gray-600 mt-2">表示名: {data.account.display_name}</p>
						{/if}
					</div>
					<button
						onclick={() => showAddAccount = true}
						class="px-3 py-1.5 text-sm text-violet-600 hover:bg-violet-100 rounded-lg transition-colors"
					>
						編集
					</button>
				</div>

				{#if data.latestStats}
					<div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
						<div>
							<p class="text-xs text-gray-600 mb-1">フォロワー</p>
							<p class="text-xl font-bold text-gray-800">{data.latestStats.followers_count?.toLocaleString() || 0}</p>
						</div>
						<div>
							<p class="text-xs text-gray-600 mb-1">フォロー中</p>
							<p class="text-xl font-bold text-gray-800">{data.latestStats.following_count?.toLocaleString() || 0}</p>
						</div>
						<div>
							<p class="text-xs text-gray-600 mb-1">いいね</p>
							<p class="text-xl font-bold text-gray-800">{data.latestStats.likes_count?.toLocaleString() || 0}</p>
						</div>
						<div>
							<p class="text-xs text-gray-600 mb-1">動画数</p>
							<p class="text-xl font-bold text-gray-800">{data.latestStats.video_count?.toLocaleString() || 0}</p>
						</div>
					</div>
					<button
						onclick={() => showAddStats = true}
						class="w-full px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
					>
						統計を更新
					</button>
				{:else}
					<button
						onclick={() => showAddStats = true}
						class="w-full px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
					>
						統計を追加
					</button>
				{/if}
			</div>
		{:else}
			<form method="POST" action="?/saveAccount" use:enhance={handleFormSubmit} class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						ユーザー名 <span class="text-red-500">*</span>
					</label>
					<div class="flex items-center gap-2">
						<span class="text-gray-600">@</span>
						<input
							type="text"
							name="username"
							value={data.account?.username || ''}
							required
							placeholder="username"
							class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
						/>
					</div>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						表示名
					</label>
					<input
						type="text"
						name="display_name"
						value={data.account?.display_name || ''}
						placeholder="表示名（任意）"
						class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
					/>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						アカウントID
					</label>
					<input
						type="text"
						name="account_id"
						value={data.account?.account_id || ''}
						placeholder="TikTokアカウントID（任意）"
						class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
					/>
				</div>

				<div class="flex gap-2">
					<button
						type="submit"
						class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
					>
						<Save size={18} />
						保存
					</button>
					{#if data.account}
						<button
							type="button"
							onclick={() => showAddAccount = false}
							class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
						>
							キャンセル
						</button>
					{/if}
				</div>
			</form>
		{/if}
	</div>

	<!-- 統計更新フォーム -->
	{#if showAddStats && data.account}
		<div class="bg-white rounded-xl shadow-md p-6 border border-violet-200">
			<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
				<Video size={20} class="text-violet-600" />
				統計を更新
			</h3>

			<form method="POST" action="?/updateStats" use:enhance={handleFormSubmit} class="space-y-4">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							フォロワー数 <span class="text-red-500">*</span>
						</label>
						<input
							type="number"
							name="followers_count"
							value={data.latestStats?.followers_count || 0}
							required
							min="0"
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							フォロー中
						</label>
						<input
							type="number"
							name="following_count"
							value={data.latestStats?.following_count || 0}
							min="0"
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							いいね数
						</label>
						<input
							type="number"
							name="likes_count"
							value={data.latestStats?.likes_count || 0}
							min="0"
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							動画数
						</label>
						<input
							type="number"
							name="video_count"
							value={data.latestStats?.video_count || 0}
							min="0"
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
						/>
					</div>
				</div>

				<div class="flex gap-2">
					<button
						type="submit"
						class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
					>
						<Check size={18} />
						統計を保存
					</button>
					<button
						type="button"
						onclick={() => showAddStats = false}
						class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
					>
						<X size={18} />
						キャンセル
					</button>
				</div>
			</form>
		</div>
	{/if}

	{#if form?.error}
		<div class="bg-red-50 border border-red-200 rounded-lg p-4">
			<p class="text-red-700">{form.error}</p>
		</div>
	{/if}

	{#if form?.success}
		<div class="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
			<p class="text-emerald-700">保存しました</p>
		</div>
	{/if}
</div>
