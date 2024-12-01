<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import { ifDimensions, commandHeight, commandText } from '$lib/stores';

	const dispatch = createEventDispatcher();
	const defaultCMD: string = "​";

	// This is mostly temporary. I'm working on a more robust settings system that talks to the server
	// and loads persistent settings from a sqlite DB but this is a quick and dirty way to do this single thing that's essential.
	export let selected: string;
	export let controls: number;

	function togglePlayerControls() {
		if (selected == "btn-outline-secondary") {
			selected = "btn-secondary";
			jQuery('#cams').css('z-index', '100');
			jQuery('#cams').css('pointer-events', 'all');
			jQuery('#chat').css('visibility', 'hidden');
			controls = 1;
		} else {
			selected = "btn-outline-secondary";
			jQuery('#cams').css('z-index', '');
			jQuery('#cams').css('pointer-events', '');
			jQuery('#chat').css('visibility', '');
		}
	}

	function toggleVideoSource() {
		if (window.location.pathname == "/lola") {
			window.location.replace(`/twitch${window.location.hash}`);
		} else if  (window.location.pathname == "/twitch") {
			window.location.replace(`/lola${window.location.hash}`);
		}
	}

	function forceResync() {
		$commandText = "!scenecams";
		dispatch('sendcmd');
	}


	function getSwapString(): string {
		return window.location.pathname == "/lola" ? "Twitch" : "Lola";
	}
</script>

<div class="dropdown z-40 movedown">
	<button style="position: absolute;min-height: {$commandHeight}px;max-height: {$commandHeight}px;right: 0;top: 0;" id="dropdown-button" class="btn btn-outline-primary dropdown-toggle w-100 p-0 m-0 themed" type="button" data-bs-toggle="dropdown" data-bs-auto-close="true" aria-expanded="false">
		Settings
	</button>
	<div id="dropdown-menu" class="dropdown-menu w-100 text-center px-2 border border-1 border-danger-subtle shadow" style="max-height: {$ifDimensions.height - ($ifDimensions.height * .15)}px">
		<button type="button" on:click={() => forceResync()} class="btn btn-outline-secondary btn-md d-block w-100 mb-2 overflow-hidden">Force Resync</button>
		<button type="button" on:click={() => togglePlayerControls()} class="btn {selected} btn-lg d-block w-100 mb-2 overflow-hidden">Toggle Video<br>Controls</button>
		<button type="button" on:click={() => toggleVideoSource()} class="btn btn-outline-secondary btn-sm d-block w-100 mb-2 overflow-hidden">Swap to {getSwapString()}</button>
	</div>
</div>


<style>
	#dropdown-menu {
		background-color: #1c1b22;
		margin-top: -2px!important;
		overflow: scroll;
		-ms-overflow-style: none;  
		scrollbar-width: none; 
	}
	#dropdown-menu::-webkit-scrollbar { /* Chrome */
		display: none;
	}
	#dropdown-menu button:last-child {
   	 	margin-bottom: 0!important;
	}
</style>