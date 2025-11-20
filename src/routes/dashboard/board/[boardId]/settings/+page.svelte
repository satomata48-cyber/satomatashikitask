<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { ArrowLeft, Save, Send } from 'lucide-svelte';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// フォーム状態
	let webhookUrl = $state(data.discordSettings?.webhook_url || '');
	let enabled = $state(data.discordSettings?.enabled === 1);
	let daysAhead = $state(data.discordSettings?.days_ahead || 3);
	let timezone = $state(data.discordSettings?.timezone || 'Asia/Tokyo');

	// スケジュール設定
	let scheduleType = $state<'daily' | 'weekly' | 'custom'>('daily');
	let scheduleHour = $state(9);
	let scheduleMinute = $state(0);
	let selectedDays = $state<number[]>([1, 2, 3, 4, 5]); // 月-金
	let customCron = $state(data.discordSettings?.cron_schedule || '0 9 * * *');

	// 曜日の選択肢
	const weekDays = [
		{ value: 0, label: '日' },
		{ value: 1, label: '月' },
		{ value: 2, label: '火' },
		{ value: 3, label: '水' },
		{ value: 4, label: '木' },
		{ value: 5, label: '金' },
		{ value: 6, label: '土' }
	];

	// Cron式を生成
	function generateCronSchedule(): string {
		if (scheduleType === 'custom') {
			return customCron;
		}

		const minute = scheduleMinute;
		const hour = scheduleHour;

		if (scheduleType === 'daily') {
			return `${minute} ${hour} * * *`;
		} else if (scheduleType === 'weekly') {
			const days = selectedDays.sort().join(',');
			return `${minute} ${hour} * * ${days}`;
		}

		return '0 9 * * *';
	}

	// 曜日トグル
	function toggleDay(day: number) {
		if (selectedDays.includes(day)) {
			selectedDays = selectedDays.filter(d => d !== day);
		} else {
			selectedDays = [...selectedDays, day];
		}
	}

	// Webhook URLのマスク表示
	const maskedWebhookUrl = $derived(() => {
		if (!webhookUrl || webhookUrl.length < 50) return webhookUrl;
		return webhookUrl.substring(0, 40) + '...' + webhookUrl.substring(webhookUrl.length - 10);
	});

	let saving = $state(false);
	let testing = $state(false);
</script>

