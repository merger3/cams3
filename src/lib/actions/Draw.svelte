<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Konva from "konva";
	import { Circle, Rect } from "svelte-konva";
	import { am, commandText, ifDimensions, ClearStage, stage } from '$lib/stores';
	import type { Coordinates } from '$types';
	import { States, type Action } from '$lib/actions';
	import {  DrawTangle } from '$lib/rect';
	import _ from 'lodash';
	import { customAlphabet } from 'nanoid';

	const tangleID = customAlphabet('0123456789abcdef', 5);
	const name = "draw";

	export let layer: Konva.Layer;

	let tangle: Konva.Rect;
	let dot: Konva.Circle;

	$am.Actions[name] = {
		Name: name,
		TriggerConditions: {
			Active: new Set([
				States.StagePointerDown,
				States.OnePointer,
				States.PointerAdded,
				States.LeftMouseButtonPressed,
				States.StageDraggingBuffered,
				States.ClickedEmptySpace
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

	function enable(this: Action, origin: Coordinates) {
		ClearStage($stage);

		tangle.position({
			x: origin.x,
			y: origin.y
		})
		tangle.size({
			height: 0,
			width: 0
		})
		

		dot.position({
			x: (tangle.x() + (tangle.width() / 2)),
			y: (tangle.y() + (tangle.height() / 2)),
		})

		tangle.show();
		dot.moveToTop();
		dot.show();

		$stage.on('pointermove.draw', handleDrag);
		$stage.on('pointerup.draw', finshDrawing);

		
		this.IsActive = true;
	}

	function cancel(this: Action) {
		$stage.off('pointermove.draw');
		$stage.off('pointerup.draw');

		tangle.hide();
		dot.hide();

		this.IsActive = false;
	}


	function writeCommand(target: Konva.Rect) {
		$commandText = DrawTangle({
			X: target.x(),
			Y: target.y(),
			Width: target.width(),
			Height: target.height(),
			FrameWidth: $ifDimensions.width,
			FrameHeight: $ifDimensions.height
		}).command
	}

	function handleDragRaw(e: Konva.KonvaPointerEvent) {
		let mousePos = $stage.getPointerPosition();
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

	var handleDrag = _.throttle(handleDragRaw, 5, { 'leading': true, 'trailing': true });


	function finshDrawing(e: Konva.KonvaPointerEvent) {
		$stage.off('pointermove.draw')
		$stage.off('pointerup.draw')

		let mousePos = $stage.getPointerPosition();

		if (mousePos) {
			if (tangle.width() < 0) {
				tangle.x(tangle.x() + tangle.width())
				tangle.width(Math.abs(tangle.width()))
			}
			if (tangle.height() < 0) {
				tangle.y(tangle.y() + tangle.height()) 
				tangle.height(Math.abs(tangle.height()))
			}

			writeCommand(tangle);
			manufactureTangle();

			tangle.hide();
			dot.hide();

			$am.Actions[name].IsActive = false;
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

		let newTranformer = new Konva.Transformer({
			anchorSize: Math.max(Math.min((newTangle.width() / 8), 17), 3),
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
		
		newTangle.on("dragmove", handleTangleDrag)
		newTangle.on("dragend", endTangleDrag)
		newTangle.on("transform", handleTransform);
		newTangle.on("transformend", handleTransformEnd)

		newTangleGroup.add(newTangle);
		newTangleGroup.add(newDot);
		newTangleGroup.add(newTranformer);

		newTranformer.nodes([newTangle]);

		layer.add(newTangleGroup);
	}

	function handleTangleDrag(e: any) {
		e.target.getParent().getChildren().forEach(function (node: Konva.Node) {
			switch(node.getClassName()) { 
				case "Circle": { 
					node.position({
						x: (e.target.x() + (e.target.width() / 2)),
						y: (e.target.y() + (e.target.height() / 2)),
					})
					break; 
				}
			} 
		});
	}

	function endTangleDrag(e: any) {
		e.target.getParent().getChildren().forEach(function (node: Konva.Node) {
			switch(node.getClassName()) { 
				case "Rect": { 
					writeCommand(node as Konva.Rect);
					break; 
				} 
				case "Circle": { 
					node.position({
						x: (e.target.x() + (e.target.width() / 2)),
						y: (e.target.y() + (e.target.height() / 2)),
					})
					break; 
				}
			} 
		});
	}

	function handleTransform(e: any) {
		e.target.getParent().getChildren().forEach(function (node: Konva.Node) {
			switch(node.getClassName()) { 
				case "Rect": { 
					node.setAttrs({
						width: node.width() * node.scaleX(),
						height: node.height() * node.scaleY(),
						scaleX: 1,
						scaleY: 1,
					});
					break; 
				} 
				case "Circle": { 
					node.position({
						x: (e.target.x() + (e.target.width() / 2)),
						y: (e.target.y() + (e.target.height() / 2)),
					})
					break;
				}
				case "Transformer": { 
					(node as Konva.Transformer).anchorSize(Math.max(Math.min((node.width() / 8), 17), 3))
					break; 
				} 
			} 
		});
	}

	function handleTransformEnd(e: any) {
		e.target.getParent().getChildren().forEach(function (node: Konva.Node) {
			switch(node.getClassName()) { 
				case "Rect": { 
					node.setAttrs({
						width: node.width() * node.scaleX(),
						height: node.height() * node.scaleY(),
						scaleX: 1,
						scaleY: 1,
					});
					writeCommand(node as Konva.Rect);
					break; 
				} 
				case "Circle": { 
					node.position({
						x: (e.target.x() + (e.target.width() / 2)),
						y: (e.target.y() + (e.target.height() / 2)),
					})
					break; 
				}
				case "Transformer": { 
					(node as Konva.Transformer).anchorSize(Math.max(Math.min((node.width() / 8), 17), 3))
					break; 
				} 
			} 
		});
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
		draggable: false,
		listening: false,
		visible: false
	}}
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