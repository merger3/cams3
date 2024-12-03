<script lang="ts">
	import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
	import { createEventDispatcher, onMount, tick, setContext, getContext } from 'svelte';
	import { get, writable } from 'svelte/store';
	import type { SwapResponse, Coordinates, MenuItem, CamPresets } from '$types';
	import { States, type Action } from '$lib/actions';
	import { am, ifDimensions, GetZone, GetCam, server, presetMenuCache, zones, panzoom, menuIsOpen, commandText, GetSwaps } from '$lib/stores';
	import SwapMenu from "$lib/actions/contextmenus/SwapMenu.svelte";
	import PresetsMenu from '$lib/actions/contextmenus/PresetsMenu.svelte';
	import { AddSelection, RemoveSelection, Selector, GetSelectedRect } from '$lib/zones';
	import type { KonvaPointerEvent } from "svelte-konva";
	import Konva from "konva";
	import {  ClickTangle } from '$lib/rect';
	import ZoomMenu from "./contextmenus/ZoomMenu.svelte";
	const dispatch = createEventDispatcher();

	const defaultCMD: string = "​";
	const swapRegEx = new RegExp('^\!swap ([a-zA-Z0-9_]{2,}) ([a-zA-Z0-9_]{2,})$');

	let items: MenuItem = {value: "", items: []};
	let animationTimer: number;

	const swapMenuName = "swaps";
	$am.Actions[swapMenuName] = {
		Name: swapMenuName,
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
		Enable: function(origin: Coordinates, cam: string = undefined) {enable(this, origin, cam)},
		Cancel: cancel
	}

	const presetMenuName = "presetsmenu";
	$am.Actions[presetMenuName] = {
		Name: presetMenuName,
		TriggerConditions: {
			Active: new Set([
				States.NegativeSentinel
			]),
			Inactive: new Set([
				States.PositiveSentinel
			]),
		},
		CancelConditions: {
			Active: new Set(),
			Inactive: new Set(),
		},
		IsActive: false,
		Enable: function(origin: Coordinates, cam: string = undefined) {enable(this, origin, cam)},
		Cancel: cancel
	}

	const zoomMenuName = "zoommenu";
	$am.Actions[zoomMenuName] = {
		Name: zoomMenuName,
		TriggerConditions: {
			Active: new Set([
				States.NegativeSentinel
			]),
			Inactive: new Set([
				States.PositiveSentinel
			]),
		},
		CancelConditions: {
			Active: new Set(),
			Inactive: new Set(),
		},
		IsActive: false,
		Enable: function(origin: Coordinates, cam: Coordinates = undefined) {enable(this, origin, cam)},
		Cancel: cancel
	}


	let boundHandleClick: any;
	function removeClickListener() {
		if (boundHandleClick) {
			jQuery("#overlay")[0].removeEventListener("pointerup", boundHandleClick);
			boundHandleClick = null;
		}
	}

	let dataReady: boolean = false;
	let currentAction: Action;
	let cancelled: boolean = true;
	function enable(action: Action, origin: Coordinates, cam: any = undefined) {
		if ($am.Actions["mousePan"] && $am.Actions["mousePan"].IsActive) {
			return;
		}
		
		currentAction = action;
		action.IsActive = true;
		let target = GetSelectedRect(Selector.Radial);
		if (!target) {
			target = GetZone($zones, origin);
			if (!target) {
				action.Cancel();
				return;
			}
		}
		
		switch (action.Name) {
			case swapMenuName:
				boundHandleClick = function (e: any) {loadSwapMenu(e, origin, target);};
				break;
			case presetMenuName:
				boundHandleClick = function (e: any) {loadPresetsMenu(e, origin, target, typeof cam == "string" ? cam : undefined);};
				break;
			case zoomMenuName:
				boundHandleClick = function (e: any) {loadZoomMenu(e, origin, target, cam);};
				break;
			default:
				boundHandleClick = null;
				return;
		}

		jQuery("#overlay")[0].addEventListener("pointerup", boundHandleClick);
		cancelled = false;
	}


	function clearSelector(target: string) {
		switch (target) {
			case swapMenuName:
				RemoveSelection(Selector.ContexMenu);
				break;
			case presetMenuName:
				RemoveSelection(Selector.PresetMenu);
				break;
			case zoomMenuName:
				// Add zoom menu selector
				break;
			default:
				return;
		}
	}

	function deactivateAll() {
		$am.Actions[swapMenuName].IsActive = false;
		$am.Actions[presetMenuName].IsActive = false;
		$am.Actions[zoomMenuName].IsActive = false;
	}

	async function openMenu(coordinates: Coordinates) {
		let ifOverlay = jQuery('#overlay')[0].getBoundingClientRect();
		const rightClickEvent = new MouseEvent('contextmenu', {bubbles: true, cancelable: true, view: window, button: 2, buttons: 2, clientX: ((coordinates.x * $panzoom.getScale())+ ifOverlay.left), clientY: ((coordinates.y * $panzoom.getScale()) + ifOverlay.top)});
		
		dataReady = true;
		removeClickListener();
		await tick();
		jQuery('#menutrigger')[0].dispatchEvent(rightClickEvent);
	}

	async function loadSwapMenu(e: KonvaPointerEvent, coordinates: Coordinates, target: Konva.Rect) {
		AddSelection(target, Selector.ContexMenu);
		let cam = await GetCam({coordinates: coordinates, frameWidth: $ifDimensions.width, frameHeight: $ifDimensions.height, position: Number(target.name())}, $server)
		if (!cam.found) {
			$am.Actions[swapMenuName].Cancel();
			return;
		}
		let name: string = cam.cam;

		items = await GetSwaps(name);
		if (!items) {
			$am.Actions[swapMenuName].Cancel();
			return;
		}

		openMenu(coordinates);
	}

	async function loadPresetsMenu(e: KonvaPointerEvent, coordinates: Coordinates, target: Konva.Rect, name: string) {
		AddSelection(target, Selector.PresetMenu);
		if (!name) {
			let cam = await GetCam({coordinates: coordinates, frameWidth: $ifDimensions.width, frameHeight: $ifDimensions.height, position: Number(target.name())}, $server)
			if (!cam.found) {
				$am.Actions[presetMenuName].Cancel();
				return;
			}
			name = cam.cam
		} 
		
		let cachedPresets = $presetMenuCache[name];
		if (!cachedPresets) {
			let response = await $server.post('/camera/presets/menus', {camera: name})
			if (response.data.found) {
				items = response.data.camPresets;
				$presetMenuCache[name] = items as CamPresets;
			} else {
				$presetMenuCache[name] = {value: name, items: []}
				$am.Actions[presetMenuName].Cancel();
				return;
			}
		} else {
			items = cachedPresets;
		}

		if (items.items.length == 0) {
			$am.Actions[presetMenuName].Cancel();
			return;
		}

		openMenu(coordinates);
	}

	let position: Coordinates
	async function loadZoomMenu(e: KonvaPointerEvent, coordinates: Coordinates, target: Konva.Rect, pos: Coordinates) {
		items = {value: "zoon", items: [
			{value: "0", items: []},
			{value: "10", items: []},
			{value: "20", items: []},
			{value: "30", items: []},
			{value: "40", items: []},
			{value: "50", items: []},
			{value: "60", items: []},
			{value: "70", items: []},
			{value: "80", items: []},
			{value: "90", items: []},
			{value: "150", items: []},
			{value: "200", items: []},
			{value: "300", items: []},
			{value: "Max", items: []}
		]}

		let unscaledPosition = pos ? pos : coordinates;
		let scaledPosition = ClickTangle({
			X: unscaledPosition.x,
			Y: unscaledPosition.y,
			Width: 0,
			Height: 0,
			FrameWidth: $ifDimensions.width,
			FrameHeight: $ifDimensions.height
		})
		
		position = {x: Number(scaledPosition.x), y: Number(scaledPosition.y)}
		openMenu(coordinates);
	}

	function cancel(this: Action) {
		removeClickListener();
		if ($menuIsOpen) {
			$menuIsOpen = false;
			animationTimer = setTimeout(() => {
				cancelled = true;
			}, 200);
		} else {
			cancelled = true;
			items = undefined;
			dataReady = false;
			deactivateAll();
			clearSelector(this.Name);
			currentAction = undefined;
		}
	}

	function opc(open: boolean) {
		if (open) {
			dispatch("openmenu");
		} else {
			if (!swapRegEx.exec($commandText)) {
				if (currentAction) {
					clearSelector(currentAction.Name);
				}
			} 
			animationTimer = setTimeout(() => {
				items = undefined;
				dataReady = false;
				deactivateAll();
				currentAction = undefined;
			}, 200);
			removeClickListener();
		}
	}
