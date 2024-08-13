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

	let startX = 0;
	let startY = 0;

	export function cleanUp() {
		dot.destroy();
		tangle.destroy();
		transformer.nodes([]);
	}

	function isDragging(rect: Konva.Rect) {
		return Math.hypot(rect.width(), rect.height()) >= (stage.width() * .01);
	}

	function handleStageMouseDown(e: any) {
		// e.preventDefault();
		const konvaEvent = e.detail;
		// clicked on stage - clear selection
		if (konvaEvent.target === konvaEvent.target.getStage()) {
			transformer.nodes([]);

			let mousePos = stage.getPointerPosition();

			if (mousePos) {
				startX = mousePos.x;
				startY = mousePos.y;
			}

			tangle?.destroy();
			dot?.destroy();
			tangle = new Konva.Rect({
				x: startX,
				y: startY,
				width: 0,
				height: 0,
				fill: 'rgba(245, 106, 106, 0.3)',
				stroke: 'red',
				strokeWidth: 2,
				strokeScaleEnabled: false,
				draggable: true
			});
			dot = new Konva.Circle({
				x: (tangle.x() + (tangle.width() / 2)),
				y: (tangle.y() + (tangle.height() / 2)),
				radius: 3,
				strokeScaleEnabled: false,
				fill: 'black'
			});

			tangle.hide();
			layer.add(tangle);
			layer.add(dot);
			transformer.moveToTop();

			tangle.on("transform", handleTransform);
			tangle.on("transformend", handleTransformEnd);
			tangle.on("dragmove", handleDrag);
			tangle.on("dragend", endDrag);
			stage.on("pointermove", drawRectangle);
			stage.on("pointerup", endDrawing);
			return;
		}
		const clickedOnTransformer = konvaEvent.target.getParent().className === "Transformer";
		if (clickedOnTransformer) {
			return;
		}
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

	function endDrawing(event: any) {
		if (!isDragging(tangle)) {
			tangle.size({
				width: 0,
				height: 0
			});
			transformer.hide();
		} else {
			transformer.show();
		}

		dot.moveDown()

		transformer.nodes([tangle]);
		transformer.anchorSize(Math.max(Math.min((transformer?.width() / 6), 15), 3))
		stage.off('pointermove');
		stage.off('pointerup');

		dispatch('finishdrawing', {
			rect: tangle
		});
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