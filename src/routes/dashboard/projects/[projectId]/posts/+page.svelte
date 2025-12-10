<script lang="ts">
	import { Send, Calendar, Trash2, Clock, CheckCircle, XCircle } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Tab = 'twitter' | 'instagram' | 'tiktok' | 'youtube';
	let activeTab = $state<Tab>('twitter');

	// Twitter投稿フォーム
	let twitterContent = $state('');
	let twitterScheduledDate = $state('');
	let twitterScheduledTime = $state('');
	let isScheduling = $state(false);

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return new Intl.DateTimeFormat('ja-JP', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'pending':
				return 'bg-amber-100 text-amber-800';
			case 'posted':
				return 'bg-emerald-100 text-emerald-800';
			case 'failed':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}

	function getStatusText(status: string): string {
		switch (status) {
			case 'pending':
				return '予約中';
			case 'posted':
				return '投稿済み';
			case 'failed':
				return '失敗';
			default:
				return status;
		}
	}

	const handleTwitterSubmit = () => {
		return async ({ result, update }: any) => {
			await update();
			if (result.type === 'success') {
				twitterContent = '';
				twitterScheduledDate = '';
				twitterScheduledTime = '';
				isScheduling = false;
			}
		};
	};
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-100 p-6">
	<div class="max-w-7xl mx-auto">
		<!-- ヘッダー -->
		<div class="mb-6">
			<div class="flex items-center gap-2 text-sm text-gray-600 mb-2">
				<a href="/dashboard/projects" class="hover:text-indigo-600">プロジェクト</a>
				<span>/</span>
				<a href="/dashboard/projects/{data.project.id}" class="hover:text-indigo-600">
					{data.project.title}
				</a>
				<span>/</span>
				<span class="text-gray-900">SNS投稿</span>
			</div>
			<div class="flex items-center gap-3">
				<Send size={32} class="text-indigo-600" />
				<h1 class="text-3xl font-bold text-gray-900">SNS投稿</h1>
			</div>
			<p class="text-gray-600 mt-2">各SNSプラットフォームへの投稿を管理できます</p>
		</div>

		<!-- タブ -->
		<div class="bg-white rounded-xl shadow-md mb-6">
			<div class="flex border-b border-gray-200">
				<button
					onclick={() => activeTab = 'twitter'}
					class="flex-1 px-6 py-4 text-center font-medium transition-colors relative
						{activeTab === 'twitter' ? 'text-sky-600' : 'text-gray-600 hover:text-gray-900'}"
				>
					Twitter / X
					{#if activeTab === 'twitter'}
						<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600"></div>
					{/if}
				</button>
				<button
					onclick={() => activeTab = 'instagram'}
					class="flex-1 px-6 py-4 text-center font-medium transition-colors relative
						{activeTab === 'instagram' ? 'text-pink-600' : 'text-gray-600 hover:text-gray-900'}"
				>
					Instagram
					{#if activeTab === 'instagram'}
						<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-600"></div>
					{/if}
				</button>
				<button
					onclick={() => activeTab = 'tiktok'}
					class="flex-1 px-6 py-4 text-center font-medium transition-colors relative
						{activeTab === 'tiktok' ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'}"
				>
					TikTok
					{#if activeTab === 'tiktok'}
						<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"></div>
					{/if}
				</button>
				<button
					onclick={() => activeTab = 'youtube'}
					class="flex-1 px-6 py-4 text-center font-medium transition-colors relative
						{activeTab === 'youtube' ? 'text-red-600' : 'text-gray-600 hover:text-gray-900'}"
				>
					YouTube
					{#if activeTab === 'youtube'}
						<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600"></div>
					{/if}
				</button>
			</div>
		</div>

		<!-- Twitter投稿 -->
		{#if activeTab === 'twitter'}
			<div class="space-y-6">
				{#if data.twitter.account && data.twitter.hasSettings}
					<!-- 投稿フォーム -->
					<div class="bg-white rounded-xl shadow-md p-6">
						<h3 class="text-lg font-semibold text-gray-800 mb-4">新規投稿</h3>
						<form method="POST" action="?/{isScheduling ? 'scheduleTwitter' : 'postTwitter'}" use:enhance={handleTwitterSubmit}>
							<textarea
								name="content"
								bind:value={twitterContent}
								placeholder="いまどうしてる？"
								rows="4"
								maxlength="280"
								class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none"
							></textarea>
							<div class="flex items-center justify-between mt-4">
								<div class="text-sm text-gray-600">
									{twitterContent.length} / 280
								</div>
								<div class="flex items-center gap-3">
									<label class="flex items-center gap-2 cursor-pointer">
										<input
											type="checkbox"
											bind:checked={isScheduling}
											class="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
										/>
										<span class="text-sm text-gray-700">予約投稿</span>
									</label>
								</div>
							</div>

							{#if isScheduling}
								<div class="grid grid-cols-2 gap-4 mt-4">
									<div>
										<label class="block text-sm font-medium text-gray-700 mb-2">日付</label>
										<input
											type="date"
											name="scheduled_date"
											bind:value={twitterScheduledDate}
											required={isScheduling}
											class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
										/>
									</div>
									<div>
										<label class="block text-sm font-medium text-gray-700 mb-2">時刻</label>
										<select
											name="scheduled_time"
											bind:value={twitterScheduledTime}
											required={isScheduling}
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

							<div class="flex justify-end mt-4">
								<button
									type="submit"
									disabled={!twitterContent.trim()}
									class="flex items-center gap-2 px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{#if isScheduling}
										<Calendar size={18} />
										予約する
									{:else}
										<Send size={18} />
										ツイート
									{/if}
								</button>
							</div>
						</form>
					</div>

					<!-- 予約投稿一覧 -->
					{#if data.twitter.scheduled.length > 0}
						<div class="bg-white rounded-xl shadow-md p-6">
							<h3 class="text-lg font-semibold text-gray-800 mb-4">予約投稿</h3>
							<div class="space-y-3">
								{#each data.twitter.scheduled as post}
									<div class="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:border-sky-300 transition-colors">
										<div class="flex-1">
											<div class="flex items-center gap-2 mb-2">
												<span class="px-2 py-1 text-xs rounded-full {getStatusColor(post.status)}">
													{getStatusText(post.status)}
												</span>
												<span class="text-sm text-gray-600">
													<Clock size={14} class="inline" />
													{formatDate(post.scheduled_at)}
												</span>
											</div>
											<p class="text-gray-800">{post.content}</p>
										</div>
										{#if post.status === 'pending'}
											<form method="POST" action="?/deleteScheduledTwitter" use:enhance>
												<input type="hidden" name="post_id" value={post.id} />
												<button
													type="submit"
													class="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
													title="削除"
												>
													<Trash2 size={18} />
												</button>
											</form>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- 投稿履歴 -->
					{#if data.twitter.posts.length > 0}
						<div class="bg-white rounded-xl shadow-md p-6">
							<h3 class="text-lg font-semibold text-gray-800 mb-4">投稿履歴</h3>
							<div class="space-y-3">
								{#each data.twitter.posts as post}
									<div class="p-4 border border-gray-200 rounded-lg">
										<div class="flex items-center gap-2 mb-2">
											<span class="text-sm text-gray-600">{formatDate(post.posted_at)}</span>
											{#if post.tweet_id}
												<a
													href="https://twitter.com/{post.username}/status/{post.tweet_id}"
													target="_blank"
													rel="noopener noreferrer"
													class="text-xs text-sky-600 hover:underline"
												>
													Twitterで表示
												</a>
											{/if}
										</div>
										<p class="text-gray-800">{post.content}</p>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				{:else}
					<div class="bg-white rounded-xl shadow-md p-12 text-center">
						<Send size={48} class="text-gray-400 mx-auto mb-4" />
						<p class="text-gray-600 mb-2">Twitter投稿機能を利用するには設定が必要です</p>
						<div class="space-y-2 text-sm text-gray-500">
							{#if !data.twitter.account}
								<p>• Twitterアカウントを連携してください</p>
							{/if}
							{#if !data.twitter.hasSettings}
								<p>• Twitter API設定を登録してください</p>
							{/if}
						</div>
						<a
							href="/dashboard/projects/{data.project.id}/twitter"
							class="inline-block mt-4 px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
						>
							設定する
						</a>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Instagram投稿 -->
		{#if activeTab === 'instagram'}
			<div class="space-y-6">
				{#if data.instagram.account}
					<!-- 投稿履歴 -->
					{#if data.instagram.posts.length > 0}
						<div class="bg-white rounded-xl shadow-md p-6">
							<h3 class="text-lg font-semibold text-gray-800 mb-4">投稿履歴</h3>
							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								{#each data.instagram.posts as post}
									<div class="border border-gray-200 rounded-lg overflow-hidden">
										{#if post.media_url}
											<img src={post.media_url} alt={post.caption || ''} class="w-full h-48 object-cover" />
										{/if}
										<div class="p-4">
											<p class="text-sm text-gray-800 line-clamp-3">{post.caption || ''}</p>
											<div class="flex items-center gap-4 mt-3 text-xs text-gray-600">
												<span>❤️ {post.like_count}</span>
												<span>💬 {post.comment_count}</span>
											</div>
											{#if post.permalink}
												<a
													href={post.permalink}
													target="_blank"
													rel="noopener noreferrer"
													class="text-xs text-pink-600 hover:underline mt-2 inline-block"
												>
													Instagramで表示
												</a>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</div>
					{:else}
						<div class="bg-white rounded-xl shadow-md p-12 text-center">
							<Send size={48} class="text-gray-400 mx-auto mb-4" />
							<p class="text-gray-600">まだ投稿がありません</p>
						</div>
					{/if}
				{:else}
					<div class="bg-white rounded-xl shadow-md p-12 text-center">
						<Send size={48} class="text-gray-400 mx-auto mb-4" />
						<p class="text-gray-600">Instagramアカウントが連携されていません</p>
						<a
							href="/dashboard/projects/{data.project.id}/instagram"
							class="inline-block mt-4 px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
						>
							連携する
						</a>
					</div>
				{/if}
			</div>
		{/if}

		<!-- TikTok投稿 -->
		{#if activeTab === 'tiktok'}
			<div class="space-y-6">
				{#if data.tiktok.account}
					<!-- 動画履歴 -->
					{#if data.tiktok.videos.length > 0}
						<div class="bg-white rounded-xl shadow-md p-6">
							<h3 class="text-lg font-semibold text-gray-800 mb-4">動画履歴</h3>
							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								{#each data.tiktok.videos as video}
									<div class="border border-gray-200 rounded-lg overflow-hidden">
										{#if video.cover_image_url}
											<img src={video.cover_image_url} alt={video.title || ''} class="w-full h-48 object-cover" />
										{/if}
										<div class="p-4">
											<h4 class="font-medium text-gray-900 line-clamp-2">{video.title || ''}</h4>
											<div class="flex items-center gap-4 mt-3 text-xs text-gray-600">
												<span>👁️ {video.view_count}</span>
												<span>❤️ {video.like_count}</span>
												<span>💬 {video.comment_count}</span>
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{:else}
						<div class="bg-white rounded-xl shadow-md p-12 text-center">
							<Send size={48} class="text-gray-400 mx-auto mb-4" />
							<p class="text-gray-600">まだ動画がありません</p>
						</div>
					{/if}
				{:else}
					<div class="bg-white rounded-xl shadow-md p-12 text-center">
						<Send size={48} class="text-gray-400 mx-auto mb-4" />
						<p class="text-gray-600">TikTokアカウントが連携されていません</p>
						<a
							href="/dashboard/projects/{data.project.id}/tiktok"
							class="inline-block mt-4 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
						>
							連携する
						</a>
					</div>
				{/if}
			</div>
		{/if}

		<!-- YouTube投稿 -->
		{#if activeTab === 'youtube'}
			<div class="space-y-6">
				{#if data.youtube.channel}
					<!-- 動画履歴 -->
					{#if data.youtube.videos.length > 0}
						<div class="bg-white rounded-xl shadow-md p-6">
							<h3 class="text-lg font-semibold text-gray-800 mb-4">動画履歴</h3>
							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								{#each data.youtube.videos as video}
									<div class="border border-gray-200 rounded-lg overflow-hidden">
										{#if video.thumbnail_url}
											<img src={video.thumbnail_url} alt={video.title || ''} class="w-full h-48 object-cover" />
										{/if}
										<div class="p-4">
											<h4 class="font-medium text-gray-900 line-clamp-2">{video.title || ''}</h4>
											<p class="text-xs text-gray-600 mt-2">
												{formatDate(video.published_at)}
											</p>
											{#if video.video_id}
												<a
													href="https://youtube.com/watch?v={video.video_id}"
													target="_blank"
													rel="noopener noreferrer"
													class="text-xs text-red-600 hover:underline mt-2 inline-block"
												>
													YouTubeで表示
												</a>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</div>
					{:else}
						<div class="bg-white rounded-xl shadow-md p-12 text-center">
							<Send size={48} class="text-gray-400 mx-auto mb-4" />
							<p class="text-gray-600">まだ動画がありません</p>
						</div>
					{/if}
				{:else}
					<div class="bg-white rounded-xl shadow-md p-12 text-center">
						<Send size={48} class="text-gray-400 mx-auto mb-4" />
						<p class="text-gray-600">YouTubeチャンネルが連携されていません</p>
						<a
							href="/dashboard/projects/{data.project.id}/analytics"
							class="inline-block mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
						>
							連携する
						</a>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
