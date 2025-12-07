<script lang="ts">
	import type { PageData } from './$types';
	import {
		ArrowLeft,
		Instagram,
		Facebook,
		Users,
		Eye,
		Heart,
		MessageSquare,
		Share2,
		TrendingUp,
		Image,
		Settings,
		ExternalLink,
		BarChart3
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	function handleFormSubmit() {
		return async ({ result }: { result: { type: string } }) => {
			if (result.type === 'success') {
				await invalidateAll();
			}
		};
	}

	let showAccessTokenForm = $state(false);
	let showInstagramForm = $state(false);
	let showFacebookForm = $state(false);
</script>

<svelte:head>
	<title>Instagram / Facebook連携 - {data.project.title}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-red-50">
	<!-- Header -->
	<header class="bg-white shadow-sm">
		<div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<a href="/dashboard/projects/{data.project.id}" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
					<ArrowLeft size={20} class="text-gray-600" />
				</a>
				<Instagram size={24} class="text-pink-600" />
				<h1 class="text-xl md:text-2xl font-bold text-gray-800">Instagram / Facebook 連携</h1>
			</div>
			<a href="/dashboard/projects/{data.project.id}" class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
				プロジェクトに戻る
			</a>
		</div>
	</header>

	<!-- Main Content -->
	<main class="max-w-7xl mx-auto px-4 py-8 space-y-6">
		<!-- アクセストークン設定 -->
		<div class="bg-white rounded-xl shadow-md p-6">
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center gap-2">
					<Settings size={20} class="text-purple-600" />
					<h2 class="text-lg font-semibold text-gray-800">アクセストークン設定</h2>
				</div>
				<button onclick={() => showAccessTokenForm = !showAccessTokenForm} class="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">
					{showAccessTokenForm ? 'キャンセル' : '設定する'}
				</button>
			</div>

			{#if showAccessTokenForm}
				<form method="POST" action="?/saveAccessToken" use:enhance={handleFormSubmit} class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Meta Graph APIアクセストークン</label>
						<input
							type="text"
							name="access_token"
							placeholder="EAAxxxxxxxxxxxxxxxx"
							required
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
						/>
						<p class="mt-2 text-sm text-gray-500">
							<a href="https://developers.facebook.com/tools/explorer/" target="_blank" class="text-purple-600 hover:underline flex items-center gap-1 inline-flex">
								Facebook Graph API Explorer <ExternalLink size={14} />
							</a>
							でトークンを取得できます
						</p>
					</div>
					<button type="submit" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
						保存
					</button>
				</form>
			{:else if data.settings?.access_token}
				<div class="flex items-center gap-2 text-sm text-green-600">
					<BarChart3 size={16} />
					<span>アクセストークンが設定されています</span>
				</div>
			{:else}
				<p class="text-sm text-gray-500">アクセストークンが未設定です。設定してください。</p>
			{/if}
		</div>

		<!-- Instagram連携 -->
		<div class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-md overflow-hidden">
			<div class="p-6 border-b border-purple-100">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<Instagram size={24} class="text-pink-600" />
						<h2 class="text-xl font-semibold text-gray-800">Instagram Business Account</h2>
					</div>
					{#if !data.instagramAccount}
						<button onclick={() => showInstagramForm = !showInstagramForm} class="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 text-sm">
							{showInstagramForm ? 'キャンセル' : '接続する'}
						</button>
					{/if}
				</div>

				{#if showInstagramForm}
					<form method="POST" action="?/connectInstagram" use:enhance={handleFormSubmit} class="mt-4 space-y-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">InstagramビジネスアカウントID</label>
							<input
								type="text"
								name="instagram_business_account_id"
								placeholder="17841xxxxxxxxxx"
								required
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
							/>
							<p class="mt-2 text-sm text-gray-500">
								Instagramビジネスアカウントに紐づくIDを入力してください
							</p>
						</div>
						<button type="submit" class="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">
							接続
						</button>
					</form>
				{/if}
			</div>

			{#if data.instagramAccount}
				<div class="p-6">
					<!-- アカウント情報 -->
					<div class="flex items-center gap-4 mb-6">
						{#if data.instagramAccount.profile_picture_url}
							<img src={data.instagramAccount.profile_picture_url} alt={data.instagramAccount.username} class="w-20 h-20 rounded-full border-4 border-pink-200" />
						{:else}
							<div class="w-20 h-20 rounded-full bg-pink-100 flex items-center justify-center border-4 border-pink-200">
								<Instagram size={32} class="text-pink-600" />
							</div>
						{/if}
						<div class="flex-1">
							<h3 class="text-xl font-bold text-gray-800">{data.instagramAccount.name || data.instagramAccount.username}</h3>
							<p class="text-gray-600">@{data.instagramAccount.username}</p>
							{#if data.instagramAccount.bio}
								<p class="text-sm text-gray-500 mt-1">{data.instagramAccount.bio}</p>
							{/if}
						</div>
					</div>

					<!-- 統計情報 -->
					{#if data.instagramStats}
						<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
							<div class="bg-white rounded-xl p-4 text-center shadow-sm">
								<div class="flex items-center justify-center gap-2 mb-2">
									<Users size={18} class="text-pink-600" />
									<span class="text-xs text-pink-700 font-medium">フォロワー</span>
								</div>
								<p class="text-2xl font-bold text-pink-700">{data.instagramStats.followers_count.toLocaleString()}</p>
							</div>
							<div class="bg-white rounded-xl p-4 text-center shadow-sm">
								<div class="flex items-center justify-center gap-2 mb-2">
									<Eye size={18} class="text-purple-600" />
									<span class="text-xs text-purple-700 font-medium">リーチ</span>
								</div>
								<p class="text-2xl font-bold text-purple-700">{data.instagramStats.reach.toLocaleString()}</p>
							</div>
							<div class="bg-white rounded-xl p-4 text-center shadow-sm">
								<div class="flex items-center justify-center gap-2 mb-2">
									<Image size={18} class="text-indigo-600" />
									<span class="text-xs text-indigo-700 font-medium">投稿数</span>
								</div>
								<p class="text-2xl font-bold text-indigo-700">{data.instagramStats.media_count.toLocaleString()}</p>
							</div>
							<div class="bg-white rounded-xl p-4 text-center shadow-sm">
								<div class="flex items-center justify-center gap-2 mb-2">
									<TrendingUp size={18} class="text-green-600" />
									<span class="text-xs text-green-700 font-medium">エンゲージメント</span>
								</div>
								<p class="text-2xl font-bold text-green-700">{data.instagramStats.impressions.toLocaleString()}</p>
							</div>
						</div>
					{/if}

					<!-- 最新投稿 -->
					{#if data.instagramPosts.length > 0}
						<div class="mt-6">
							<h4 class="text-lg font-semibold text-gray-800 mb-4">最新の投稿</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								{#each data.instagramPosts as post}
									<div class="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
										{#if post.thumbnail_url || post.media_url}
											<img src={post.thumbnail_url || post.media_url} alt={post.caption || ''} class="w-full h-48 object-cover" />
										{/if}
										<div class="p-4">
											{#if post.caption}
												<p class="text-sm text-gray-700 line-clamp-2 mb-3">{post.caption}</p>
											{/if}
											<div class="flex items-center gap-4 text-xs text-gray-500">
												<span class="flex items-center gap-1">
													<Heart size={12} class="text-red-500" />
													{post.like_count || 0}
												</span>
												<span class="flex items-center gap-1">
													<MessageSquare size={12} class="text-blue-500" />
													{post.comment_count || 0}
												</span>
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{:else}
				<div class="p-8 text-center text-gray-500">
					<Instagram size={48} class="mx-auto text-gray-300 mb-3" />
					<p>Instagramアカウントが接続されていません</p>
				</div>
			{/if}
		</div>

		<!-- Facebook連携 -->
		<div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-md overflow-hidden">
			<div class="p-6 border-b border-blue-100">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<Facebook size={24} class="text-blue-600" />
						<h2 class="text-xl font-semibold text-gray-800">Facebookページ</h2>
					</div>
					{#if !data.facebookPage}
						<button onclick={() => showFacebookForm = !showFacebookForm} class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
							{showFacebookForm ? 'キャンセル' : '接続する'}
						</button>
					{/if}
				</div>

				{#if showFacebookForm}
					<form method="POST" action="?/connectFacebook" use:enhance={handleFormSubmit} class="mt-4 space-y-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">FacebookページID</label>
							<input
								type="text"
								name="facebook_page_id"
								placeholder="10xxxxxxxxxx"
								required
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
							/>
							<p class="mt-2 text-sm text-gray-500">
								FacebookページのIDを入力してください
							</p>
						</div>
						<button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
							接続
						</button>
					</form>
				{/if}
			</div>

			{#if data.facebookPage}
				<div class="p-6">
					<!-- ページ情報 -->
					<div class="flex items-center gap-4 mb-6">
						{#if data.facebookPage.profile_picture_url}
							<img src={data.facebookPage.profile_picture_url} alt={data.facebookPage.name} class="w-20 h-20 rounded-full border-4 border-blue-200" />
						{:else}
							<div class="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center border-4 border-blue-200">
								<Facebook size={32} class="text-blue-600" />
							</div>
						{/if}
						<div class="flex-1">
							<h3 class="text-xl font-bold text-gray-800">{data.facebookPage.name}</h3>
							{#if data.facebookPage.category}
								<p class="text-gray-600">{data.facebookPage.category}</p>
							{/if}
							{#if data.facebookPage.about}
								<p class="text-sm text-gray-500 mt-1">{data.facebookPage.about}</p>
							{/if}
						</div>
					</div>

					<!-- 統計情報 -->
					{#if data.facebookStats}
						<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
							<div class="bg-white rounded-xl p-4 text-center shadow-sm">
								<div class="flex items-center justify-center gap-2 mb-2">
									<Users size={18} class="text-blue-600" />
									<span class="text-xs text-blue-700 font-medium">ファン</span>
								</div>
								<p class="text-2xl font-bold text-blue-700">{data.facebookStats.fan_count.toLocaleString()}</p>
							</div>
							<div class="bg-white rounded-xl p-4 text-center shadow-sm">
								<div class="flex items-center justify-center gap-2 mb-2">
									<Eye size={18} class="text-indigo-600" />
									<span class="text-xs text-indigo-700 font-medium">ページビュー</span>
								</div>
								<p class="text-2xl font-bold text-indigo-700">{data.facebookStats.page_views.toLocaleString()}</p>
							</div>
							<div class="bg-white rounded-xl p-4 text-center shadow-sm">
								<div class="flex items-center justify-center gap-2 mb-2">
									<TrendingUp size={18} class="text-purple-600" />
									<span class="text-xs text-purple-700 font-medium">エンゲージ</span>
								</div>
								<p class="text-2xl font-bold text-purple-700">{data.facebookStats.page_engaged_users.toLocaleString()}</p>
							</div>
							<div class="bg-white rounded-xl p-4 text-center shadow-sm">
								<div class="flex items-center justify-center gap-2 mb-2">
									<Image size={18} class="text-green-600" />
									<span class="text-xs text-green-700 font-medium">投稿数</span>
								</div>
								<p class="text-2xl font-bold text-green-700">{data.facebookStats.post_count.toLocaleString()}</p>
							</div>
						</div>
					{/if}

					<!-- 最新投稿 -->
					{#if data.facebookPosts.length > 0}
						<div class="mt-6">
							<h4 class="text-lg font-semibold text-gray-800 mb-4">最新の投稿</h4>
							<div class="space-y-4">
								{#each data.facebookPosts.slice(0, 5) as post}
									<div class="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
										<div class="flex items-start gap-4">
											{#if post.picture}
												<img src={post.picture} alt="" class="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
											{/if}
											<div class="flex-1 min-w-0">
												{#if post.message}
													<p class="text-sm text-gray-700 line-clamp-2 mb-2">{post.message}</p>
												{/if}
												<div class="flex items-center gap-4 text-xs text-gray-500">
													<span class="flex items-center gap-1">
														<Heart size={12} class="text-red-500" />
														{post.reactions_count || 0}
													</span>
													<span class="flex items-center gap-1">
														<MessageSquare size={12} class="text-blue-500" />
														{post.comments_count || 0}
													</span>
													<span class="flex items-center gap-1">
														<Share2 size={12} class="text-green-500" />
														{post.shares_count || 0}
													</span>
												</div>
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{:else}
				<div class="p-8 text-center text-gray-500">
					<Facebook size={48} class="mx-auto text-gray-300 mb-3" />
					<p>Facebookページが接続されていません</p>
				</div>
			{/if}
		</div>
	</main>
</div>
