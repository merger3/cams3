<script lang="ts">
	import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
	import type { Entry, SwapResponse } from '$types';
	import { commandText, stage, ClearStage, swapsCache, presetCache, server } from '$lib/stores';
	import { Selector } from '$lib/zones';
	import SubContextMenu from './SubContextMenu.svelte';

	export let entries: Entry[];
	export let cam: SwapResponse;
	async function handleClick(source: SwapResponse, target: string) {
		ClearStage($stage, [Selector.ContexMenu]);
		if (!isNaN(Number(target))) {
			let swaps: number[] = [Number(target), source.position]
			if (swaps[0] == swaps[1]) {
				return;
			}
			swaps.sort(function(a, b){return a - b}); 
			$commandText = `!swap ${swaps[0]} ${swaps[1]}`
		} else {
			$commandText = `!swap ${source.cam} ${target}`

			let response = await $server.post('/alias', {cam: target});
			let targetName: string = response.data.result;
			if (!$swapsCache[targetName]) {
				response = await $server.post('/camera/swaps', {camera: targetName});
				if (response.data.found) {
					$swapsCache[targetName] = response.data;
				}
			}

			if (!$presetCache[targetName]) {
				response = await $server.post('/camera/presets', {camera: targetName})
				if (response.data.found) {
					$presetCache[targetName] = response.data.camPresets;
				} else {
					$presetCache[targetName] = {name: targetName, presets: []}
				}
			}
		}
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
