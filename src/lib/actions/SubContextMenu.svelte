<script lang="ts">
	import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
	import type { Entry, SwapResponse } from '$types';
	import { commandText } from '$lib/stores';
	import SubContextMenu from './SubContextMenu.svelte';

	export let entries: Entry[];
	export let cam: SwapResponse;
	function handleClick(source: SwapResponse, target: string) {
		target = target == "main" ? "1" : target;
		let sourceCam = isNaN(Number(target)) ? source.cam : source.position

		if (target == "1") {
			$commandText = `!swap ${target} ${sourceCam}`
		} else {
			$commandText = `!swap ${sourceCam} ${target}`
		}
		
	}

</script>

<!-- <ContextMenu.Item>an item</ContextMenu.Item> -->
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
			<ContextMenu.SubContent class="w-4 overflow-visible text-right">
				<SubContextMenu entries={e.subentries} cam={cam}/>
			</ContextMenu.SubContent>
		</ContextMenu.Sub>
	{/if}
{/each}	