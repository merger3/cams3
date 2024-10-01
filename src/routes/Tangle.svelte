<script lang="ts">
	import { Stage, Layer, Transformer, Rect, Circle, Line, Shape, Arc, Group, type KonvaTouchEvent } from "svelte-konva";
	import Konva from "konva";
	import { createEventDispatcher, onMount, tick } from 'svelte';
	import type { Box, Coordinates, CamPresets } from '$types';
	import Radial from "./Radial.svelte";

	export let stageWidth: number;
	export let stageHeight: number;
	export let tangle: Konva.Rect;
	export let radialMenu: Radial;
	export let mainLayerConfig: any;
	export let commandText: string;
	export let ifWidth: number;
	export let ifHeight: number;
	export let camPresets: CamPresets;

	let dot: Konva.Circle;
	let arrow: Konva.Arrow;

	let transformer: Konva.Transformer;
	let stage: Konva.Stage;
	var layer: Konva.Layer;
	var boxGroup: Konva.Group;

	export let zones: Box[];
	let zoneBoxes: Konva.Rect[] = [new Konva.Rect(), new Konva.Rect(), new Konva.Rect(), new Konva.Rect(), new Konva.Rect(), new Konva.Rect()];
	const dispatch = createEventDispatcher();

	export function resizeStage(width: number, height: number) {
		stage.size({width: width, height: height});
	}

	export function cleanUp(resetHitbox: boolean = false) {
		arrow?.remove();
		dot?.remove();
		tangle?.remove();
		transformer?.nodes([]);

		rectShown = true;

		zoneBoxes.forEach(node => {
			if (resetHitbox) {
				node.hitFunc(function(context: any) {
					context.beginPath();
					context.rect(0, 0, node.width(), node.height());
					context.closePath();
					context.fillStrokeShape(node);
				});
			}
			node.fill("rgba(0, 0, 0, 0)");
		});
	}

	export function removeHandlers() {
		stage.off("pointerdblclick", handleStageDblClick)
		stage.off("pointerup", endDrawingCheck);
		stage.off("pointermove", watchForDrag);
	}

	export function stopListening() {
		if (tangle) {
			tangle.draggable(false);
		}
	}

	function relisten() {
		if (tangle) {
			tangle.draggable(true);
		}
	}

	function isDragging(rect: Konva.Rect) {
		return Math.hypot(rect.width(), rect.height()) >= (stage.width() * .015);
	}

	function bindShapes() {
		if (!placeholderTangle) {
			return;
		}
		
		console.log("binding shapes")
		cleanUp(false);
		tangle = new Konva.Rect({
			x: placeholderTangle!.x(),
			y: placeholderTangle!.y(),
			width: placeholderTangle!.width(),
			height: placeholderTangle!.height(),
			fill: 'rgba(250, 128, 114, 0.3)',
			stroke: 'rgba(255, 0, 0, 0.5)',
			strokeWidth: 1.5,
			strokeScaleEnabled: false,
			draggable: true
		});
		dot = new Konva.Circle({
			x: (tangle.x() + (tangle.width() / 2)),
			y: (tangle.y() + (tangle.height() / 2)),
			radius: 2,
			strokeScaleEnabled: false,
			fill: 'black'
		});
	
		arrow = new Konva.Arrow({
			x: 0,
			y: 0,
			points: [(clickedShape!.x() + (clickedShape!.width() / 2)), (clickedShape!.y() + (clickedShape!.height() / 2))],
			stroke: "rgba(121, 173, 120, 0.7)",
			pointerLength: 12,
       		pointerWidth: 15,
			strokeWidth: 7,
			lineCap: "round",
			listening: false
		})

		placeholderTangle?.remove();
		placeholderTangle = null;
		placeholderDot?.remove();
		placeholderDot = null;
		placeholderArrow?.remove();
		placeholderArrow = null;


		arrow.hide()
		tangle.hide();
		layer.add(tangle);
		layer.add(dot);
		layer.add(arrow)
		arrow.moveToTop();
		transformer.moveToTop();
	}

	function drawShapes(e: any) {
		stage.off('pointermove');
		stage.off('pointerup');
		// clicked on stage - clear selection
		bindShapes();
		tangle.listening(false);
		tangle.on("transform", handleTransform);
		tangle.on("transformend", handleTransformEnd);
		
		tangle.on("dragmove", handleDrag);
		tangle.on("dragend", endDrag);
		
		stage.on("pointermove", drawRectangle);
		stage.on("pointerup", endDrawingCheck);
		return;
	}

	// clean up all the places event watchers are added
	// and especially where they are removed
	export let stagePressed: boolean = true;
	export let clickTimeout: number | undefined;
	let clickEvent: any;
	let placeholderTangle: Konva.Rect | null;
	let placeholderDot: Konva.Circle | null;
	let placeholderArrow: Konva.Arrow | null;
	let clickedCoords: Coordinates | null;
	let clickedShape: Konva.Shape | null;
	function handleStageMouseDown(e: any) {
		console.log("stage pointer down")
		const konvaEvent = e.detail;
		let mousePos = stage.getPointerPosition();
		if (!mousePos) {
			return;
		}

		

		clickedCoords = {x: mousePos.x, y: mousePos.y};
		console.log(clickedCoords)
		clickedShape = stage.getIntersection(clickedCoords);
		if (!clickedShape) {
			console.log("Unrecoverable state")
			return;
		}

		

		if (konvaEvent.evt.button == 2) {
			let relativePos = layer.getRelativePointerPosition();
			if (!relativePos) {
				return;
			}
			dispatch("rightclick", {
				x: relativePos.x,
				y: relativePos.y
			})
			return;
		}

		if (konvaEvent.target === konvaEvent.target.getStage() || konvaEvent.target.getParent() === boxGroup) {
			stagePressed = true;
			stage.on("pointerdblclick", handleStageDblClick)
			if (clickTimeout) {
				clearTimeout(clickTimeout);
			}
			console.log("stage clicked")

			clickEvent = e;
			jQuery('.movedown').css('z-index', '0');
			
			mousePos = layer.getRelativePointerPosition()

			console.log("creating placeholders")
			placeholderTangle?.remove();
			placeholderDot?.remove();
			placeholderTangle = new Konva.Rect({
				x: mousePos!.x,
				y: mousePos!.y,
				width: 0,
				height: 0,
				listening: false
			});
			placeholderDot = new Konva.Circle({
				x: (placeholderTangle.x() + (placeholderTangle.width() / 2)),
				y: (placeholderTangle.y() + (placeholderTangle.height() / 2)),
				listening: false
			});
			placeholderArrow = new Konva.Arrow({
				x: 0,
				y: 0,
				points: [mousePos!.x, mousePos!.y],
				stroke: "black",
				strokeWidth: 10,
				listening: false
			})


			stage.on("pointerup", endDrawingCheck);
			stage.on("pointermove", watchForDrag);
		} else {
			stagePressed = false;
		}
	}

	function handleStageDblClick(e: any) {
		console.log("double click:")
		console.log(e)
		// e.preventDefault();
		if (clickTimeout) {
			clearTimeout(clickTimeout);
		}

		stage.off('pointermove');
		stage.off('pointerup');
		stage.off("pointerdblclick", handleStageDblClick)
		let mousePos = stage.getPointerPosition();
		console.log(mousePos?.x, mousePos?.y)
		clickedShape = stage.getIntersection({x: mousePos!.x, y: mousePos!.y});
		if (!clickedShape) {
			console.log("no shape clicked")
			return;
		}
		dispatch("doubleclick", {
			x: mousePos!.x,
			y: mousePos!.y,
			position: clickedShape.name()
		})
	}

	function watchForDrag(e: any) {
		let mousePos = layer.getRelativePointerPosition();

		placeholderTangle!.size({
			width: (mousePos!.x - placeholderTangle!.x()),
			height: (mousePos!.y - placeholderTangle!.y())
		});
		placeholderDot!.position({
			x: (mousePos!.x),
			y: (mousePos!.y),
		})

		if (!isDragging(placeholderTangle!)) {
			return;
		}

		console.log("Drag detected")
		if (clickedShape && clickedShape.getParent() == boxGroup) {
			clickedShape.hitFunc(function(context: any) {
				let xMargin = stageWidth * .06
				let yMargin = stageHeight * .07
				context.beginPath();
				context.rect(-xMargin / 2, -yMargin / 2, clickedShape!.width() + xMargin, clickedShape!.height() + yMargin);
				context.closePath();
				// important Konva method that fill and stroke shape from its properties
				context.fillStrokeShape(clickedShape);
			});
			clickedShape.moveToTop();
		}
		
		stage.off('pointermove');
		bindShapes();
		drawShapes(clickEvent);
	}
	
	function calcDraw(mousePos: Konva.Vector2d | null, show: boolean = true) {
		if (mousePos) {
			if (isDragging(tangle)) {
				if (show) {
					tangle.show()
					transformer.show();
				}
				dot.position({
					x: (tangle.x() + (tangle.width() / 2)),
					y: (tangle.y() + (tangle.height() / 2)),
				})
			} else {
				tangle.hide();
				transformer.hide();
				dot.position({
					x: (mousePos.x),
					y: (mousePos.y),
				})
			}
		}
	}

	let rectShown: boolean = true;
	let selectedBox: Konva.Shape | null = null;
	function drawRectangle(event: any) {
		// event.preventDefault();
		// event.stopPropagation();
		let mousePos = stage.getPointerPosition();
		if (mousePos) {
			var shape = stage.getIntersection({x: stage.getPointerPosition()!.x, y: stage.getPointerPosition()!.y});
			if (shape && shape.getParent() == boxGroup) {
				if (shape != clickedShape) {
					tangle.hide();
					dot.hide();
					arrow.show();
					rectShown = false;
					selectedBox = shape;
					shape.fill("rgba(92, 150, 255, 0.15)")
					shape.on("pointerleave", unhighlightShape);
					// console.log(shape)
				} else {
					arrow.hide();
					tangle.show();
					dot.show();
					rectShown = true;
					selectedBox = null;
				}
			} 

			mousePos = layer.getRelativePointerPosition();
			tangle.size({
				width: (mousePos!.x - tangle.x()),
				height: (mousePos!.y - tangle.y())
			});
			
			arrow.points(arrow.points().splice(0, 2).concat([mousePos!.x, mousePos!.y]));

			calcDraw(mousePos, rectShown);
		}
	};

	function finshEndDrawing(event: any) {
		stage.off('pointermove');
		stage.off('pointerup');

		if (rectShown) {
			transformer.hide();
			if (placeholderTangle != null && !isDragging(placeholderTangle)) {
				placeholderTangle.size({
					width: 0,
					height: 0
				});
				bindShapes();
			} else if (isDragging(tangle) && tangle.visible()) {
				transformer.show();
			}

			dot.listening(false);
			tangle.listening(true);
			// dot.moveDown()

			transformer.nodes([tangle]);
			transformer.anchorSize(Math.max(Math.min((transformer?.width() / 6), 15), 3))

			dispatch('finishdrawing', {
				rect: tangle
			});
		} else if (selectedBox && clickedShape!.getParent() == boxGroup && selectedBox.getParent() == boxGroup) {
			transformer.hide();
			tangle.hide();
			tangle.listening(false);
			dot.hide();
			dot.listening(false);

			let swaps: number[] = [Number(clickedShape!.name()), Number(selectedBox.name())]
			swaps.sort(function(a, b){return a - b}); 
			dispatch('finishdrawingline', {
				swaps: swaps
			});
		} else {
			// destroy the drawn line and other shapes, we hit an uncontinuable state
		}
		
		rectShown = true;
		zoneBoxes.forEach(node => {
			node.hitFunc(function(context: any) {
				context.beginPath();
				context.rect(0, 0, node.width(), node.height());
				context.closePath();
				context.fillStrokeShape(node);
			});
			node.off("pointerleave", unhighlightShape)
		});
	}

	function endDrawingCheck(event: any) {
		console.log("pointer up")
		jQuery('.movedown').css('z-index', '');
		if (clickTimeout) {
			clearTimeout(clickTimeout);
		}

		stagePressed = true;
		stage.off('pointermove');
		stage.off('pointerup');
		selectedBox?.off("pointerleave", unhighlightShape)

		if (tangle) {
			if (tangle.width() < 0) {
				tangle.x(tangle.x() + tangle.width())
				tangle.width(Math.abs(tangle.width()))
			}
			if (tangle.height() < 0) {
				tangle.y(tangle.y() + tangle.height()) 
				tangle.height(Math.abs(tangle.height()))
			}
			if (tangle.visible()) {
				tangle.listening(true);
			}
		}
		
		
		clickTimeout = setTimeout(() => {
			finshEndDrawing(event);
		}, 200);
		
	};

	function handleDrag() {
		calcDraw(layer.getRelativePointerPosition());
	}

	function unhighlightShape(e: any) {
		e.target.fill("rgba(0, 0, 0, 0)")
		e.target.off("pointerleave", unhighlightShape)
	}

	function endDrag() {
		calcDraw(layer.getRelativePointerPosition());
		dispatch('finishdrawing', {
			rect: tangle
		});
	}

	let crushSize: boolean = true;
	function handleTransform() {
		tangle.setAttrs({
			width: tangle.width() * tangle.scaleX(),
			height: tangle.height() * tangle.scaleY(),
			scaleX: 1,
			scaleY: 1,
		});

		// Turning these to 0 throws a million warnings and probably impacts performance- eventually fix
		if (!isDragging(tangle) && crushSize) {
			tangle.size({
				width: 0,
				height: 0
			});
			crushSize = false;
		}
		calcDraw(layer.getRelativePointerPosition());

		transformer.anchorSize(Math.max(Math.min((transformer?.width() / 6), 15), 3))
	}

	function handleTransformEnd() {
		tangle.setAttrs({
			width: tangle.width() * tangle.scaleX(),
			height: tangle.height() * tangle.scaleY(),
			scaleX: 1,
			scaleY: 1,
		});
		if (!crushSize) {
			tangle.position({
				x: dot.x(),
				y: dot.y()
			})
			tangle.size({
				width: 0,
				height: 0
			});
			crushSize = true;
		}

		dispatch('finishdrawing', {
			rect: tangle
		});
	}

	function bubbleSend(e: CustomEvent) {
		dispatch("sendcmd");
	}

	function bubbleFocus(e: CustomEvent) {
		console.log("bubbling focus")
		dispatch("resetfocus");
	}

	function bubbleOpenMenu(e: CustomEvent) {
		console.log(e);
		dispatch("openmenu", e.detail);
	}

	onMount(async () => {
		await tick();
		dispatch("forceiframeresize");
		layer.toggleHitCanvas();
   
 	});

