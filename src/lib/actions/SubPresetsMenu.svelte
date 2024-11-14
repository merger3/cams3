<script lang="ts">
	import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
	import type { Preset } from '$types';
	import { commandText, stage, ClearStage } from '$lib/stores';
	import { Selector } from '$lib/zones';
	import SubPresetsMenu from './SubPresetsMenu.svelte';

	export let cam: string;
	export let preset: Preset[];

	function handleClick(cam: string, preset: string) {
		$commandText = `!ptzload ${cam} ${preset}`;
		ClearStage($stage, [Selector.PresetMenu]);
	}

</script>

{#each preset as p}
	{#if !p.subentries}
		{#if p.name == "separator"}
			<ContextMenu.Separator class="bg-cyan-700 mx-1"/>
		{:else}
			<ContextMenu.Item class="h-9" on:click={() => handleClick(cam, p.name)}>{p.name}</ContextMenu.Item>
		{/if}
	{:else} 
		<ContextMenu.Sub>
			<ContextMenu.SubTrigger class="h-10" inset>{p.name}</ContextMenu.SubTrigger>
			<ContextMenu.SubContent class="overflow-visible text-center" fitViewport={false} overlap={true}> 
				<SubPresetsMenu bind:cam bind:preset={p.subentries} />
			</ContextMenu.SubContent>
		</ContextMenu.Sub>
	{/if}
{/each}