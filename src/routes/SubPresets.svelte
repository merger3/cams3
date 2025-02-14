<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import Subpresets from './SubPresets.svelte';
	import { commandText, stage, camPresets, ClearStage, sendCommand } from '$lib/stores';
	import type { ButtonPreset } from '$types';
	
	export let preset: ButtonPreset[];

    function buildCommand(preset: string) {
		let newCommand: string = `!ptzload ${$camPresets.value} ${preset}`;
		if (newCommand == $commandText) {
			sendCommand({cmd: newCommand})
		} else {
			$commandText = newCommand;
			sendCommand({cmd: newCommand})
			ClearStage($stage)
		}
    }
	
	export let buttonWidth: string;
</script>

{#each preset as p}
	{#if p.value != "separator"}
		<button type="button" on:click={() => buildCommand(p.value)} class="btn btn-outline-warning btn-lg d-block px-0 mb-2 overflow-hidden position-relative h-16" style="width: {buttonWidth}">{p.value}</button>
	{/if}
{/each}
