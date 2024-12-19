<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
	import type { Entry, SwapResponse, MenuItem } from '$types';
	import { commandText, stage, ClearStage, sendCommand } from '$lib/stores';
	import { GetSelectedRect, Selector } from '$lib/zones';
	import PresetsMenu from '$lib/actions/contextmenus/PresetsMenu.svelte';
	
	export let cam: string;
	export let items: MenuItem[];

	function handleClick(target: string, value: string) {
		ClearStage($stage, [Selector.PresetMenu]);
		sendCommand({cmd: `!ptzload ${target} ${value}`, reset: false});
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
				<PresetsMenu items={e.items} bind:cam />
			</ContextMenu.SubContent>
		</ContextMenu.Sub>
	{/if}
{/each}	