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

	const name = "doubleclick";

	let dot: Konva.Circle;

	$am.Actions[name] = {
		Name: name,
		TriggerConditions: {
			Active: new Set([
				States.StageDoubleClick,
				States.LeftMouseButtonPressed,
				States.OnePointer
			]),
			Inactive: new Set([
				States.CrossedZones
			]),
		},
		CancelConditions: {
			Active: new Set([
				States.CrossedZones
			]),
			Inactive: new Set([
				States.OnePointer
			]),
		},
		IsActive: false,
		Cancel: cancel,
		Enable: enable
	}

	function enable(this: Action, origin: Coordinates) {
		$stage.on('pointermove.doubleclick', handleDrag);
		$stage.on('pointerup.doubleclick', finshDrawing);
		ClearStage($stage);
		$am.Actions[name].IsActive = true;
	}

	function cancel(this: Action) {
		$stage.off('pointermove.doubleclick')
		$stage.off('pointerup.doubleclick')

		dot.hide();
		this.IsActive = false;
	}


	function writeCommand(target: Konva.Circle, reset: boolean = false) {
		let text = ClickTangle({
			X: target.x(),
			Y: target.y(),
			Width: 0,
			Height: 0,
			FrameWidth: $ifDimensions.width,
			FrameHeight: $ifDimensions.height
		}).command

		if ($commandText.startsWith("!ptzclick") && reset) {
			$commandText = `${text.split(" ").slice(0, -1).join(" ")} ${$clickZoom}`;
		} else {
			$commandText = text;
			$clickZoom = 100;
		}

	}

	// Throttle
	function handleDrag(e: Konva.KonvaPointerEvent) {
		$am.Actions[name].IsActive = true;
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
		$stage.off('pointermove.doubleclick')
		$stage.off('pointerup.doubleclick')

		let ifOverlay = jQuery('#overlay')[0].getBoundingClientRect();
		dot.position({
			x: (e.evt.clientX - ifOverlay.left) / $panzoom.getScale(),
			y: (e.evt.clientY - ifOverlay.top) / $panzoom.getScale()
		})
		
		writeCommand(dot);
		manufactureDot();
		dot.hide();

		$am.Actions[name].IsActive = false;
	}

	function manufactureDot() {
		let newDot = new Konva.Circle({
			x: dot.x(),
			y: dot.y(),
			name: "click",
			id: tangleID(),
			radius: 3,
			strokeScaleEnabled: false,
			fill: 'rgba(204, 55, 97, 1)',
			stroke: 'black',
			strokeWidth: 1,
			draggable: true,
			visible: true,
			listening: true,
			hitFunc: dotCustomHitbox
		});

		newDot.on("dragmove", (e: any) => {
			let mousePos = $stage.getPointerPosition();
			if (mousePos) {
				e.target.position({
					x: mousePos.x,
					y: mousePos.y,
				})
			}
		})

		newDot.on("dragend", (e: any) => {
			writeCommand(e.target as Konva.Circle, true);
		})

		dot.getLayer()?.add(newDot);
	}


	onMount(async () => {
		await tick();
		// dot.getLayer().toggleHitCanvas()
 	});

	function dotCustomHitbox(context: Konva.Context, shape: any) {
		var circle = shape as Konva.Circle;
		context.beginPath();
		context.arc(0, 0, circle.radius() * 2.5, 0, Math.PI * 2, true);
		context.closePath();
		context.fillStrokeShape(circle);
	}
</script>

<Circle 
	bind:handle={dot} 
	config={{
		x: 0,
		y: 0,
		radius: 3,
		strokeScaleEnabled: false,
		fill: 'rgba(204, 55, 97, 1)',
		stroke: 'black',
		strokeWidth: 1,
		draggable: false,
		visible: false,
		listening: false,
	}} 
/>
