<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Konva from "konva";
	import { Arrow } from "svelte-konva";
	import { am, commandText, ifDimensions, GetZone, GrowZone, ResetZone } from '$lib/stores';
	import type { Coordinates } from '$types';
	import { States, type Action } from '$lib/actions';
	import {  DrawTangle } from '$lib/rect';

	const name = "swapPosition";

	export let stage: Konva.Stage;
	let arrow: Konva.Arrow;


	$am.Actions[name] = {
		Name: name,
		ActiveConditions: new Set([
			States.StagePointerDown,
			States.OnePointer,
			States.PointerAdded,
			States.LeftMouseButtonPressed,
			States.ZoneHit,
			States.StageDraggingBuffered,
		]),
		InactiveConditions: new Set([
			States.TwoPointers,
			States.ThreePointers,
			States.OverThreePointers
		]),
		MustCancel: [],
		IsActive: false,
		Cancel: cancel,
		Enable: enable
	}

	let children: any;
	let layer: Konva.Layer;

	let startZone: Konva.Rect | null;
	function enable(this: Action, origin: Coordinates) {
		// Optimization for GetZone in places that call it a lot
		layer = stage.findOne('#mainlayer') as Konva.Layer;
		children = layer.getChildren(function(node){
			return node.id() != "zones" && node.listening();
		});

		startZone = GetZone(origin, stage, layer, children);
		if (!startZone) {
			return;
		}
		
		GrowZone(stage, startZone);

		//  [(clickedShape!.x() + (clickedShape!.width() / 2)), (clickedShape!.y() + (clickedShape!.height() / 2))]
		// arrow.points(arrow.points().splice(0, 2).concat([mousePos!.x, mousePos!.y]));


		arrow.points([(startZone.x() + (startZone.width() / 2)), (startZone.y() + (startZone.height() / 2))])


		stage.on('pointermove.arrow', handleDrag);
		stage.on('pointerup.arrow', finshDrawing);

		
		this.IsActive = true;
	}

	function cancel(this: Action, mod = true) {
		console.log("cancelling arrow")
		stage.off('pointermove.arrow');
		stage.off('pointerup.arrow');
		arrow.listening(false);
		arrow.hide();
		if (mod && startZone != null) {
			ResetZone(stage, startZone);		
		}
		this.IsActive = false;
	}

	function handleDrag(e: Konva.KonvaPointerEvent) {
		let mousePos = stage.getPointerPosition();
		if (mousePos) {
			arrow.points(arrow.points().splice(0, 2).concat([mousePos!.x, mousePos!.y]));

			if (GetZone({x: mousePos.x, y: mousePos.y}, stage, layer, children) != startZone) {
				arrow.show();
				arrow.moveToTop();
			} else {
				arrow.hide();
			}
		}
	}

	function finshDrawing(e: Konva.KonvaPointerEvent) {
		console.log("removing arrow handlers")
		stage.off('pointermove.arrow')
		stage.off('pointerup.arrow')

		let mousePos = stage.getPointerPosition();

		
		if (mousePos) {
			let currZone = GetZone({x: mousePos.x, y: mousePos.y}, stage, layer, children);
			if (currZone != startZone) {
				$am.Actions["draw"].Cancel();
				ResetZone(stage, startZone!);

				$commandText = `!swap ${startZone?.name()} ${currZone?.name()}`
	
				$am.Actions[name].IsActive = false;	
			} else {
				$am.Actions[name].Cancel();
			}
		} 
	}

	onMount(async () => {
		await tick();
 	});

</script>

<Arrow 
	bind:handle={arrow} 
	  config={{
		x: 0,
		y: 0,
		points: [],
		stroke: "rgba(121, 173, 120, 0.7)",
		pointerLength: 12,
		pointerWidth: 15,
		strokeWidth: 7,
		lineCap: "round",
		draggable: false,
		listening: false,
		visible: false
	}} 
/>