</script>


<ContextMenu.Root bind:open={$menuIsOpen} onOpenChange={opc} loop={true}>
	{#if (currentAction && currentAction.IsActive) && dataReady && !cancelled}
		<ContextMenu.Trigger>
			<slot></slot>
		</ContextMenu.Trigger>

		{#if currentAction.Name == swapMenuName}
			<ContextMenu.Content class="w-52 dark:bg-slate-800 max-w-screen overflow-scroll" fitViewport={true} overlap={true} >
				<SwapMenu items={items.items} cam={items.value} on:sendcmd={() => dispatch("sendcmd")}/>
			</ContextMenu.Content>
		{:else if currentAction.Name == presetMenuName}
			<ContextMenu.Content class="w-[11rem] dark:bg-slate-800 max-w-screen overflow-scroll" fitViewport={true} overlap={true} >
				<PresetsMenu items={items.items} cam={items.value} on:sendcmd={() => dispatch("sendcmd")}/>
			</ContextMenu.Content>
		{:else if currentAction.Name == zoomMenuName}
			<ContextMenu.Content class="w-[2rem] dark:bg-slate-800 max-w-screen overflow-scroll" fitViewport={true} overlap={true} >
				<ZoomMenu items={items.items} cam={items.value} bind:position on:sendcmd={() => dispatch("sendcmd")}/>
			</ContextMenu.Content>
		{/if}
	{/if}
</ContextMenu.Root>