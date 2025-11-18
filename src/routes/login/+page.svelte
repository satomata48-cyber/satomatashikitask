<script lang="ts">
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let isRegister = $state(false);
</script>

<svelte:head>
	<title>{isRegister ? '新規登録' : 'ログイン'} - タスク管理</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
	<div class="max-w-md w-full">
		<div class="bg-white rounded-lg shadow-lg p-8">
			<h1 class="text-3xl font-bold text-center mb-8 text-gray-800">
				{isRegister ? '新規登録' : 'ログイン'}
			</h1>

			{#if form?.error}
				<div class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
					{form.error}
				</div>
			{/if}

			<form method="POST" action="?/{isRegister ? 'register' : 'login'}" class="space-y-6">
				<div>
					<label for="username" class="block text-sm font-medium text-gray-700 mb-2">
						ユーザー名
					</label>
					<input
						type="text"
						id="username"
						name="username"
						required
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-gray-700 mb-2">
						パスワード
					</label>
					<input
						type="password"
						id="password"
						name="password"
						required
						minlength={isRegister ? '6' : undefined}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
					{#if isRegister}
						<p class="mt-1 text-sm text-gray-500">6文字以上で入力してください</p>
					{/if}
				</div>

				<button
					type="submit"
					class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
				>
					{isRegister ? '登録' : 'ログイン'}
				</button>
			</form>

			<div class="mt-6 text-center">
				<button
					type="button"
					onclick={() => (isRegister = !isRegister)}
					class="text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
				>
					{isRegister ? 'すでにアカウントをお持ちの方はこちら' : 'アカウントをお持ちでない方はこちら'}
				</button>
			</div>
		</div>
	</div>
</div>
