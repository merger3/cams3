<script lang="ts">
	import { ScrollArea } from "$lib/components/ui/scroll-area";
	import { onMount, afterUpdate, createEventDispatcher, tick } from 'svelte';
	import { am, server, GetCam, ifDimensions, stage, GetZone, zones, camPresets, presetButtonCache, keyboardHandler, scrollMemory } from '$lib/stores';
	import type { Coordinates, CamPresets } from '$types';
	import { States, type Action } from '$lib/actions';
	import { Selector, AddSelection, RemoveSelection } from '$lib/zones';
	import Subpresets from './SubPresets.svelte';
	import type Konva from "konva";
	import _ from 'lodash';

	const dispatch = createEventDispatcher();
	export let quicksendSelected: string;

	const name = "click";

	$am.Actions[name] = {
		Name: name,
		TriggerConditions: {
			Active: new Set([
				States.StagePointerDown,
				States.PointerAdded,
				States.OnePointer,
				States.LeftMouseButtonPressed,
				States.ClickedEmptySpace
			]),
			Inactive: new Set([
				States.StageDraggingBuffered,
				States.StageDoubleClick,
				States.CrossedZones
			]),
		},
		CancelConditions: {
			Active: new Set([
				States.StageDraggingBuffered,
				States.StageDoubleClick,
				States.CrossedZones
			]),
			Inactive: new Set([
				States.StagePointerDown,
				States.OnePointer,
				States.LeftMouseButtonPressed
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

		$stage.on('pointerup.click', () => {
			$stage.off('pointerup.click');
			$am.Actions[name].IsActive = false;
			loadMenu(origin, target);
		});
	}

	function cancel(this: Action) {
		$stage.off('pointerup.click')
		target = undefined;
		$am.Actions[name].IsActive = false;
	}

	let scrollAreaElement: HTMLDivElement;
	let buttonWidth: string;
	async function loadMenu(coordinates: Coordinates, target: Konva.Rect) {
		let presets: CamPresets = {value: "", items: []};
		let cam = await GetCam({coordinates: coordinates, frameWidth: $ifDimensions.width, frameHeight: $ifDimensions.height, position: Number(target.name())}, $server)
		console.log(`preset cam: ${cam.cam}`)
		if (cam.found) {
			let cachedPresets = $presetButtonCache[cam.cam];
			if (!cachedPresets) {
				console.log("missed cache on preset buttons")
				let response = await $server.post('/camera/presets/buttons', {camera: cam.cam})
				if (response.data.found) {
					presets = response.data.camPresets;
					$presetButtonCache[cam.cam] = response.data.camPresets;
				} else {
					$presetButtonCache[cam.cam] = {value: cam.cam, items: []}
				}
			} else {
				console.log(`Cached preset: ${cachedPresets.value}`)
				presets = cachedPresets;
			}
		} else {
			$am.Actions[name].Cancel();
			return;
		}
		let scrollPosition: number;
		if (scrollAreaElement) {
			if ($camPresets.value != "") {
				$scrollMemory[$camPresets.value] = scrollAreaElement.scrollTop
				console.log(`Stored scroll position for ${$camPresets.value} as ${scrollAreaElement.scrollTop}`);
			}
			scrollPosition = $scrollMemory[cam.cam] && $camPresets.value != cam.cam ? $scrollMemory[cam.cam] : 0;
			console.log(`Loaded scroll position for ${cam.cam} as ${scrollPosition}`);
			buttonWidth = scrollAreaElement.getBoundingClientRect().width + 'px';
		} else {
			buttonWidth = "100%";
		}

		loadButtons(target, presets, scrollPosition)
		$am.Actions[name].IsActive = false;
	}

	function loadButtons(target: Konva.Rect, presets: CamPresets, scrollPosition: number) {
		$keyboardHandler.cancelPresetSelection();
		AddSelection(target, Selector.Presets);
		console.log(`preset value: ${presets.value}`)
		$camPresets = presets;

		if (scrollAreaElement) {
			scrollAreaElement.scrollTop = scrollPosition;
		}

		setTimeout(updateButtonSizeRaw, 50);
	}

	function updateButtonSizeRaw() {
		if (scrollAreaElement) {
			buttonWidth = scrollAreaElement.getBoundingClientRect().width + 'px';
		} else {
			buttonWidth = "100%";
		}
	}

	var updateButtonSizeDebounced = _.debounce(updateButtonSizeRaw, 50, { 'leading': false, 'trailing': true })
	var updateButtonSizeThrottled = _.throttle(updateButtonSizeRaw, 30, { 'leading': false, 'trailing': true })

	function updateButtonSize() {
		updateButtonSizeThrottled();
		updateButtonSizeDebounced();
	}

	onMount(() => {
		updateButtonSizeRaw()
		window.addEventListener('resize', updateButtonSize);
		return () => {
			window.removeEventListener('resize', updateButtonSize);
		};
	});
</script>

{#if $camPresets.items.length != 0}
	<ScrollArea type="always" bind:el={scrollAreaElement} id="presets-menu-scroll" class="bg-[#1c1b22] d-block text-center px-3 py-2.5 mt-1 mb-auto mx-1 z-20 rounded shadow">
		<div id="presets-menu" class="w-100">
			<Subpresets bind:quicksendSelected bind:buttonWidth bind:preset={$camPresets.items} />
		</div>
		<div class="mt-2.5" />
	</ScrollArea>
{/if}

<style>
    #presets-menu {
		/* background-color: #1c1b22;
		overflow: scroll; */
		-ms-overflow-style: none;
		scrollbar-width: none;
	}

    #presets-menu:last-child {
   	 	margin-bottom: 0!important;
	}
</style>
