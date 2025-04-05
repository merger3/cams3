<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
	import type { Entry, SwapResponse, MenuItem } from '$types';
	import { commandText, stage, ClearStage, sendCommand, SyncCache } from '$lib/stores';
	import { GetSelectedRect, Selector } from '$lib/zones';
	import SwapMenu from '$lib/actions/contextmenus/SwapMenu.svelte';

	export let cam: string;
	export let items: MenuItem[];
	export let content: HTMLDivElement;

	async function handleClick(target: string, value: string) {
		let position = GetSelectedRect(Selector.ContexMenu); // Or pass this into the component
		ClearStage($stage, [Selector.ContexMenu]);
		if (value == "primary") {
			value = "1";
		}
		if (!isNaN(Number(value))) {
			let swaps: number[] = [Number(value), Number(position.name())]
			if (swaps[0] == swaps[1]) {
				return;
			}
			swaps.sort(function(a, b){return a - b}); 
			sendCommand({cmd: `!swap ${swaps[0]} ${swaps[1]}`, reset: false});
		} else {
			$commandText = `!swap ${target} ${value}`
			SyncCache(value);
		}
	}
</script>
 

{#each items as e, i}
	{#if !e.items || e.items.length == 0}
		{#if e.value == "separator"}
			<ContextMenu.Separator class="bg-cyan-700 mx-1"/>
		{:else}
			<ContextMenu.Item class="h-12 text-base" on:click={() => handleClick(cam, e.value)}>{e.value}</ContextMenu.Item>
		{/if}
	{:else}
		<ContextMenu.Sub>
			<ContextMenu.SubTrigger class="h-12 text-base" inset>{e.value}</ContextMenu.SubTrigger>
			<ContextMenu.SubContent class="w-4 overflow-visible text-center" fitViewport={false} overlap={true}> 
				<SwapMenu items={e.items} bind:cam bind:content />
			</ContextMenu.SubContent>
		</ContextMenu.Sub>
	{/if}
{/each}