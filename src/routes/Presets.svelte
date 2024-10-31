<script lang="ts">
	import { ScrollArea } from "$lib/components/ui/scroll-area";
	import { onMount, createEventDispatcher } from 'svelte';
	import { am, commandText, server, GetCam, ifDimensions, stage, GetZone, zones, camPresets } from '$lib/stores';
	import type { Coordinates, CamPresets } from '$types';
	import { States, type Action } from '$lib/actions';
	const dispatch = createEventDispatcher();

	const name = "doubleclick";

	$am.Actions[name] = {
		Name: name,
		TriggerConditions: {
			Active: new Set([
				States.StageDoubleClick,
				States.LeftMouseButtonPressed
			]),
			Inactive: new Set(),
		},
		CancelConditions: {
			Active: new Set(),
			Inactive: new Set(),
		},
		IsActive: false,
		Cancel: cancel,
		Enable: enable
	}

	function enable(this: Action, origin: Coordinates) {
		$am.Actions[name].IsActive = true;
		let target = GetZone($zones, origin);
		if (!target) {
			$am.Actions[name].Cancel();
			return;
		}

		loadMenu(origin, Number(target.id()))
	}

	function cancel(this: Action) {
		$am.Actions[name].IsActive = false;
	}
	
	async function loadMenu(coordinates: Coordinates, target: number) {
		let cam = await GetCam({coordinates: coordinates, frameWidth: $ifDimensions.width, frameHeight: $ifDimensions.height, position: target}, $server)
		if (!cam.found) {
			$am.Actions[name].Cancel();
			return;
		}

		// let response = await $server.post('/camera/presets', {camera: cam.name})
		// $camPresets = response.data.camPresets;
		
		let response = JSON.parse(testString());
		if (!response.data.found) {
			$am.Actions[name].Cancel();
			return;
		} else {
			$camPresets = response.data.camPresets;
		}
		$am.Actions[name].IsActive = false;
	}

    function buildCommand(preset: string) {
		let newCommand: string = `!ptzload ${$camPresets.name} ${preset}`;
		if (newCommand == $commandText) {
			dispatch("sendcmd");
		} else {
			$commandText =  newCommand;
		}
    }
    
	function testString(): string {
		return `
		{
			"data": {
				"found": true,
				"camPresets": {
					"name": "pasture",
					"presets": [
						"home",
						"barn",
						"insidebarn",
						"pen",
						"grove",
						"purplebase",
						"brush",
						"barn2",
						"pool",
						"feeder",
						"gate",
						"barn2r",
						"barn2hay",
						"stompyfood",
						"water",
						"poolr",
						"pooll",
						"penr",
						"penm",
						"penl"
					]
				}
			}
		}`;
	}

	onMount(() => {
		
	});

</script>

{#if $camPresets.presets.length != 0}
	<div id="presets-menu" class="d-block text-center px-3 py-3 mt-1.5 mb-auto ms-1 me-1.5 z-20 rounded shadow ">
		{#each $camPresets.presets as p}
			<button type="button" on:click={() => buildCommand(p)} class="btn btn-outline-danger btn-lg d-block w-100 px-0 mb-2 overflow-hidden position-relative h-16">{p}</button>
		{/each}
	</div>
	<div class="mt-2.5" />
{/if}

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