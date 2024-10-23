<script lang="ts">
	import { Stage, Layer, Transformer, Rect, Circle, Line, Shape, Arc, Group, type KonvaTouchEvent } from "svelte-konva";
	import Konva from "konva";
	import { createEventDispatcher, onMount, tick } from 'svelte';
	import type { Box, Coordinates, CamPresets } from '$types';
	import Radial from "./Radial.svelte";
	import { drawing, panzoom } from '$lib/stores';
	

	export let stageWidth: number;
	export let stageHeight: number;

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

	export function getClickedShape(coordinates: Coordinates) {
		return stage.getIntersection(coordinates)
	}

	export function testZone(shape: Konva.Shape) {
		return shape.getParent() == boxGroup
	}

	
	
	let pointers = 0;
	onMount(async () => {
		await tick();
		dispatch("forceiframeresize");
		stage.on("touchstart", (e: any) => {
			console.log(e)
			pointers++;
		});
		stage.on("touchend", (e: any) => {
			console.log(e)
			for (let i = 0; i < e.evt.changedTouches.length; i++) {
				if (pointers > 0) {
					pointers--;
				}
			}
		});
		stage.on("mousedown", (e: any) => {
			if (e.evt.button == 0) {
				console.log(e)
				pointers++;
			}
		});
		stage.on("mouseup", (e: any) => {
			if (e.evt.button == 0) {
				console.log(e)
				pointers--;
			}
		});

		// layer.toggleHitCanvas();
   
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
	on:pointerdown={null}
	>
	<Layer bind:handle={layer} config={{id: "mainlayer", x: 0, y: 0}}>
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

		<Transformer bind:handle={transformer} on:transformend={null} config={{
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
