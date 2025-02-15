<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import Subpresets from './SubPresets.svelte';
	import { commandText, stage, camPresets, ClearStage, sendCommand } from '$lib/stores';
	import type { ButtonPreset } from '$types';
	import { Motion } from 'svelte-motion'
	import { portal } from "svelte-portal";
	
	export let preset: ButtonPreset[];
	export let quicksendSelected: string;

    function buildCommand(preset: string) {
		let newCommand: string = `!ptzload ${$camPresets.value} ${preset}`;
		if (newCommand == $commandText) {
			sendCommand({cmd: newCommand})
		} else {
			$commandText = newCommand;
			if (quicksendSelected == "btn-outline-secondary") {
				sendCommand({cmd: newCommand})
			}
			ClearStage($stage)
		}
    }
	
	export let buttonWidth: string;
</script>

{#each preset as p}
	{#if p.value != "separator"}
		<Motion whileFocus={{ scale: 1.2 }} let:motion>
			<button type="button" use:motion on:click={() => buildCommand(p.value)} class="btn btn-outline-warning btn-lg d-block px-0 mb-2 overflow-visible position-relative h-16" style="width: {buttonWidth}">{p.value}</button>
		</Motion>
	{/if}
{/each}
