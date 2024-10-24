<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Konva from "konva";
	import { Circle, Rect, Transformer } from "svelte-konva";
	import { am, commandText, ifDimensions } from '$lib/stores';
	import type { Coordinates } from '$types';
	import { States, type Action } from '$lib/actions';
	import {  ClickTangle } from '$lib/rect';

	const name = "click";

	export let stage: Konva.Stage;
	let dot: Konva.Circle;

	$am.Actions[name] = {
		Name: name,
		ActiveConditions: new Set([
			States.StagePointerDown,
			States.OnePointer,
			States.ZoneHit
		]),
		InactiveConditions: new Set([States.StageDraggingBuffered]),
		IsActive: false,
		Cancel: cancel,
		Enable: enable
	}

	function enable(this: Action, origin: Coordinates) {
		for (let [name, action] of Object.entries($am.Actions)) {
			if (name != this.Name) {
				action.Cancel();
			}
		}
		dot.position({
			x: origin.x,
			y: origin.y
		})

		dot.show();

		stage.on('pointermove.click', handleDrag);
		stage.on('pointerup.click', finshDrawing);

		this.IsActive = true;
	}

	function cancel(this: Action) {
		stage.off('pointermove.click')
		stage.off('pointerup.click')

		dot.hide();
		this.IsActive = false;
	}


	function writeCommand() {
		let ifOverlay = jQuery('#overlay')[0].getBoundingClientRect();
		$commandText = ClickTangle({
			X: dot.x() - ifOverlay.left,
			Y: dot.y() - ifOverlay.top,
			Width: 0,
			Height: 0,
			FrameWidth: $ifDimensions.width,
			FrameHeight: $ifDimensions.height
		}).command
	}

	function handleDrag(e: Konva.KonvaPointerEvent) {
		let mousePos = stage.getPointerPosition();
		if (mousePos) {
			dot.position({
				x: mousePos.x,
				y: mousePos.y,
			})
		}
	}

	function finshDrawing(e: Konva.KonvaPointerEvent) {
		stage.off('pointermove.click')
		stage.off('pointerup.click')

		$am.Actions[name].IsActive = false;
		writeCommand();
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