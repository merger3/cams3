<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import Subpresets from './Subpresets.svelte';
	import { commandText, stage, camPresets, ClearStage } from '$lib/stores';
	import type { Preset } from '$types';

	const dispatch = createEventDispatcher();

	export let preset: Preset[];

    function buildCommand(preset: string) {
		let newCommand: string = `!ptzload ${$camPresets.name} ${preset}`;
		if (newCommand == $commandText) {
			dispatch("sendcmd");
		} else {
			$commandText =  newCommand;
			ClearStage($stage)
		}
    }
</script>

{#each preset as p}
	{#if !p.subentries}
		{#if p.name != "separator"}
			<button type="button" on:click={() => buildCommand(p.name)} class="btn btn-outline-warning btn-lg d-block w-100 px-0 mb-2 overflow-hidden position-relative h-16">{p.name}</button>
		{/if}
	{:else} 
		<Subpresets bind:preset={p.subentries} on:sendcmd={() => dispatch("sendcmd")} />
	{/if}
{/each}
