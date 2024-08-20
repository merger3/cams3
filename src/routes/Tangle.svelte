<script lang="ts">
	import { Stage, Layer, Transformer } from "svelte-konva";
	import Konva from "konva";
	import { createEventDispatcher } from 'svelte';

	export let stageWidth;
	export let stageHeight;
	export let tangle: Konva.Rect;
		
	let dot: Konva.Circle;

	let transformer: Konva.Transformer;
	let stage: Konva.Stage;
	var layer: Konva.Layer = new Konva.Layer();

	const dispatch = createEventDispatcher();

	export function cleanUp() {
		dot?.remove();
		tangle?.remove();
		transformer?.nodes([]);
	}

	function isDragging(rect: Konva.Rect) {
		return Math.hypot(rect.width(), rect.height()) >= (stage.width() * .01);
	}

	function bindShapes() {
		if (!placeholderTangle) {
			return;
		}
		
		console.log("binding shapes")
		transformer.nodes([]);

		tangle?.remove();
		dot?.remove();
		tangle = new Konva.Rect({
			x: placeholderTangle!.x(),
			y: placeholderTangle!.y(),
			width: placeholderTangle!.width(),
			height: placeholderTangle!.height(),
			fill: 'rgba(245, 106, 106, 0.3)',
			stroke: 'red',
			strokeWidth: 2,
			strokeScaleEnabled: false,
			draggable: true
		});

		placeholderTangle?.remove();
		placeholderTangle = null;
		
		tangle.hide();
		layer.add(tangle);
		layer.add(dot);
		transformer.moveToTop();
	}

	function drawShapes(e: any) {
		stage.off('pointermove');
		stage.off('pointerup');
		// clicked on stage - clear selection
		bindShapes();

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

	let clickEvent: any;
	let clickTimeout: number | undefined;

	let placeholderTangle: Konva.Rect | null;
	function handleStageMouseDown(e: any) {
		const konvaEvent = e.detail;
		if (konvaEvent.evt.button == 2) {
			return
		}

		if (konvaEvent.target === konvaEvent.target.getStage()) {
			if (clickTimeout) {
				clearTimeout(clickTimeout);
			}
			console.log("stage clicked")

			clickEvent = e;
			

			let mousePos = stage.getPointerPosition();
			
			console.log("creating placeholders")
			placeholderTangle?.remove();
			dot?.remove();
			placeholderTangle = new Konva.Rect({
				x: mousePos!.x,
				y: mousePos!.y,
				width: 0,
				height: 0,
				fill: 'rgba(245, 106, 106, 0.3)',
				stroke: 'red',
				strokeWidth: 2,
				strokeScaleEnabled: false,
				draggable: true
			});
			dot = new Konva.Circle({
				x: (placeholderTangle.x() + (placeholderTangle.width() / 2)),
				y: (placeholderTangle.y() + (placeholderTangle.height() / 2)),
				radius: 3,
				strokeScaleEnabled: false,
				fill: 'black'
			});

			stage.on("pointerup", endDrawingCheck);
			stage.on("pointermove", watchForDrag);
		}
	}

	function handleStageDblClick(e: any) {
		// e.preventDefault();
		console.log("double clicking")
		if (clickTimeout) {
			clearTimeout(clickTimeout);
		}
		stage.off('pointermove');
		stage.off('pointerup');
		let mousePos = stage.getPointerPosition();
		console.log(mousePos?.x, mousePos?.y)
		dispatch("doubleclick", {
			x: mousePos!.x,
			y: mousePos!.y
		})
	}

	function watchForDrag(e: any) {
		let mousePos = stage.getPointerPosition();

		placeholderTangle!.size({
			width: (mousePos!.x - placeholderTangle!.x()),
			height: (mousePos!.y - placeholderTangle!.y())
		});
		dot.position({
			x: (mousePos!.x),
			y: (mousePos!.y),
		})

		if (!isDragging(placeholderTangle!)) {
			return;
		}

		console.log("Drag detected")
		stage.off('pointermove');
		bindShapes();
		drawShapes(clickEvent);
	}
	
	function calcDraw(mousePos: Konva.Vector2d | null) {
		if (mousePos) {
			if (isDragging(tangle)) {
				tangle.show()
				transformer.show();
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

	function drawRectangle(event: any) {
		// event.preventDefault();
		// event.stopPropagation();
		let mousePos = stage.getPointerPosition();

		if (mousePos) {
			tangle.size({
				width: (mousePos.x - tangle.x()),
				height: (mousePos.y - tangle.y())
			});
			
			calcDraw(mousePos);
		}
	};

	let releaseTimer: number | undefined;
	function finshEndDrawing(event: any) {
		console.log("pointer up full")
		stage.off('pointermove');
		stage.off('pointerup');
		console.log(placeholderTangle);
		if (placeholderTangle != null && !isDragging(placeholderTangle)) {
			placeholderTangle.size({
				width: 0,
				height: 0
			});
			bindShapes();
			transformer.hide();
		} else if (isDragging(tangle)) {
			transformer.show();
		}

		dot.moveDown()

		transformer.nodes([tangle]);
		transformer.anchorSize(Math.max(Math.min((transformer?.width() / 6), 15), 3))

		dispatch('finishdrawing', {
			rect: tangle
		});
	}

	function endDrawingCheck(event: any) {
		console.log("pointer up")
		if (clickTimeout) {
			clearTimeout(clickTimeout);
		}
		stage.off('pointermove');
		stage.off('pointerup');

		if (clickTimeout) {
			clearTimeout(clickTimeout);
		}

		clickTimeout = setTimeout(() => {
			finshEndDrawing(event);
		}, 200);
		
	};

	function handleDrag() {
		calcDraw(stage.getPointerPosition());
	}

	function endDrag() {
		calcDraw(stage.getPointerPosition());
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
		calcDraw(stage.getPointerPosition());

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
</script>

<Stage
	bind:handle={stage}
	config={{
		container: 'overlay',
		x: 0,
		y: 0,
		width: stageWidth,
		height: stageHeight
	}}
	on:pointerdblclick={handleStageDblClick}
	on:pointerdown={handleStageMouseDown}
>

	<Layer bind:handle={layer}>
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
	</Layer>
</Stage>