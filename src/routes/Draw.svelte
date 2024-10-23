<script lang="ts">
	import Konva from "konva";
	import { Circle, Rect } from "svelte-konva";
	import { am } from '$lib/stores';
	import type { Coordinates } from '$types';
	import { States, Action, ActionsManager } from '$lib/actions';

	export let stage: Konva.Stage;
	let tangle: Konva.Rect;

	let config = {
		x: 0,
		y: 0,
		width: 0,
		height: 0,
		fill: 'rgba(250, 128, 114, 0.3)',
		stroke: 'rgba(255, 0, 0, 0.5)',
		strokeWidth: 1.5,
		strokeScaleEnabled: false,
		draggable: true,
		visible: false,
		listening: false
	}

	function enable(origin: Coordinates) {
		config.x = origin.x;
		config.y = origin.y;

		let mousePos = stage.getPointerPosition();
		tangle.size({
			width: (mousePos!.x - tangle.x()),
			height: (mousePos!.y - tangle.y())
		});
		
		stage.on('pointermove.draw', handleDrag);
		stage.on('pointerup.draw', finshDrawing);
	}

	function handleDrag(e: Konva.KonvaPointerEvent) {
		let mousePos = stage.getPointerPosition();

		if (mousePos) {
			tangle.size({
				width: (mousePos.x - tangle.x()),
				height: (mousePos.y - tangle.y())
			});
		}
	}

	function finshDrawing(e: Konva.KonvaPointerEvent) {
		stage.off('pointermove.draw')
		stage.off('pointerup.draw')
	}

	function cancel() {}



	// tangle = new Konva.Rect({
	// 		x: placeholderTangle!.x(),
	// 		y: placeholderTangle!.y(),
	// 		width: placeholderTangle!.width(),
	// 		height: placeholderTangle!.height(),
	// 		fill: 'rgba(250, 128, 114, 0.3)',
	// 		stroke: 'rgba(255, 0, 0, 0.5)',
	// 		strokeWidth: 1.5,
	// 		strokeScaleEnabled: false,
	// 		draggable: true
	// 	});
	// 	dot = new Konva.Circle({
	// 		x: (tangle.x() + (tangle.width() / 2)),
	// 		y: (tangle.y() + (tangle.height() / 2)),
	// 		radius: 2,
	// 		strokeScaleEnabled: false,
	// 		fill: 'black'
	// 	});


</script>

<Rect bind:handle={tangle} config={config} />
