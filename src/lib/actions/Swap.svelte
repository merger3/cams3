<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Konva from "konva";
	import { Arrow, Rect } from "svelte-konva";
	import { am, commandText, GetZone, ClearStage, stage, zones } from '$lib/stores';
	import type { Coordinates } from '$types';
	import { States, type Action } from '$lib/actions';
	import _ from 'lodash';
	import { customAlphabet } from 'nanoid';

	const tangleID = customAlphabet('0123456789abcdef', 5);
	const name = "swapPosition";

	let arrow: Konva.Arrow;
	let highlight: Konva.Rect;

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
		startZone = GetZone($zones, origin)
		if (!startZone) {
			return;
		}

		arrow.points([(startZone.x() + (startZone.width() / 2)), (startZone.y() + (startZone.height() / 2))]);
		highlight.position({
			x: startZone.x(),
			y: startZone.y()
		})
		highlight.size({
			height: startZone.height(),
			width: startZone.width()
		})

		ClearStage($stage);

		arrow.show();
		arrow.moveToTop();
		highlight.show();
		$stage.on('pointermove.swap', handleDrag);
		$stage.on('pointerup.swap', finshDrawing);

		this.IsActive = true;
	}

	function cancel(this: Action) {
		$stage.off('pointermove.swap');
		$stage.off('pointerup.swap');

		arrow.hide();
		arrow.points([]);

		highlight.hide();

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

			let endZone = GetZone($zones, mousePos)

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
			highlight.hide();
			
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
			points: [...arrow.points()],
			stroke: "rgba(121, 173, 120, 0.7)",
			pointerLength: 18,
			pointerWidth: 22,
			strokeWidth: 8,
			lineCap: "round",
			listening: false,
			draggable: false
		});

		let newSourceHighlight = new Konva.Rect({
			x: highlight.x(),
			y: highlight.y(),
			width: highlight.width(),
			height: highlight.height(),
			fill: 'rgba(213, 65, 44, 0.1)',
			fillEnabled: true,
			strokeEnabled: false,
			listening: false,
			draggable: false,
		});

		let newTargetHighlight = new Konva.Rect({
			x: box.x(),
			y: box.y(),
			width: box.width(),
			height: box.height(),
			fill: 'rgba(92, 150, 255, 0.1)',
			fillEnabled: true,
			strokeEnabled: false,
			listening: false,
			draggable: false,
		});

		newArrowGroup.add(newArrow);
		newArrowGroup.add(newTargetHighlight);
		newArrowGroup.add(newSourceHighlight);
		
		arrow.getLayer()!.add(newArrowGroup);
	}

	onMount(async () => {
		await tick();
 	});

</script>

<Rect 
	bind:handle={highlight} 
	  config={{
		x: 0,
		y: 0,
		width: 0,
		height: 0,
		fill: 'rgba(213, 65, 44, 0.15)',
		fillEnabled: true,
		strokeEnabled: false,
		listening: false,
		visible: false,
		draggable: false,
	}}
/>
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