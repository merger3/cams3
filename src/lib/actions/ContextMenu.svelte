<script lang="ts">
	import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
	import { createEventDispatcher, onMount, tick } from 'svelte';
	import type { SwapResponse, Coordinates } from '$types';
	import { States, type Action } from '$lib/actions';
	import { am, ifDimensions, GetZone, GetCam, server, swapsCache, zones, panzoom, swapsIsOpen, commandText } from '$lib/stores';
	import SubContextMenu from '$lib/actions/SubContextMenu.svelte';
	import { AddSelection, RemoveSelection, Selector, GetSelectedRect } from '$lib/zones';
	import type { KonvaPointerEvent } from "svelte-konva";
	import Konva from "konva";
	const dispatch = createEventDispatcher();
	
	const defaultCMD: string = "​";

	let topEntry: SwapResponse = {found: false, cam: "", position: 0, swaps: {label: "", subentries: []}};
	let animationTimer: number;

	const name = "swaps";
	$am.Actions[name] = {
		Name: name,
		TriggerConditions: {
			Active: new Set([
				States.OnePointer,
				States.RightMouseButtonPressed,
				States.ClickedZone
			]),
			Inactive: new Set([
				States.StageDraggingDejittered
			]),
		},
		CancelConditions: {
			Active: new Set([
				States.MiddleMouseButtonPressed,
				States.StageDraggingDejittered
			]),
			Inactive: new Set(),
		},
		IsActive: false,
		Enable: enable,
		Cancel: cancel
	}


	let boundHandleClick: any;
	function removeClickListener() {
    if (boundHandleClick) {
		jQuery("#overlay")[0].removeEventListener("pointerup",boundHandleClick);
        boundHandleClick = null;
    }
}
	let dataReady: boolean = false;
	let cancelled: boolean = true;
	function enable(this: Action, origin: Coordinates) {
		if ($am.Actions["mousePan"] && $am.Actions["mousePan"].IsActive) {
			return;
		}

		$am.Actions[name].IsActive = true;
		let target = GetSelectedRect(Selector.Radial);
		if (!target) {
			target = GetZone($zones, origin);
			if (!target) {
				$am.Actions[name].Cancel();
				return;
			}
		}
		
		boundHandleClick = function (e: any) {
			loadMenu(e, origin, target);
		};

		jQuery("#overlay")[0].addEventListener("pointerup", boundHandleClick);
		cancelled = false;
	}

	function cancel(this: Action) {
		removeClickListener();
		if ($swapsIsOpen) {
			$swapsIsOpen = false;
			animationTimer = setTimeout(() => {
				cancelled = true;
				topEntry = {found: false, cam: "", position: 0, swaps: {label: "", subentries: []}};
				dataReady = false;
				$am.Actions[name].IsActive = false;
			}, 200);
			RemoveSelection(Selector.ContexMenu);
		} else {
			cancelled = true;
			topEntry = {found: false, cam: "", position: 0, swaps: {label: "", subentries: []}};
			dataReady = false;
			$am.Actions[name].IsActive = false;
			RemoveSelection(Selector.ContexMenu);
		}

	}

	async function loadMenu(e: KonvaPointerEvent, coordinates: Coordinates, target: Konva.Rect) {
		AddSelection(target, Selector.ContexMenu);
		let cam = await GetCam({coordinates: coordinates, frameWidth: $ifDimensions.width, frameHeight: $ifDimensions.height, position: Number(target.name())}, $server)
		if (!cam.found) {
			$am.Actions[name].Cancel();
			return;
		}

		let swaps = $swapsCache[cam.cam]

		if (!swaps) {
			let response = await $server.post('/camera/swaps', {camera: cam.cam});
			swaps = response.data;
			if (!swaps.found || !swaps.swaps.subentries) {
				$am.Actions[name].Cancel();
				return;
			} else {
				swaps.position = Number(target.name());
				$swapsCache[cam.cam] = swaps;
			}
		}
		
		topEntry = swaps;
		
		
		let ifOverlay = jQuery('#overlay')[0].getBoundingClientRect();
		const rightClickEvent = new MouseEvent('contextmenu', {bubbles: true, cancelable: true, view: window, button: 2, buttons: 2, clientX: ((coordinates.x * $panzoom.getScale())+ ifOverlay.left), clientY: ((coordinates.y * $panzoom.getScale()) + ifOverlay.top)});
		
		dataReady = true;
		removeClickListener();
		await tick();
		jQuery('#menutrigger')[0].dispatchEvent(rightClickEvent);
	}

	function opc(open: boolean) {
		if (open) {
			dispatch("openmenu");
		} else {
			animationTimer = setTimeout(() => {
				topEntry = {found: false, cam: "", position: 0, swaps: {label: "", subentries: []}};
				dataReady = false;
				$am.Actions[name].IsActive = false;
			}, 200);
			if ($commandText == defaultCMD) {
				RemoveSelection(Selector.ContexMenu);
			} 
			removeClickListener();
		}
	}
</script>
   

<ContextMenu.Root bind:open={$swapsIsOpen} onOpenChange={opc} loop={true}>
	{#if $am.Actions[name].IsActive && dataReady && !cancelled}
		<ContextMenu.Trigger>
			<slot></slot>
		</ContextMenu.Trigger>

		<ContextMenu.Content class="w-52 dark:bg-slate-800 max-w-screen overflow-scroll" fitViewport={true} overlap={true} >
			<SubContextMenu entries={topEntry.swaps.subentries} cam={{cam: topEntry.cam, position: topEntry.position, found: true, swaps: {label: "", subentries: []}}} />
		</ContextMenu.Content>
	{/if}
</ContextMenu.Root>
	