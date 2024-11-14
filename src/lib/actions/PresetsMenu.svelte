<script lang="ts">
	import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
	import { createEventDispatcher, onMount, tick } from 'svelte';
	import type { CamPresets, Coordinates, Preset } from '$types';
	import { States, type Action } from '$lib/actions';
	import { am, ifDimensions, GetZone, GetCam, server, presetCache, zones, panzoom, presetsIsOpen, commandText, stage, ClearStage } from '$lib/stores';
	import { AddSelection, RemoveSelection, Selector, GetSelectedRect } from '$lib/zones';
	import SubPresetsMenu from './SubPresetsMenu.svelte';
	import type { KonvaPointerEvent } from "svelte-konva";
	import Konva from "konva";
	const dispatch = createEventDispatcher();
	
	let presets: CamPresets = {name: "", presets: []};
	let animationTimer: number;

	const name = "presetsmenu";
	$am.Actions[name] = {
		Name: name,
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
	function enable(this: Action, origin: Coordinates, cam: string = undefined) {
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
			loadMenu(e, origin, target, cam);
		};

		jQuery("#overlay")[0].addEventListener("pointerup", boundHandleClick);
		cancelled = false;
	}

	function cancel(this: Action) {
		removeClickListener();
		if ($presetsIsOpen) {
			$presetsIsOpen = false;
			animationTimer = setTimeout(() => {
				cancelled = true;
				presets = {name: "", presets: []};
				dataReady = false;
				$am.Actions[name].IsActive = false;
			}, 200);
			RemoveSelection(Selector.PresetMenu);
		} else {
			cancelled = true;
			presets = {name: "", presets: []};
			dataReady = false;
			$am.Actions[name].IsActive = false;
			RemoveSelection(Selector.PresetMenu);
		}
	}

	async function loadMenu(e: KonvaPointerEvent, coordinates: Coordinates, target: Konva.Rect, camName: string) {
		AddSelection(target, Selector.PresetMenu);
		
		if (!camName) {
			let cam = await GetCam({coordinates: coordinates, frameWidth: $ifDimensions.width, frameHeight: $ifDimensions.height, position: Number(target.name())}, $server)
			if (!cam.found) {
				$am.Actions[name].Cancel();
				return;
			}
			camName = cam.cam
		} 
		
		let cachedPresets = $presetCache[camName];
		if (!cachedPresets) {
			let response = await $server.post('/camera/presets', {camera: camName})
			if (response.data.found) {
				presets = response.data.camPresets;
				$presetCache[camName] = response.data.camPresets;
			} else {
				$presetCache[camName] = {name: camName, presets: []}
				$am.Actions[name].Cancel();
				return;
			}
		} else {
			presets = cachedPresets;
		}

		if (presets.presets.length == 0) {
			$am.Actions[name].Cancel();
			return;
		}

	
		let ifOverlay = jQuery('#overlay')[0].getBoundingClientRect();
		const rightClickEvent = new MouseEvent('contextmenu', {bubbles: true, cancelable: true, view: window, button: 2, buttons: 2, clientX: ((coordinates.x * $panzoom.getScale()) + ifOverlay.left), clientY: ((coordinates.y * $panzoom.getScale()) + ifOverlay.top)});
		
		dataReady = true;
		removeClickListener();
		await tick();
		jQuery('#presetsmenutrigger')[0].dispatchEvent(rightClickEvent);
	}

	function handleClick(cam: string, preset: string) {
		$commandText = `!ptzload ${cam} ${preset}`;
		ClearStage($stage)
	}

	function opc(open: boolean) {
		if (open) {
			dispatch("openmenu");
		} else {
			animationTimer = setTimeout(() => {
				presets = {name: "", presets: []};
				dataReady = false;
				$am.Actions[name].IsActive = false;
			}, 200);
			RemoveSelection(Selector.PresetMenu);
			removeClickListener();
		}
	}
</script>
   

<ContextMenu.Root bind:open={$presetsIsOpen} onOpenChange={opc} loop={true}>
	{#if $am.Actions[name].IsActive && dataReady && !cancelled}
		<ContextMenu.Trigger>
			<slot></slot>
		</ContextMenu.Trigger>

		<ContextMenu.Content class="w-[11rem] dark:bg-slate-800 max-w-screen overflow-scroll" fitViewport={true} overlap={true} >
			<SubPresetsMenu bind:cam={presets.name} bind:preset={presets.presets} />
		</ContextMenu.Content>
	{/if}
</ContextMenu.Root>
