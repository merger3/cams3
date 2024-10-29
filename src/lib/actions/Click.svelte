<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Konva from "konva";
	import { Circle } from "svelte-konva";
	import { am, commandText, ifDimensions, clickTimer, panzoom, clickZoom, stage, ClearStage } from '$lib/stores';
	import type { Coordinates } from '$types';
	import { States, type Action } from '$lib/actions';
	import {  ClickTangle } from '$lib/rect';
	import { customAlphabet } from 'nanoid';
	const tangleID = customAlphabet('0123456789abcdef', 5);

	const name = "click";

	let dot: Konva.Circle;

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

	function enable(this: Action, origin: Coordinates) {
		if ($clickTimer) {
			clearTimeout($clickTimer);
		}
		if ($am.ActiveStates.has(States.StageDraggingDejittered)) {
			$stage.on('pointermove.click', handleDrag);
		}
		$stage.on('pointerup.click', finshDrawing);
		$am.Actions[name].IsActive = true;
	}

	function cancel(this: Action) {
		if ($clickTimer) {
			clearTimeout($clickTimer);
		}
		$stage.off('pointermove.click')
		$stage.off('pointerup.click')

		dot.hide();
		this.IsActive = false;
	}


	function writeCommand() {
		$commandText = ClickTangle({
			X: dot.x(),
			Y: dot.y(),
			Width: 0,
			Height: 0,
			FrameWidth: $ifDimensions.width,
			FrameHeight: $ifDimensions.height
		}).command
		$clickZoom = 100;
	}

	// Throttle
	function handleDrag(e: Konva.KonvaPointerEvent) {
		let mousePos = $stage.getPointerPosition();
		if (mousePos) {
			dot.show();

			dot.position({
				x: mousePos.x,
				y: mousePos.y,
			})
		}
	}

	function finshDrawing(e: Konva.KonvaPointerEvent) {
		$stage.off('pointermove.click')
		$stage.off('pointerup.click')
		$clickTimer = setTimeout(() => {
			
			ClearStage($stage);

			let ifOverlay = jQuery('#overlay')[0].getBoundingClientRect();
			dot.position({
				x: (e.evt.clientX - ifOverlay.left) / $panzoom.getScale(),
				y: (e.evt.clientY - ifOverlay.top) / $panzoom.getScale()
			})
			
			writeCommand();
			manufactureDot();
			
			dot.hide();
			$am.Actions[name].IsActive = false;
		}, 200);
	}

	function manufactureDot() {
		let newDot = new Konva.Circle({
			x: dot.x(),
			y: dot.y(),
			name: "click",
			id: tangleID(),
			radius: 2,
			strokeScaleEnabled: false,
			fill: 'black',
			draggable: false,
			visible: true,
			listening: false
		});

		dot.getLayer()?.add(newDot);
	}


	onMount(async () => {
		await tick();
 	});

</script>

<Circle 
	bind:handle={dot} 
	config={{
		x: 0,
		y: 0,
		radius: 2,
		strokeScaleEnabled: false,
		fill: 'black',
		draggable: false,
		visible: false,
		listening: false
	}} 
/>
