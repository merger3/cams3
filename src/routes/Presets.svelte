<script lang="ts">
    import type { CamPresets } from '$types';
    import { createEventDispatcher } from 'svelte';

    export let spacerHeight: number;
	export let spacerWidth: number;
    export let commandText: string;
	export let camPresets: CamPresets;

	let yMargin: number = spacerHeight * .035;

    function buildCommand(preset: string) {
        commandText = `!ptzload ${camPresets.name} ${preset}`
    }
    

</script>

<div id="presets-menu" class="w-100 d-block m-auto text-center px-3 py-2 rounded shadow" style="max-height: {spacerHeight - yMargin}px; max-width: {spacerWidth - 15}px; top: {(yMargin / 2) - 4}px;">
    {#each camPresets.presets as p}
        <button type="button" on:click={() => buildCommand(p)} class="btn btn-outline-danger btn-lg d-block w-100 mb-2 overflow-hidden">{p}</button>
    {/each}
</div>

<style>
    #presets-menu {
		background-color: #1c1b22;

        /* left: 5px; */
		/* background: transparent; */
		overflow: scroll;
		-ms-overflow-style: none;  /* IE and Edge */
		scrollbar-width: none; /* Firefox */
		/* padding: 0 8px; Add equal padding on the left and right */
	}

    #presets-menu button:last-child {
   	 	margin-bottom: 0!important;
	}
</style>