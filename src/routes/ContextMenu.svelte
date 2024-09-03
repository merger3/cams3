<script lang="ts">
	import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
	import { createEventDispatcher, onMount } from 'svelte';
	import type { Entry, SwapResponse } from '$types';
	import SubContextMenu from './SubContextMenu.svelte';
	const dispatch = createEventDispatcher();
	
	export let isRendered: boolean;
	export let isOpen: boolean;

	export let entry: SwapResponse;

	function bubbleClick(e: any) {
		dispatch('clickentry', e.detail);
	}

	function opc(open: boolean) {
		if (open) {
			dispatch("openmenu");
		} else {
			dispatch("closemenu");
		}
	}
	onMount(() => {
		console.log("context menu")
    });
  </script>
   
   <!-- let swaps: SwapResponse = {found: false, cam: "", position: 0, swaps: null} -->

  <ContextMenu.Root bind:open={isOpen} onOpenChange={opc}>
	<ContextMenu.Trigger>
		<slot></slot>
	</ContextMenu.Trigger>
	{#if isRendered && entry.found && entry.swaps && entry.swaps.subentries}
		<ContextMenu.Content class="w-52 dark:bg-slate-800 z-10">
				<SubContextMenu on:clickentry={bubbleClick} entries={entry.swaps.subentries} cam={{cam: entry.cam, position: entry.position, found: true, swaps: null}} />
		</ContextMenu.Content>
	{/if}
</ContextMenu.Root>
