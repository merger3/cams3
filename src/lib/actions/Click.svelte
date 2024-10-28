<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Konva from "konva";
	import { Circle } from "svelte-konva";
	import { am, commandText, ifDimensions, clickTimer, panzoom, clickZoom } from '$lib/stores';
	import type { Coordinates } from '$types';
	import { States, type Action } from '$lib/actions';
	import {  ClickTangle } from '$lib/rect';

	const name = "click";

	export let stage: Konva.Stage;
	let dot: Konva.Circle;
	let renderedDot: Konva.Circle;
	$am.Actions[name] = {
		Name: name,
		ActiveConditions: new Set([
			States.StagePointerDown,
			States.OnePointer,
			States.LeftMouseButtonPressed,
			States.ZoneHit
		]),
		InactiveConditions: new Set([
			States.StageDraggingBuffered
		]),
		MustCancel: ["draw"],
		IsActive: false,
		Cancel: cancel,
		Enable: enable
	}

	function enable(this: Action, origin: Coordinates) {
		if ($clickTimer) {
			clearTimeout($clickTimer);
		}
		if ($am.ActiveStates.has(States.StageDraggingDejittered)) {
			stage.on('pointermove.click', handleDrag);
		}
		stage.on('pointerup.click', finshDrawing);
	}

	function cancel(this: Action, mod = true) {
		if ($clickTimer) {
			clearTimeout($clickTimer);
		}
		stage.off('pointermove.click')
		stage.off('pointerup.click')

		dot.hide();
		if (mod) {
			renderedDot.hide();
		}
		this.IsActive = false;
	}


	function writeCommand() {
		$commandText = ClickTangle({
			X: renderedDot.x(),
			Y: renderedDot.y(),
			Width: 0,
			Height: 0,
			FrameWidth: $ifDimensions.width,
			FrameHeight: $ifDimensions.height
		}).command
		$clickZoom = 100;
	}

	function handleDrag(e: Konva.KonvaPointerEvent) {
		let mousePos = stage.getPointerPosition();
		if (mousePos) {
			$am.Actions[name].IsActive = true;
			dot.show();
			$am.Actions["draw"].Cancel(false)

			dot.position({
				x: mousePos.x,
				y: mousePos.y,
			})
		}
	}

	function finshDrawing(e: Konva.KonvaPointerEvent) {
		stage.off('pointermove.click')
		stage.off('pointerup.click')
		$clickTimer = setTimeout(() => {
			$am.Actions[name].IsActive = true;
			

			$am.Actions["draw"].Cancel();

			let ifOverlay = jQuery('#overlay')[0].getBoundingClientRect();
			renderedDot.position({
				x: (e.evt.clientX - ifOverlay.left) / $panzoom.getScale(),
				y: (e.evt.clientY - ifOverlay.top) / $panzoom.getScale()
			})

			dot.hide();
			renderedDot.show();

			writeCommand();
			$am.Actions[name].IsActive = false;
		}, 150);
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
<Circle 
	bind:handle={renderedDot} 
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
