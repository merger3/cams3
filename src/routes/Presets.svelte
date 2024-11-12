<script lang="ts">
	import { ScrollArea } from "$lib/components/ui/scroll-area";
	import { onMount, createEventDispatcher } from 'svelte';
	import { am, commandText, server, GetCam, ifDimensions, stage, GetZone, zones, camPresets, ClearStage, presetCache } from '$lib/stores';
	import type { Coordinates, CamPresets } from '$types';
	import { States, type Action } from '$lib/actions';
	import { Selector, AddSelection, RemoveSelection } from '$lib/zones';
	import type Konva from "konva";

	const dispatch = createEventDispatcher();

	const name = "doubleclick";

	$am.Actions[name] = {
		Name: name,
		TriggerConditions: {
			Active: new Set([
				States.StageDoubleClick,
				States.LeftMouseButtonPressed,
				States.OnePointer
			]),
			Inactive: new Set(),
		},
		CancelConditions: {
			Active: new Set(),
			Inactive: new Set([
				States.OnePointer
			]),
		},
		IsActive: false,
		Cancel: cancel,
		Enable: enable
	}

	let target: Konva.Rect;
	function enable(this: Action, origin: Coordinates) {
		$am.Actions[name].IsActive = true;
		target = GetZone($zones, origin);
		if (!target) {
			$am.Actions[name].Cancel();
			return;
		}
		
		loadMenu(origin, target)
	}

	function cancel(this: Action) {
		target = undefined;
		$am.Actions[name].IsActive = false;
	}
	
	async function loadMenu(coordinates: Coordinates, target: Konva.Rect) {
		let presets: CamPresets = {name: "", presets: []};
		let cam = await GetCam({coordinates: coordinates, frameWidth: $ifDimensions.width, frameHeight: $ifDimensions.height, position: Number(target.name())}, $server)
		

		if (cam.found) {
			let cachedPresets = $presetCache[cam.cam];
			if (!cachedPresets) {
				console.log("cache miss");
				let response = await $server.post('/camera/presets', {camera: cam.cam})
				if (response.data.found) {
					presets = response.data.camPresets;
					$presetCache[cam.cam] = response.data.camPresets;
				} else {
					$presetCache[cam.cam] = {name: cam.cam, presets: []}
				}
			} else {
				console.log("cache hit");
				presets = cachedPresets;
			}
		}

		AddSelection(target, Selector.Presets);
		$camPresets = presets;

		$am.Actions[name].IsActive = false;
	}

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

{#if $camPresets.presets.length != 0}
	<div id="presets-menu" class="d-block text-center px-3 py-3 mt-1.5 mb-auto ms-1 me-1.5 z-20 rounded shadow ">
		{#each $camPresets.presets as p}
			<button type="button" on:click={() => buildCommand(p.name)} class="btn btn-outline-warning btn-lg d-block w-100 px-0 mb-2 overflow-hidden position-relative h-16">{p.name}</button>
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