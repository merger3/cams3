<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Konva from "konva";
	import { Arrow, Rect, Transformer } from "svelte-konva";
	import { am, commandText, ifDimensions, GetZone, GrowZone, ResetZone, ClearStage, stage } from '$lib/stores';
	import type { Coordinates } from '$types';
	import { States, type Action } from '$lib/actions';
	import {  DrawTangle } from '$lib/rect';
	import _ from 'lodash';
	import { customAlphabet } from 'nanoid';

	const tangleID = customAlphabet('0123456789abcdef', 5);
	const name = "swapPosition";

	let arrow: Konva.Arrow;

	$am.Actions[name] = {
		Name: name,
		TriggerConditions: {
			Active: new Set([
				States.StagePointerDown,
				States.OnePointer,
				States.PointerAdded,
				States.LeftMouseButtonPressed,
				States.StageDraggingBuffered,
				States.ClickedEmptySpace,
				States.CrossedZones
			]),
			Inactive: new Set(),
		},
		CancelConditions: {
			Active: new Set(),
			Inactive: new Set([
				States.CrossedZones,
				States.StagePointerDown,
				States.OnePointer,
				States.LeftMouseButtonPressed,
				States.StageDraggingBuffered
			]),
		},
		IsActive: false,
		Cancel: cancel,
		Enable: enable
	}

	let startZone: Konva.Rect | undefined;
	function enable(this: Action, origin: Coordinates) {
		

		// points: [(clickedShape!.x() + (clickedShape!.width() / 2)), (clickedShape!.y() + (clickedShape!.height() / 2))],
		// points: [mousePos!.x, mousePos!.y],
		// arrow.points(arrow.points().splice(0, 2).concat([mousePos!.x, mousePos!.y]));
		startZone = GetZone(origin, $stage)

		if (startZone) {
			arrow.points([(startZone.x() + (startZone.width() / 2)), (startZone.y() + (startZone.height() / 2))]);
		} else {
			return;
		}

		ClearStage($stage);

		arrow.show();
		$stage.on('pointermove.swap', handleDrag);
		$stage.on('pointerup.swap', finshDrawing);

		this.IsActive = true;
	}

	function cancel(this: Action) {
		console.log("cancelling swap")
		$stage.off('pointermove.swap');
		$stage.off('pointerup.swap');

		arrow.hide();
		arrow.points([]);

		startZone = undefined;
		this.IsActive = false;
	}

	function handleDragRaw(e: Konva.KonvaPointerEvent) {
		let mousePos = $stage.getPointerPosition();
		if (mousePos) {
			arrow.points(arrow.points().splice(0, 2).concat([mousePos.x, mousePos.y]));
		}
	}

	var handleDrag = _.throttle(handleDragRaw, 5, { 'leading': true, 'trailing': true });


	function finshDrawing(e: Konva.KonvaPointerEvent) {
		$stage.off('pointermove.swap')
		$stage.off('pointerup.swap')

		let mousePos = $stage.getPointerPosition();

		if (mousePos) {

			let endZone = GetZone(mousePos, $stage)

			if (endZone) {
				let swaps: number[] = [Number(startZone?.name()), Number(endZone.name())]
				swaps.sort(function(a, b){return a - b}); 
				$commandText = `!swap ${swaps[0]} ${swaps[1]}`
			} else {
				$am.Actions[name].Cancel();
				return;
			}

			manufactureArrow(endZone);

			arrow.hide();

			startZone = undefined;
			$am.Actions[name].IsActive = false;
		}
	}



	function manufactureArrow(box: Konva.Rect) {
		let groupID = tangleID();

		let newArrowGroup= new Konva.Group({
			name: "arrow",
			id: groupID,
			listening: false,
			draggable: false
		})

		let newArrow = new Konva.Arrow({
			x: arrow.x(),
			y: arrow.y(),
			points: arrow.points(),
			stroke: "rgba(121, 173, 120, 0.7)",
			pointerLength: 12,
       		pointerWidth: 15,
			strokeWidth: 7,
			lineCap: "round",
			listening: false,
			draggable: false
		});

		let newHighlight = new Konva.Rect({
			x: box.x(),
			y: box.y(),
			width: box.width(),
			height: box.height(),
			fill: 'rgba(92, 150, 255, 0.15)',
			fillEnabled: true,
			strokeEnabled: false,
			listening: false,
			draggable: false,
		});

		newArrowGroup.add(newArrow);
		newArrowGroup.add(newHighlight);
		
		arrow.getLayer()!.add(newArrowGroup);
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
		visible: false,
		listening: false
	}}
/>