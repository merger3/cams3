<script lang="ts">
	import { ScrollArea } from "$lib/components/ui/scroll-area";
	import * as Tabs from "$lib/components/ui/tabs/index.js";
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
	let activeTab: string = "main"; 
	
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
		console.log(cam)
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
				presets = cachedPresets;
			}
		} else {
			$am.Actions[name].Cancel();
			return;
		}

		console.log(presets)
		
		let scrollPosition: number = 0;
		if (scrollAreaElement) {
			if ($camPresets.value != "" && $camPresets.items.length != 0) {
				if (!$scrollMemory[$camPresets.value]) {
					$scrollMemory[$camPresets.value] = {cam: $camPresets.value, tab: activeTab, tabs: {}}
				} else {
					$scrollMemory[$camPresets.value].tab = activeTab
				}
				$scrollMemory[$camPresets.value].tabs[activeTab] = scrollAreaElement.scrollTop
				console.log(`Stored scroll position for ${$camPresets.value} as ${scrollAreaElement.scrollTop}`);
				scrollPosition = $scrollMemory[cam.cam] && $scrollMemory[cam.cam].tabs[$scrollMemory[cam.cam].tab] && $camPresets.value != cam.cam ? $scrollMemory[cam.cam].tabs[$scrollMemory[cam.cam].tab] : 0;
				console.log(`Loaded scroll position for ${cam.cam} as ${scrollPosition}`);
			}
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
		$camPresets = presets;

		if (scrollAreaElement && $camPresets.items.length != 0) {
			let cam = $camPresets.value;
			if (!$scrollMemory[cam]) {
				$scrollMemory[cam] = {cam: cam, tab: activeTab, tabs: {}}
				$scrollMemory[cam].tabs[activeTab] = 0;
			}
			activeTab = $scrollMemory[cam].tab // make this so it doesn't always have to be main
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

	function updateTabScrollPosition(value: string) {
		if (scrollAreaElement) {
			let cam = $camPresets.value;
			console.log("$camPresets")
			console.log($camPresets)
			console.log($scrollMemory[cam])
			if (!$scrollMemory[cam]) {
				$scrollMemory[cam] = {cam: cam, tab: value, tabs: {}}
				$scrollMemory[cam].tabs[value] = 0;
			} else {
				$scrollMemory[cam].tabs[$scrollMemory[cam].tab] = scrollAreaElement.scrollTop;
				scrollAreaElement.scrollTop = $scrollMemory[cam].tabs[value] ?? 0;
				$scrollMemory[cam].tab = value;
			}
		}
	}

	function jumpToTopTab(tab: string) {
		let cam = $camPresets.value;
		if ($scrollMemory[cam].tab == tab) {
			scrollAreaElement.scrollTop = 0;
			$scrollMemory[cam].tabs[tab] = 0;
		}
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
	<ScrollArea type="always" bind:el={scrollAreaElement} id="presets-menu-scroll" class="bg-[#1c1b22] d-block text-center px-3 py-2.5 mt-1 mb-auto mx-1 z-20 rounded shadow max-h-full">
		<Tabs.Root bind:value={activeTab} onValueChange={updateTabScrollPosition} class="w-100">
			<Tabs.List class="grid w-full grid-cols-2 w-100 ms-.5 me-0 sticky top-0 z-50">
				{#each $camPresets.items as t}
					<Tabs.Trigger value={t.tab} on:click={() => jumpToTopTab(t.tab)}>{t.tab}</Tabs.Trigger>
				{/each}	
			</Tabs.List>
			{#each $camPresets.items as t}
				<Tabs.Content value={t.tab} class="m-0">
					<div id="presets-menu" class="w-100">
						<Subpresets bind:quicksendSelected bind:buttonWidth bind:preset={t.buttons} />
					</div>
					<div class="mt-2.5" />
				</Tabs.Content>
			{/each}	
		</Tabs.Root>
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
