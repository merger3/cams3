<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import Subpresets from './SubPresets.svelte';
	import { commandText, stage, camPresets, ClearStage } from '$lib/stores';
	import type { ButtonPreset } from '$types';

	const dispatch = createEventDispatcher();

	export let preset: ButtonPreset[];

    function buildCommand(preset: string) {
		let newCommand: string = `!ptzload ${$camPresets.name} ${preset}`;
		if (newCommand == $commandText) {
			dispatch("sendcmd");
		} else {
			$commandText =  newCommand;
			ClearStage($stage)
		}
    }
	
	export let buttonWidth: string;
</script>

{#each preset as p}
	{#if p.name != "separator"}
		<button type="button" on:click={() => buildCommand(p.name)} class="btn btn-outline-warning btn-lg d-block px-0 mb-2 overflow-hidden position-relative h-16" style="width: {buttonWidth}">{p.name}</button>
	{/if}
	<!-- <Subpresets bind:buttonWidth bind:preset={p.subentries} on:sendcmd={() => dispatch("sendcmd")} /> -->
{/each}