<svelte:head>
	<title>Discord設定 - {data.board.title}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<div class="max-w-4xl mx-auto py-8 px-4">
		<!-- ヘッダー -->
		<div class="mb-6">
			<a href="/dashboard" class="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
				<ArrowLeft class="w-4 h-4 mr-1" />
				ダッシュボードに戻る
			</a>
			<h1 class="text-3xl font-bold text-gray-800">Discord連携設定</h1>
			<p class="text-gray-600 mt-2">ボード: {data.board.title}</p>
		</div>

		<!-- エラー・成功メッセージ -->
		{#if form?.error}
			<div class="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
				{form.error}
			</div>
		{/if}

		{#if form?.success && form?.message}
			<div class="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
				{form.message}
			</div>
		{/if}

		<div class="bg-white rounded-lg shadow-md p-6 space-y-6">
			<form method="POST" action="?/save" use:enhance={() => {
				saving = true;
				return async ({ update }) => {
					await update();
					saving = false;
				};
			}}>
				<!-- Discord連携の有効/無効 -->
				<div class="flex items-center justify-between p-4 bg-gray-50 rounded">
					<div>
						<h3 class="font-semibold text-gray-800">Discord連携</h3>
						<p class="text-sm text-gray-600">期限が近いタスクをDiscordに通知します</p>
					</div>
					<label class="relative inline-flex items-center cursor-pointer">
						<input
							type="checkbox"
							bind:checked={enabled}
							name="enabled"
							value="true"
							class="sr-only peer"
						/>
						<div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
					</label>
				</div>

				{#if enabled}
					<!-- Webhook URL -->
					<div>
						<label for="webhook_url" class="block text-sm font-medium text-gray-700 mb-2">
							Discord Webhook URL <span class="text-red-500">*</span>
						</label>
						<input
							type="url"
							id="webhook_url"
							name="webhook_url"
							bind:value={webhookUrl}
							required={enabled}
							placeholder="https://discord.com/api/webhooks/..."
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
						<p class="mt-1 text-xs text-gray-500">
							Discordサーバーの設定 → 連携サービス → ウェブフックから取得できます
						</p>
					</div>

					<!-- 通知基準日数 -->
					<div>
						<label for="days_ahead" class="block text-sm font-medium text-gray-700 mb-2">
							通知する期限日数
						</label>
						<div class="flex items-center gap-3">
							<input
								type="number"
								id="days_ahead"
								name="days_ahead"
								bind:value={daysAhead}
								min="1"
								max="30"
								class="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
							<span class="text-gray-600">日前から通知</span>
						</div>
						<p class="mt-1 text-xs text-gray-500">
							期限が{daysAhead}日以内のタスクを通知します（1〜30日）
						</p>
					</div>

					<!-- スケジュール設定 -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-3">
							通知スケジュール
						</label>

						<!-- スケジュールタイプ選択 -->
						<div class="flex gap-2 mb-4">
							<button
								type="button"
								onclick={() => scheduleType = 'daily'}
								class="px-4 py-2 rounded {scheduleType === 'daily' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}"
							>
								毎日
							</button>
							<button
								type="button"
								onclick={() => scheduleType = 'weekly'}
								class="px-4 py-2 rounded {scheduleType === 'weekly' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}"
							>
								毎週
							</button>
							<button
								type="button"
								onclick={() => scheduleType = 'custom'}
								class="px-4 py-2 rounded {scheduleType === 'custom' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}"
							>
								カスタム
							</button>
						</div>

						{#if scheduleType === 'daily' || scheduleType === 'weekly'}
							<!-- 時刻選択 -->
							<div class="flex items-center gap-3 mb-4">
								<label class="text-sm text-gray-600">時刻:</label>
								<select
									bind:value={scheduleHour}
									class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								>
									{#each Array(24) as _, i}
										<option value={i}>{i.toString().padStart(2, '0')}</option>
									{/each}
								</select>
								<span>:</span>
								<select
									bind:value={scheduleMinute}
									class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								>
									<option value={0}>00</option>
									<option value={15}>15</option>
									<option value={30}>30</option>
									<option value={45}>45</option>
								</select>
							</div>

							{#if scheduleType === 'weekly'}
								<!-- 曜日選択 -->
								<div>
									<label class="text-sm text-gray-600 mb-2 block">曜日:</label>
									<div class="flex gap-2">
										{#each weekDays as day}
											<button
												type="button"
												onclick={() => toggleDay(day.value)}
												class="w-10 h-10 rounded-full {selectedDays.includes(day.value) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}"
											>
												{day.label}
											</button>
										{/each}
									</div>
								</div>
							{/if}
						{/if}

						{#if scheduleType === 'custom'}
							<!-- Cron式入力 -->
							<div>
								<label for="custom_cron" class="block text-sm text-gray-600 mb-2">
									Cron式:
								</label>
								<input
									type="text"
									id="custom_cron"
									bind:value={customCron}
									placeholder="0 9 * * *"
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
								/>
								<p class="mt-1 text-xs text-gray-500">
									例: "0 9 * * *" = 毎日9時、"0 9 * * 1-5" = 平日9時
								</p>
							</div>
						{/if}

						<!-- 生成されるCron式を表示 -->
						<div class="mt-3 p-3 bg-gray-50 rounded">
							<p class="text-xs text-gray-600 mb-1">生成されるCron式:</p>
							<code class="text-sm font-mono text-gray-800">{generateCronSchedule()}</code>
						</div>

						<!-- 隠しフィールド -->
						<input type="hidden" name="cron_schedule" value={generateCronSchedule()} />
					</div>

					<!-- タイムゾーン -->
					<div>
						<label for="timezone" class="block text-sm font-medium text-gray-700 mb-2">
							タイムゾーン
						</label>
						<select
							id="timezone"
							name="timezone"
							bind:value={timezone}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
							<option value="UTC">UTC</option>
							<option value="America/New_York">America/New_York (EST)</option>
							<option value="Europe/London">Europe/London (GMT)</option>
						</select>
					</div>
				{/if}

				<!-- 保存ボタン -->
				<div class="flex gap-3 pt-4">
					<button
						type="submit"
						disabled={saving}
						class="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
					>
						<Save class="w-4 h-4" />
						{saving ? '保存中...' : '設定を保存'}
					</button>
				</div>
			</form>

			{#if enabled && webhookUrl}
				<!-- テスト送信 -->
				<div class="pt-4 border-t">
					<h3 class="font-semibold text-gray-800 mb-3">テスト送信</h3>
					<p class="text-sm text-gray-600 mb-3">
						設定が正しく動作するか確認するため、Discordにテストメッセージを送信します。
					</p>
					<form method="POST" action="?/test" use:enhance={() => {
						testing = true;
						return async ({ update }) => {
							await update();
							testing = false;
						};
					}}>
						<input type="hidden" name="webhook_url" value={webhookUrl} />
						<button
							type="submit"
							disabled={testing}
							class="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
						>
							<Send class="w-4 h-4" />
							{testing ? '送信中...' : 'テスト送信'}
						</button>
					</form>
				</div>
			{/if}
		</div>

		<!-- 使い方ガイド -->
		<div class="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
			<h3 class="font-semibold text-blue-900 mb-3">使い方</h3>
			<ol class="list-decimal list-inside space-y-2 text-sm text-blue-800">
				<li>Discordサーバーの設定から「連携サービス」→「ウェブフック」を開く</li>
				<li>「新しいウェブフック」を作成し、Webhook URLをコピー</li>
				<li>上記のフォームにWebhook URLを貼り付け</li>
				<li>通知日数とスケジュールを設定</li>
				<li>「設定を保存」をクリック</li>
				<li>「テスト送信」で動作確認</li>
			</ol>
		</div>
	</div>
</div>
