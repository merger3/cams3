<script lang="ts">
	import { onMount, createEventDispatcher, getContext } from 'svelte';
	import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
	import type { Entry, SwapResponse, MenuItem, Coordinates } from '$types';
	import { commandText, stage, ClearStage, swapsCache, server, SyncCache } from '$lib/stores';
	import { GetSelectedRect, Selector } from '$lib/zones';
	import ZoomMenu from '$lib/actions/contextmenus/ZoomMenu.svelte';
	const dispatch = createEventDispatcher();

	export let cam: string;
	export let items: MenuItem[];
	export let position: Coordinates;

	function handleClick(target: string, value: string) {
		
		$commandText = `!ptzload ${Math.round(position.x)} ${Math.round(position.y)} ${value == "Max" ? 10000 : value}`;
		ClearStage($stage, [Selector.PresetMenu]);
		dispatch("sendcmd");
	}
</script>
 
{#each items as e, i}
	{#if !e.items || e.items.length == 0}
		{#if e.value == "separator"}
			<ContextMenu.Separator class="bg-cyan-700 mx-1"/>
		{:else}
			<ContextMenu.Item class="h-12 text-center" on:click={() => handleClick(cam, e.value)}>{e.value}{e.value != "Max" ? "%" : ""}</ContextMenu.Item>
		{/if}
	{:else}
		<ContextMenu.Sub>
			<ContextMenu.SubTrigger class="h-12" inset>{e.value}</ContextMenu.SubTrigger>
			<ContextMenu.SubContent class="w-4 overflow-visible text-center" fitViewport={false} overlap={true}> 
				<ZoomMenu items={e.items} bind:cam bind:position on:sendcmd={() => dispatch("sendcmd")}/>
			</ContextMenu.SubContent>
		</ContextMenu.Sub>
	{/if}
{/each}	