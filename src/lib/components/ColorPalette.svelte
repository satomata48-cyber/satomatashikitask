<script lang="ts">
	interface Props {
		label: string;
		value: string | null;
		onSelect: (color: string | null) => void;
	}

	let { label, value = $bindable(), onSelect }: Props = $props();

	const colors = [
		{ name: 'なし', value: null },
		{ name: '黒', value: '#000000' },
		{ name: '赤', value: '#ef4444' },
		{ name: 'オレンジ', value: '#f97316' },
		{ name: '黄', value: '#eab308' },
		{ name: '緑', value: '#22c55e' },
		{ name: '青', value: '#3b82f6' },
		{ name: '紫', value: '#a855f7' },
		{ name: 'ピンク', value: '#ec4899' },
		{ name: '灰色', value: '#6b7280' }
	];

	const bgColors = [
		{ name: 'なし', value: null },
		{ name: '薄赤', value: '#fee2e2' },
		{ name: '薄橙', value: '#fed7aa' },
		{ name: '薄黄', value: '#fef3c7' },
		{ name: '薄緑', value: '#d1fae5' },
		{ name: '薄青', value: '#dbeafe' },
		{ name: '薄紫', value: '#e9d5ff' },
		{ name: '薄桃', value: '#fce7f3' },
		{ name: '薄灰', value: '#f3f4f6' }
	];

	const palette = label.includes('背景') || label.includes('マーカー') ? bgColors : colors;
</script>

<div class="mb-3">
	<label class="block text-xs font-medium text-gray-700 mb-2">{label}</label>
	<div class="flex flex-wrap gap-2">
		{#each palette as color}
			<button
				type="button"
				onclick={() => {
					value = color.value;
					onSelect(color.value);
				}}
				class="relative w-8 h-8 rounded border-2 transition-all hover:scale-110"
				style="background-color: {color.value || '#ffffff'}; border-color: {value === color.value ? '#3b82f6' : '#d1d5db'}"
				title={color.name}
			>
				{#if color.value === null}
					<span class="absolute inset-0 flex items-center justify-center text-xs text-gray-400">×</span>
				{/if}
				{#if value === color.value}
					<span class="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">✓</span>
				{/if}
			</button>
		{/each}
	</div>
</div>
