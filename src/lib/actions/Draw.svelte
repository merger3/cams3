<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Konva from "konva";
	import { Circle, Rect, Transformer } from "svelte-konva";
	import { am, commandText, ifDimensions, GetZone, GrowZone, ResetZone } from '$lib/stores';
	import type { Coordinates } from '$types';
	import { States, type Action } from '$lib/actions';
	import {  DrawTangle } from '$lib/rect';
	import _ from 'lodash';
	import { customAlphabet } from 'nanoid';

	const tangleID = customAlphabet('0123456789abcdef', 5);
	const name = "draw";

	export let stage: Konva.Stage;
	export let layer: Konva.Layer;

	let tangle: Konva.Rect;
	let dot: Konva.Circle;
	let transformer: Konva.Transformer;

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
		MustCancel: ["click"],
		IsActive: false,
		Cancel: cancel,
		Enable: enable
	}

	let startZone: Konva.Rect | null;
	function enable(this: Action, origin: Coordinates) {
		// Optimization for GetZone in places that call it a lot
		// layer = stage.findOne('#mainlayer') as Konva.Layer;
		// children = layer.getChildren(function(node){
		// 	return node.id() != "zones" && node.listening();
		// });

		// startZone = GetZone(origin, stage, layer, children);
		// if (!startZone) {
		// 	return;
		// }
		
		// GrowZone(stage, startZone);

		$am.Actions["click"].Cancel()

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

	function cancel(this: Action, mod = true) {
		stage.off('pointermove.draw');
		stage.off('pointerup.draw');
		tangle.listening(false);
		transformer.nodes([]);
		tangle.hide();
		dot.hide();
		if (mod && startZone != null) {
			ResetZone(stage, startZone);		
		}
		this.IsActive = false;
	}


	function writeCommand() {
		$commandText = DrawTangle({
			X: tangle.x(),
			Y: tangle.y(),
			Width: tangle.width(),
			Height: tangle.height(),
			FrameWidth: $ifDimensions.width,
			FrameHeight: $ifDimensions.height
		}).command
	}

	function handleDragRaw(e: Konva.KonvaPointerEvent) {
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

			// if (GetZone({x: mousePos.x, y: mousePos.y}, stage, layer, children) == startZone) {
			// 	tangle.show();
			// 	dot.show();
			// } else {
			// 	tangle.hide();
			// 	dot.hide();
			// }
		}
	}

	var handleDrag = _.throttle(handleDragRaw, 5, { 'leading': true, 'trailing': true });


	function finshDrawing(e: Konva.KonvaPointerEvent) {
		$am.Actions["click"].Cancel()

		stage.off('pointermove.draw')
		stage.off('pointerup.draw')

		let mousePos = stage.getPointerPosition();

		if (mousePos) {
			if (tangle.width() < 0) {
				tangle.x(tangle.x() + tangle.width())
				tangle.width(Math.abs(tangle.width()))
			}
			if (tangle.height() < 0) {
				tangle.y(tangle.y() + tangle.height()) 
				tangle.height(Math.abs(tangle.height()))
			}

			transformer.nodes([tangle]);
			transformer.anchorSize(Math.max(Math.min((transformer?.width() / 8), 15), 3))
			tangle.listening(true);

			ResetZone(stage, startZone!);
			writeCommand();

			$am.Actions[name].IsActive = false;
		} else {
			$am.Actions[name].Cancel();
		}
	}



	function manufactureTangle() {
		let groupID = tangleID()

		let newTangleGroup = new Konva.Group({
			name: "tangle",
			id: groupID
		})

		let newTangle = new Konva.Rect({
			x: tangle.x(),
			y: tangle.y(),
			width: tangle.width(),
			height: tangle.height(),
			fill: 'rgba(250, 128, 114, 0.3)',
			stroke: 'rgba(255, 0, 0, 0.5)',
			strokeWidth: 1.5,
			strokeScaleEnabled: false,
			listening: true,
			draggable: true,
			visible: true
		});
		
		let newDot = new Konva.Circle({
			x: dot.x(),
			y: dot.y(),
			radius: 2,
			strokeScaleEnabled: false,
			fill: 'black',
			listening: false,
			draggable: false,
			visible: true
		});
		newDot.transformsEnabled("position");

		let newTranformer = new Konva.Transformer({
			anchorSize: Math.max(Math.min((transformer?.width() / 8), 15), 3),
			keepRatio: false,
			rotateEnabled: false,
			borderEnabled: false,
			ignoreStroke: true,
			shouldOverdrawWholeArea: true,
			flipEnabled: false,	
			anchorStyleFunc: function (anchor) {
				anchor.fill('rgba(138, 219, 207, .5)');
				anchor.cornerRadius(anchor.width() / 2);
			}
		});

		// on:dragmove={handleTangleDrag}
		// on:dragend={endTangleDrag}
		// on:transform={handleTransform}
		// on:transformend={handleTransformEnd}

		newTangleGroup.on("transform", handleTransform);
		newTangleGroup.on("transformend", handleTransformEnd)

		newTangleGroup.add(newTangle);
		newTangleGroup.add(newDot);
		newTangleGroup.add(newTranformer);

		newTranformer.nodes([newTangleGroup]);

		layer.add(newTangleGroup);
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

		// dot.position({
		// 	x: (tangle.x() + (tangle.width() / 2)),
		// 	y: (tangle.y() + (tangle.height() / 2)),
		// })

		transformer.anchorSize(Math.max(Math.min((transformer?.width() / 8), 15), 3))
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
		name: "tangle",
		fill: 'rgba(250, 128, 114, 0.3)',
		stroke: 'rgba(255, 0, 0, 0.5)',
		strokeWidth: 1.5,
		strokeScaleEnabled: false,
		draggable: true,
		visible: false
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
<Transformer bind:handle={transformer} on:transformend={handleTransformEnd} 
	config={{
		name: "transformer",
		keepRatio: false,
		anchorSize: Math.max(Math.min((transformer?.width() / 8), 15), 3),
		rotateEnabled: false,
		borderEnabled: false,
		ignoreStroke: true,
		shouldOverdrawWholeArea: true,
		flipEnabled: false,	
		anchorStyleFunc: function (anchor) {
			anchor.fill('rgba(138, 219, 207, .5)');
			anchor.cornerRadius(anchor.width() / 2);
		}
	}} 
/>