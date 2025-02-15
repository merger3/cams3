<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import Subpresets from './SubPresets.svelte';
	import { commandText, stage, camPresets, ClearStage, sendCommand } from '$lib/stores';
	import type { ButtonPreset } from '$types';
	import { Motion } from 'svelte-motion'
	import { portal } from "svelte-portal";
	
	export let preset: ButtonPreset[];
	export let quicksendSelected: string;

	export let buttonWidth: string;

	let s: number[] = [];

    function buildCommand(preset: string, index: number, el: HTMLElement) {
		// jQuery(el).css({"position": "absolute", "z-index": "1000"});
		let newCommand: string = `!ptzload ${$camPresets.value} ${preset}`;
		if (newCommand == $commandText) {
			sendCommand({cmd: newCommand})
			s[index] = 1.25;
		} else {
			$commandText = newCommand;
			if (quicksendSelected == "btn-outline-secondary") {
				sendCommand({cmd: newCommand})
				s[index] = 1.25;
			}
			ClearStage($stage)
		}
    }

	function cleanUpAnimation(definition: any, i: number) {
		s[i] = 1;
		if (definition.scale == 1) {
			// jQuery(scrollAreaElement).css("overflow", "auto");
		}
	}
	
</script>

{#each preset as p, i}
	{#if p.value != "separator"}
		<Motion animate={{ scale: s[i] }} transition={{ duration: .13 }} onAnimationComplete={(definition) => {cleanUpAnimation(definition, i)}}  let:motion>
			<button type="button" use:motion on:click={(event) => buildCommand(p.value, i, event.currentTarget)} class="btn btn-outline-warning btn-lg d-block px-0 mb-2 overflow-hidden position-relative h-16" style="width: {buttonWidth}">{p.value}</button>
		</Motion>
	{/if}
{/each}
