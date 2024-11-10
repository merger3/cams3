<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Konva from "konva";
	import { Arrow, Rect } from "svelte-konva";
	import { am, commandText, GetZone, ClearStage, stage, zones } from '$lib/stores';
	import type { Coordinates } from '$types';
	import { States, type Action } from '$lib/actions';
	import _ from 'lodash';
	import { customAlphabet } from 'nanoid';
	import { AddSelection, RemoveSelection, Selector } from '$lib/zones';

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
	let endZone: Konva.Rect | undefined;
	function enable(this: Action, origin: Coordinates) {
		startZone = GetZone($zones, origin)
		if (!startZone) {
			return;
		}

		arrow.points([(startZone.x() + (startZone.width() / 2)), (startZone.y() + (startZone.height() / 2))]);
		
		ClearStage($stage, false);
		
		arrow.show();
		arrow.moveToTop();
		
		AddSelection(startZone, Selector.SwapSource);
		
		$stage.on('pointermove.swap', handleDrag);
		$stage.on('pointerup.swap', finshDrawing);

		this.IsActive = true;
	}

	function cancel(this: Action) {
		$stage.off('pointermove.swap');
		$stage.off('pointerup.swap');

		arrow.hide();
		arrow.points([]);

	
		RemoveSelection(Selector.SwapSource);
		RemoveSelection(Selector.SwapTarget);

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
			endZone = GetZone($zones, mousePos)

			if (endZone) {
				let swaps: number[] = [Number(startZone?.name()), Number(endZone.name())]
				swaps.sort(function(a, b){return a - b}); 
				$commandText = `!swap ${swaps[0]} ${swaps[1]}`
			} else {
				$am.Actions[name].Cancel();
				return;
			}

			manufactureArrow();
			arrow.hide();

			$am.Actions[name].IsActive = false;
		}
	}



	function manufactureArrow() {
		let newArrow = new Konva.Arrow({
			x: arrow.x(),
			y: arrow.y(),
			name: "arrow",
			id: tangleID(),
			points: [...arrow.points()],
			stroke: "rgba(121, 173, 120, 0.7)",
			pointerLength: 18,
			pointerWidth: 22,
			strokeWidth: 8,
			lineCap: "round",
			listening: false,
			draggable: false
		});
		
		arrow.getLayer()!.add(newArrow);
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
		pointerLength: 18,
		pointerWidth: 22,
		strokeWidth: 8,
		lineCap: "round",
		draggable: false,
		visible: false,
		listening: false
	}}
/>