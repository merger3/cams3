<script lang="ts">
	import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
	import type { MenuPreset } from '$types';
	import { onMount, createEventDispatcher } from 'svelte';
	import { commandText, stage, ClearStage } from '$lib/stores';
	import { Selector } from '$lib/zones';
	import SubPresetsMenu from './SubPresetsMenu.svelte';

	const dispatch = createEventDispatcher();


	export let cam: string;
	export let preset: MenuPreset[];

	function handleClick(cam: string, preset: string) {
		$commandText = `!ptzload ${cam} ${preset}`;
		ClearStage($stage, [Selector.PresetMenu]);
		dispatch("sendcmd");
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
				<SubPresetsMenu bind:cam bind:preset={p.subentries} on:sendcmd={() => dispatch("sendcmd")}/>
			</ContextMenu.SubContent>
		</ContextMenu.Sub>
	{/if}
{/each}