<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Konva from "konva";
	import { Circle, Rect } from "svelte-konva";
	import { am, commandText, ifDimensions, ClearStage, stage, sendCommand } from '$lib/stores';
	import type { Coordinates } from '$types';
	import { States, type Action } from '$lib/actions';
	import {  DrawTangle } from '$lib/rect';
	import _ from 'lodash';
	import { customAlphabet } from 'nanoid';
	const tangleID = customAlphabet('0123456789abcdef', 5);

	const sendName = "senddraw";
	$am.Actions[sendName] = {
		Name: sendName,
		TriggerConditions: {
			Active: new Set([
				States.DoubleClickedTangle
			]),
			Inactive: new Set(),
		},
		CancelConditions: {
			Active: new Set(),
			Inactive: new Set([
				States.DoubleClickedTangle
			]),
		},
		IsActive: false,
		Enable: enableSend,
		Cancel: cancelSend
	}

	function enableSend(this: Action, origin: Coordinates) {
		this.IsActive = true;
		setTimeout(() => {
			sendCommand({cmd: $commandText});
			this.IsActive = false;
		}, 50)
	}
	
	function cancelSend(this: Action) {
		this.IsActive = false;
	}


	export let layer: Konva.Layer;
	
	let tangle: Konva.Rect;
	let dot: Konva.Circle;
	
	const name = "draw";
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
				States.CrossedZones,
				States.StageDoubleClick
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
				tangle.x(tangle.x() + tangle.width());
				tangle.width(Math.abs(tangle.width()));
			}
			if (tangle.height() < 0) {
				tangle.y(tangle.y() + tangle.height()) ;
				tangle.height(Math.abs(tangle.height()));
			}

			snapToRatio(tangle, true);

			writeCommand(tangle);
			manufactureTangle();

			tangle.hide();
			dot.hide();

			$am.Actions[name].IsActive = false;
		} 
	}


	function snapToRatio(shape: Konva.Rect, keepCentered: boolean) {
		if (shape.width() >= shape.height() && (shape.width() / shape.height() > 1.5) ) {
			let oldHeight = shape.height();
			let balancedHeight = shape.width() / (16/9);
			shape.height(balancedHeight);
			if (keepCentered) {
				shape.y(shape.y() - (balancedHeight - oldHeight) / 2)
			}
		} else {
			let oldWidth = shape.width();
			let balancedWidth = shape.height() / (9/16);
			shape.width(balancedWidth);
			if (keepCentered) {
				shape.x(shape.x() - (balancedWidth - oldWidth) / 2)
			}
		}
		layer.draw();
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
			name: "selector",
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
			keepRatio: true,
			shiftBehavior: "inverted",
			centeredScaling: false,
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
		
		// newTangle.on("dragstart", handleTangleDragStart)
		newTangle.on("dragmove", handleTangleDrag)
		newTangle.on("dragend", endTangleDrag)
		newTangle.on("transformstart", handleTransformStart);
		newTangle.on("transform", handleTransform);
		newTangle.on("transformend", handleTransformEnd)

		newTangleGroup.add(newTangle);
		newTangleGroup.add(newDot);
		newTangleGroup.add(newTranformer);

		newTranformer.nodes([newTangle]);

		layer.add(newTangleGroup);
	}

	function handleTangleDragStart(e: any) {
		// snapToRatio(e.target as Konva.Rect, true);
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
					snapToRatio(node as Konva.Rect, true);
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

	function handleTransformStart(e: any) {
		e.target.getParent().getChildren(function(node: any){
			return node.getClassName() == "Transformer";
		}).forEach(function (node: Konva.Node) {
			let transformer = (node as Konva.Transformer);
			let activeAnchor: string = transformer.getActiveAnchor();
			if (activeAnchor == "top-left" || activeAnchor == "top-right" || activeAnchor == "bottom-right" || activeAnchor == "bottom-left") {
				transformer.centeredScaling(true);
			} else {
				transformer.centeredScaling(false);
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

					// snapToRatio(node as Konva.Rect, false);

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