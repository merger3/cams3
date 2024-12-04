<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
	import type { Entry, SwapResponse, MenuItem } from '$types';
	import { commandText, stage, ClearStage, swapsCache, server, SyncCache } from '$lib/stores';
	import { GetSelectedRect, Selector } from '$lib/zones';
	import SwapMenu from '$lib/actions/contextmenus/SwapMenu.svelte';
	const dispatch = createEventDispatcher();

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
			$commandText = `!swap ${swaps[0]} ${swaps[1]}`
			dispatch("sendcmd");
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
			<ContextMenu.Item class="h-10" on:click={() => handleClick(cam, e.value)}>{e.value}</ContextMenu.Item>
		{/if}
	{:else}
		<ContextMenu.Sub>
			<ContextMenu.SubTrigger class="h-10" inset>{e.value}</ContextMenu.SubTrigger>
			<ContextMenu.SubContent class="w-4 overflow-visible text-center" fitViewport={false} overlap={true}> 
				<SwapMenu items={e.items} bind:cam bind:content on:sendcmd={() => dispatch("sendcmd")}/>
			</ContextMenu.SubContent>
		</ContextMenu.Sub>
	{/if}
{/each}