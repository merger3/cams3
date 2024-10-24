<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Konva from "konva";
	import { Circle, Rect, Transformer } from "svelte-konva";
	import { am, commandText, ifDimensions } from '$lib/stores';
	import type { Coordinates } from '$types';
	import { States, type Action } from '$lib/actions';
	import {  DrawTangle } from '$lib/rect';

	const name = "draw";

	export let stage: Konva.Stage;
	let tangle: Konva.Rect;
	let dot: Konva.Circle;
	let transformer: Konva.Transformer;

	$am.Actions[name] = {
		Name: name,
		ActiveConditions: new Set([
			States.StagePointerDown,
			States.OnePointer,
			States.ZoneHit,
			States.StageDraggingBuffered
		]),
		InactiveConditions: new Set(),
		IsActive: false,
		Cancel: cancel,
		Enable: enable
	}

	function enable(this: Action, origin: Coordinates) {
		transformer.nodes([]);
		tangle.size({
			height: 0,
			width: 0
		})
		tangle.position({
			x: origin.x,
			y: origin.y
		})

		dot.position({
			x: (tangle.x() + (tangle.width() / 2)),
			y: (tangle.y() + (tangle.height() / 2)),
		})

		tangle.listening(false);
		tangle.show();
		dot.show();
		dot.moveToTop();

		stage.on('pointermove.draw', handleDrag);
		stage.on('pointerup.draw', finshDrawing);

		
		this.IsActive = true;
	}

	function cancel(this: Action) {
		stage.off('pointermove.draw')
		stage.off('pointerup.draw')
		tangle.listening(false);
		transformer.nodes([]);
		tangle.hide();
		dot.hide();
		this.IsActive = false;
	}


	function writeCommand() {
		let ifOverlay = jQuery('#overlay')[0].getBoundingClientRect();
		$commandText = DrawTangle({
			X: tangle.x() - ifOverlay.left,
			Y: tangle.y() - ifOverlay.top,
			Width: tangle.width(),
			Height: tangle.height(),
			FrameWidth: $ifDimensions.width,
			FrameHeight: $ifDimensions.height
		}).command
	}

	function handleDrag(e: Konva.KonvaPointerEvent) {
		let mousePos = stage.getPointerPosition();
		if (mousePos) {
			tangle.size({
				width: (mousePos.x - tangle.x()),
				height: (mousePos.y - tangle.y())
			})
			dot.position({
				x: (tangle.x() + (tangle.width() / 2)),
				y: (tangle.y() + (tangle.height() / 2)),
			})
		}
	}

	function finshDrawing(e: Konva.KonvaPointerEvent) {
		stage.off('pointermove.draw')
		stage.off('pointerup.draw')

		if (tangle.width() < 0) {
			tangle.x(tangle.x() + tangle.width())
			tangle.width(Math.abs(tangle.width()))
		}
		if (tangle.height() < 0) {
			tangle.y(tangle.y() + tangle.height()) 
			tangle.height(Math.abs(tangle.height()))
		}

		transformer.nodes([tangle]);
		transformer.anchorSize(Math.max(Math.min((transformer?.width() / 6), 15), 3))
		tangle.listening(true);
		$am.Actions[name].IsActive = false;

		writeCommand();
	}

	function handleTangleDrag(e: any) {
		dot.position({
			x: (tangle.x() + (tangle.width() / 2)),
			y: (tangle.y() + (tangle.height() / 2)),
		})
	}

	function endTangleDrag(e: any) {
		dot.position({
			x: (tangle.x() + (tangle.width() / 2)),
			y: (tangle.y() + (tangle.height() / 2)),
		})
		
		writeCommand();
	}

	function handleTransform() {
		tangle.setAttrs({
			width: tangle.width() * tangle.scaleX(),
			height: tangle.height() * tangle.scaleY(),
			scaleX: 1,
			scaleY: 1,
		});

		dot.position({
			x: (tangle.x() + (tangle.width() / 2)),
			y: (tangle.y() + (tangle.height() / 2)),
		})

		transformer.anchorSize(Math.max(Math.min((transformer?.width() / 6), 15), 3))
	}

	function handleTransformEnd() {
		tangle.setAttrs({
			width: tangle.width() * tangle.scaleX(),
			height: tangle.height() * tangle.scaleY(),
			scaleX: 1,
			scaleY: 1,
		});

		writeCommand();
	}

	onMount(async () => {
		await tick();
 	});

</script>

<Rect 
	bind:handle={tangle} 
	  config={{
		x: 0,
		y: 0,
		width: 0,
		height: 0,
		fill: 'rgba(250, 128, 114, 0.3)',
		stroke: 'rgba(255, 0, 0, 0.5)',
		strokeWidth: 1.5,
		strokeScaleEnabled: false,
		draggable: true,
		visible: false,
		listening: false
	}} 
	on:dragmove={handleTangleDrag}
	on:dragend={endTangleDrag}
	on:transform={handleTransform}
	on:transformend={handleTransformEnd}
/>
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
<Transformer bind:handle={transformer} on:transformend={handleTransformEnd} config={{
	keepRatio: false,
	anchorSize: Math.max(Math.min((transformer?.width() / 6), 15), 3),
	rotateEnabled: false,
	borderEnabled: false,
	ignoreStroke: true,
	shouldOverdrawWholeArea: true,
	flipEnabled: false,	
	anchorStyleFunc: function (anchor) {
		anchor.fill('rgba(138, 219, 207, .5)');
		anchor.cornerRadius(anchor.width() / 2);
	}}} />