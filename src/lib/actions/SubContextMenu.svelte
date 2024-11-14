<script lang="ts">
	import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
	import type { Entry, SwapResponse } from '$types';
	import { commandText, stage, ClearStage } from '$lib/stores';
	import { Selector } from '$lib/zones';
	import SubContextMenu from './SubContextMenu.svelte';

	export let entries: Entry[];
	export let cam: SwapResponse;
	function handleClick(source: SwapResponse, target: string) {
		if (!isNaN(Number(target))) {
			let swaps: number[] = [Number(target), source.position]
			if (swaps[0] == swaps[1]) {
				return;
			}
			swaps.sort(function(a, b){return a - b}); 
			$commandText = `!swap ${swaps[0]} ${swaps[1]}`
		} else {
			$commandText = `!swap ${source.cam} ${target}`
		}
		ClearStage($stage, [Selector.ContexMenu]);
	}

</script>
 

{#each entries as e, i}
	{#if !e.subentries || e.subentries.length == 0}
		{#if e.label == "separator"}
			<ContextMenu.Separator class="bg-cyan-700 mx-1"/>
		{:else}
			<ContextMenu.Item class="h-10" on:click={() => handleClick(cam, e.label)}>{e.label}</ContextMenu.Item>
		{/if}
	{:else}
		<ContextMenu.Sub>
			<ContextMenu.SubTrigger class="h-10" inset>{e.label}</ContextMenu.SubTrigger>
			<ContextMenu.SubContent class="w-4 overflow-visible text-center" fitViewport={false} overlap={true}> 
				<SubContextMenu entries={e.subentries} cam={cam}/>
			</ContextMenu.SubContent>
		</ContextMenu.Sub>
	{/if}
{/each}	
