<script lang="ts">
	import { ScrollArea } from "$lib/components/ui/scroll-area";
	import * as Tabs from "$lib/components/ui/tabs/index.js";
	import { onMount, afterUpdate, createEventDispatcher, onDestroy, tick } from 'svelte';
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
		
		let scrollPosition: number = 0;
		if (scrollAreaElement) {
			if ($camPresets.value != "" && $camPresets.items.length != 0) {
				updateScrollState($camPresets.value, activeTab, scrollAreaElement.scrollTop);
			}
			buttonWidth = scrollAreaElement.getBoundingClientRect().width + 'px';
		} else {
			buttonWidth = "100%";
		}

		if (presets.items.length > 0) {
			loadButtons(target, {value: presets.value, items: [...presets.items.slice(1), presets.items[0]]}, scrollPosition)
		} else {
			loadButtons(target, presets, scrollPosition)
		}
		$am.Actions[name].IsActive = false;
	}

	function updateScrollState(cam: string, tab: string, scrollPos: number) {
		if (!$scrollMemory[cam]) {
			$scrollMemory[cam] = {cam: cam, tab: activeTab, tabs: {}};
		}
		$scrollMemory[cam].tab = tab;
		$scrollMemory[cam].tabs[tab] = scrollPos;
	}


	function loadButtons(target: Konva.Rect, presets: CamPresets, scrollPosition: number) {
		$keyboardHandler.cancelPresetSelection();
		AddSelection(target, Selector.Presets);
		$camPresets = presets;

			let cam = $camPresets.value;
			if (!$scrollMemory[cam]) {
				let newTab = "main";
				if ($camPresets.items.length != 0) {
					newTab
				}
				// $scrollMemory[cam] = {cam: cam, tab: $camPresets.items.length != 0 ? $camPresets.items[0].tab : "main", tabs: {}};
				$scrollMemory[cam] = {cam: cam, tab: $camPresets.items.length != 0 ? $camPresets.items[$camPresets.items.length-1].tab : "main", tabs: {}};
				$scrollMemory[cam].tabs[activeTab] = 0;
			}

			let scrollState = $scrollMemory[cam];
			tick().then(() => {
				if (scrollAreaElement) {
					tick().then(() => {
						activeTab = scrollState.tab // make this so it doesn't always have to be main
					});
					tick().then(() => {
						scrollAreaElement.scrollTop = scrollState.tabs[scrollState.tab];
					});
				}

				setTimeout(updateButtonSizeRaw, 20);
			});
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
			let cam = $camPresets.value;
			if ($scrollMemory[cam].tabs[value]) {
				scrollAreaElement.scrollTop = $scrollMemory[cam].tabs[value];
			} else {
				scrollAreaElement.scrollTop = 0;
			}
			$scrollMemory[cam].tab = value;
			$scrollMemory[cam].tabs[value] = scrollAreaElement.scrollTop;
	}

	function jumpToTopTab(tab: string) {
		let cam = $camPresets.value;
		if ($scrollMemory[cam].tab == tab) {
			scrollAreaElement.scrollTop = 0;
			$scrollMemory[cam].tabs[tab] = 0;
		} else {
			tick().then(() => {
				updateTabScrollPosition(activeTab);
			});
		}
		
	}

	function* repeat(count: number): Generator<number> {
		for (let i = 0; i < count; i++) yield i;
	}

	function updateScrollPositon(e: any) {
		$scrollMemory[$camPresets.value].tabs[activeTab] = scrollAreaElement.scrollTop
	}
	var updateScrollPositonDebounced = _.debounce(updateScrollPositon, 100, { 'leading': false, 'trailing': true });




	$: if (scrollAreaElement) {
		scrollAreaElement.addEventListener('scroll', updateScrollPositonDebounced);
	}
	onMount(() => {
		updateButtonSizeRaw()

		// scrollAreaElement.addEventListener("scroll", updateScrollPositon);
		window.addEventListener('resize', updateButtonSize);
		return () => {
			window.removeEventListener('resize', updateButtonSize);
		};
	});

	onDestroy(() => {
		if (scrollAreaElement) {
		scrollAreaElement.removeEventListener('scroll', updateScrollPositonDebounced);
		}
	});

	function generateGrid(items: any[]): any[] {
		let i = 0;
		while (i < items.length) {
			let slice: any[] = [];
			let breakpoint = Math.min(3, items.length - i);
			for (let j = 0; j < breakpoint; j++) {
				slice.push(items[j + i])
				
			}
			i += breakpoint;
			console.log(`slice length: ${slice.length}`)
			for (let item of slice) {
				item.cols = Math.round(12 / slice.length); 
			}
		}
		
		return items;
	}

</script>

{#if $camPresets.items.length != 0}
	<ScrollArea type="always" bind:el={scrollAreaElement} id="presets-menu-scroll" class="bg-[#1c1b22] d-block text-center px-3 py-1 mt-0 mb-auto mx-1 z-20 rounded shadow max-h-full">
		<Tabs.Root bind:value={activeTab} class="w-100">
			<Tabs.List class="grid w-100 h-100 ms-.5 me-0 mb-1 mt-0 sticky top-0 z-50" style="--bs-gap: .2rem;">
				{#each generateGrid($camPresets.items) as t}
					<Tabs.Trigger class="border border-solid g-col-{t.cols}" value={t.tab} on:click={() => jumpToTopTab(t.tab)}>{t.tab}</Tabs.Trigger>
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