</script>


<Stage
	bind:handle={stage}
	config={{
		container: 'stage',
		x: 0,
		y: 0,
		width: stageWidth,
		height: stageHeight
	}}
	on:pointerdown={handleStageMouseDown}
	>
	<Layer bind:handle={layer} config={mainLayerConfig}>
		<Group bind:handle={boxGroup}>
			{#each zones as z}
				<Rect config={{
						x: z.x,
						y: z.y,
						width: z.width,
						height: z.height,
						fill: 'rgba(0, 0, 0, 0)',
						fillEnabled: true,
						stroke: 'rgba(255, 0, 0, 0.2)',
						strokeWidth: 1.5,
						strokeScaleEnabled: false,
						name: String(z.zone)
					}}
					bind:handle={zoneBoxes[z.zone]}
				/>
				<Shape config={{
					x: (z.x + (z.width / 2)),
					y: (z.y + (z.height / 2)),
					height: stageWidth * .0045,
					width: .7,
					sceneFunc: function (context, shape) {
						const thickness = shape.width();
						const length = shape.height();
						
						context.beginPath();
						context.moveTo(-thickness, -thickness);
						context.lineTo(-thickness, -length);
						context.lineTo(thickness, -length);
						context.lineTo(thickness, -thickness);
						context.lineTo(length, -thickness);
						context.lineTo(length, thickness);
						context.lineTo(thickness, thickness);
						context.lineTo(thickness, length);
						context.lineTo(-thickness, length);
						context.lineTo(-thickness, thickness);
						context.lineTo(-length, thickness);
						context.lineTo(-length, -thickness);
						context.lineTo(-thickness, -thickness);
						context.closePath();

						// (!) Konva specific method, it is very important
						context.fillStrokeShape(shape);
					},
					fill: 'rgba(255,255,255,.7)',
					stroke: 'rgba(0,0,0,.8)',
					strokeWidth: 1,
					listening: false,
					name: String(z.zone)
					}}
				/>
			{/each}
		</Group>

		<Transformer bind:handle={transformer} on:transformend={handleTransformEnd} config={{
			keepRatio: false,
			anchorSize: Math.max(Math.min((transformer?.width() / 6), 15), 3),
			rotateEnabled: false,
			borderEnabled: false,
			ignoreStroke: true,
			shouldOverdrawWholeArea: true,	
			anchorStyleFunc: function (anchor) {
				anchor.fill('rgba(138, 219, 207, .5)');
				anchor.cornerRadius(anchor.width() / 2);
			}}} />

		<Radial bind:this={radialMenu} bind:stage bind:commandText bind:ifWidth bind:ifHeight bind:camPresets on:sendcmd={bubbleSend} on:openmenu={bubbleOpenMenu} on:resetfocus={bubbleFocus} on:closemenu={relisten}  />
	</Layer>
</Stage>
