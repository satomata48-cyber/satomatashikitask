<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { Twitter, Send, Clock, Trash2, Check, X, Calendar, AlertCircle } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let content = $state('');
	let scheduledDate = $state('');
	let scheduledTime = $state('');
	let showScheduleForm = $state(false);

	const maxLength = 280;
	const remainingChars = $derived(maxLength - content.length);
	const isOverLimit = $derived(content.length > maxLength);

	// 今月の投稿数の進捗率
	const usagePercent = $derived((data.monthlyPostCount / data.monthlyLimit) * 100);
	const usageColor = $derived(
		usagePercent >= 90 ? 'text-red-600' : usagePercent >= 70 ? 'text-amber-600' : 'text-emerald-600'
	);

	function handleFormSubmit() {
		return async ({ result }: { result: { type: string } }) => {
			if (result.type === 'success' || result.type === 'redirect') {
				content = '';
				scheduledDate = '';
				scheduledTime = '';
				showScheduleForm = false;
				await invalidateAll();
			}
		};
	}

	function formatDateTime(dateStr: string) {
		const date = new Date(dateStr);
		return date.toLocaleString('ja-JP', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getMinDateTime() {
		const now = new Date();
		now.setMinutes(now.getMinutes() + 5);
		return now.toISOString().slice(0, 16);
	}
</script>

<svelte:head>
	<title>Twitter投稿 - {data.project.title}</title>
</svelte:head>

<div class="p-6 max-w-6xl mx-auto space-y-6">
	<!-- ヘッダー -->
	<div class="mb-6">
		<div class="flex items-center justify-between">
			<div>
				<h2 class="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
					<Twitter size={28} class="text-sky-600" />
					Twitter 投稿
				</h2>
				<p class="text-gray-600">@{data.account.username}</p>
			</div>

			<!-- 今月の投稿数 -->
			<div class="text-right">
				<p class="text-sm text-gray-600 mb-1">今月の投稿数</p>
				<p class="{usageColor} text-2xl font-bold">
					{data.monthlyPostCount} / {data.monthlyLimit}
				</p>
				<div class="w-48 h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
					<div
						class="h-full {usagePercent >= 90
							? 'bg-red-500'
							: usagePercent >= 70
								? 'bg-amber-500'
								: 'bg-emerald-500'} transition-all"
						style="width: {Math.min(usagePercent, 100)}%"
					></div>
				</div>
			</div>
		</div>
	</div>

	{#if usagePercent >= 90}
		<div class="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
			<AlertCircle size={20} class="text-red-600 mt-0.5" />
			<div>
				<p class="text-red-800 font-semibold">投稿数の制限に近づいています</p>
				<p class="text-red-700 text-sm">
					Twitter API無料プランの月500ツイート制限まで残り{data.monthlyLimit - data.monthlyPostCount}件です。
				</p>
			</div>
		</div>
	{/if}

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- 左カラム：投稿フォーム -->
		<div class="lg:col-span-2 space-y-6">
			<!-- リアルタイム投稿 -->
			<div class="bg-white rounded-xl shadow-md p-6">
				<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
					<Send size={20} class="text-sky-600" />
					{showScheduleForm ? '予約投稿' : '今すぐ投稿'}
				</h3>

				<form
					method="POST"
					action="?/{showScheduleForm ? 'schedulePost' : 'postNow'}"
					use:enhance={handleFormSubmit}
					class="space-y-4"
				>
					<div>
						<textarea
							name="content"
							bind:value={content}
							placeholder="いまどうしてる？"
							rows="6"
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
						></textarea>
						<div class="flex items-center justify-between mt-2">
							<span
								class="text-sm {isOverLimit ? 'text-red-600 font-semibold' : 'text-gray-600'}"
							>
								{remainingChars} 文字
							</span>
							<span class="text-xs text-gray-500">{content.length} / {maxLength}</span>
						</div>
					</div>

					{#if showScheduleForm}
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">日付</label>
								<input
									type="date"
									name="scheduled_date"
									bind:value={scheduledDate}
									required
									min={new Date().toISOString().split('T')[0]}
									class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									時刻 <span class="text-amber-600">(5時間間隔のみ)</span>
								</label>
								<select
									name="scheduled_time"
									bind:value={scheduledTime}
									required
									class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
								>
									<option value="">時刻を選択</option>
									<option value="00:00">00:00 (深夜0時)</option>
									<option value="05:00">05:00 (早朝5時)</option>
									<option value="10:00">10:00 (午前10時)</option>
									<option value="15:00">15:00 (午後3時)</option>
									<option value="20:00">20:00 (午後8時)</option>
								</select>
								<p class="text-xs text-amber-600 mt-1">投稿は5時間間隔でのみ実行されます</p>
							</div>
						</div>
					{/if}

					<div class="flex gap-2">
						<button
							type="submit"
							disabled={!content.trim() || isOverLimit}
							class="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
						>
							{#if showScheduleForm}
								<Clock size={18} />
								予約する
							{:else}
								<Send size={18} />
								ツイート
							{/if}
						</button>
						<button
							type="button"
							onclick={() => (showScheduleForm = !showScheduleForm)}
							class="px-4 py-3 border-2 border-sky-600 text-sky-600 rounded-lg hover:bg-sky-50 transition-colors font-semibold"
						>
							{showScheduleForm ? 'すぐ投稿' : '予約投稿'}
						</button>
					</div>
				</form>

				{#if form?.error}
					<div class="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
						<p class="text-red-700">{form.error}</p>
					</div>
				{/if}

				{#if form?.success}
					<div class="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-2">
						<Check size={18} class="text-emerald-700" />
						<p class="text-emerald-700">{form.message}</p>
					</div>
				{/if}
			</div>

			<!-- 投稿履歴 -->
			<div class="bg-white rounded-xl shadow-md p-6">
				<h3 class="text-lg font-semibold text-gray-800 mb-4">最近の投稿</h3>
				<div class="space-y-3">
					{#if data.recentPosts.length === 0}
						<p class="text-gray-500 text-center py-8">まだ投稿がありません</p>
					{:else}
						{#each data.recentPosts as post}
							<div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
								<p class="text-gray-800 mb-2">{post.content}</p>
								<div class="flex items-center justify-between text-xs text-gray-500">
									<span>{formatDateTime(post.posted_at)}</span>
									{#if post.tweet_id && !post.tweet_id.startsWith('temp_')}
										<a
											href="https://twitter.com/{data.account.username}/status/{post.tweet_id}"
											target="_blank"
											rel="noopener noreferrer"
											class="text-sky-600 hover:underline"
										>
											Twitterで見る
										</a>
									{/if}
								</div>
							</div>
						{/each}
					{/if}
				</div>
			</div>
		</div>

		<!-- 右カラム：予約投稿一覧 -->
		<div class="space-y-6">
			<div class="bg-white rounded-xl shadow-md p-6">
				<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
					<Calendar size={20} class="text-sky-600" />
					予約投稿 ({data.scheduledPosts.length})
				</h3>

				<div class="space-y-3">
					{#if data.scheduledPosts.length === 0}
						<p class="text-gray-500 text-center py-8">予約投稿はありません</p>
					{:else}
						{#each data.scheduledPosts as post}
							<div class="p-4 bg-sky-50 rounded-lg border border-sky-200 relative">
								<div class="pr-8">
									<p class="text-sm text-gray-800 mb-2 line-clamp-3">{post.content}</p>
									<div class="flex items-center gap-1 text-xs text-sky-700">
										<Clock size={14} />
										<span>{formatDateTime(post.scheduled_at)}</span>
									</div>
								</div>
								<form
									method="POST"
									action="?/deleteScheduled"
									use:enhance={handleFormSubmit}
									class="absolute top-3 right-3"
								>
									<input type="hidden" name="post_id" value={post.id} />
									<button
										type="submit"
										class="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
										title="削除"
									>
										<Trash2 size={16} />
									</button>
								</form>
							</div>
						{/each}
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
