<script lang="ts">
	import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
	import { createEventDispatcher, onMount } from 'svelte';
	import type { Entry, SwapResponse } from '$types';
	import SubContextMenu from './SubContextMenu.svelte';
	const dispatch = createEventDispatcher();
	

	export let entries: Entry[];
	export let cam: SwapResponse;
	function handleClick(source: SwapResponse, target: string) {
		target = target == "main" ? "1" : target;
		let sourceCam = isNaN(Number(target)) ? source.cam : source.position
		if (target == "1") {
			dispatch('clickentry', {
				cam: target,
				target: sourceCam
			});
		} else {
			dispatch('clickentry', {
				cam: sourceCam,
				target: target
			});
		}
		
	}

	function bubbleClick(e: any) {
		dispatch('clickentry', e.detail);
	}

	onMount(() => {
		console.log(entries)
    });
</script>

<!-- <ContextMenu.Item>an item</ContextMenu.Item> -->
{#each entries as e, i}
	{#if !e.subentries || e.subentries.length == 0}
		{#if e.label == "separator"}
			<ContextMenu.Separator class="bg-cyan-700 mx-1"/>
		{:else}
			<ContextMenu.Item on:click={() => handleClick(cam, e.label)}>{e.label}</ContextMenu.Item>
		{/if}
	{:else}
		<ContextMenu.Sub>
			<ContextMenu.SubTrigger inset>{e.label}</ContextMenu.SubTrigger>
			<ContextMenu.SubContent class="w-4 overflow-visible text-right">
				<SubContextMenu on:clickentry={bubbleClick} entries={e.subentries} cam={cam}/>
			</ContextMenu.SubContent>
		</ContextMenu.Sub>
	{/if}
{/each}	