<script lang="ts">
	import { Stage, Layer, Transformer, Rect, Circle, Line, Shape, Arc, Group, type KonvaTouchEvent } from "svelte-konva";
	import Konva from "konva";
	import { createEventDispatcher, onMount, tick } from 'svelte';
	import type { Box, Coordinates, CamPresets } from '$types';
	import Radial from "./Radial.svelte";
	import Draw from "$lib/actions/Draw.svelte";
	import Click from "$lib/actions/Click.svelte";
	import { am } from '$lib/stores';
	import type { KonvaPointerEvent } from "konva/lib/PointerEvents";
	import { States } from '$lib/actions';
	export let stageWidth: number;
	export let stageHeight: number;

	let transformer: Konva.Transformer;
	let stage: Konva.Stage;
	var layer: Konva.Layer;
	var boxGroup: Konva.Group;

	export let zones: Box[] = [];
	let zoneBoxes: Konva.Rect[] = [new Konva.Rect(), new Konva.Rect(), new Konva.Rect(), new Konva.Rect(), new Konva.Rect(), new Konva.Rect()];
	const dispatch = createEventDispatcher();

	function isDragging(position: Coordinates): boolean {
		if (origin) {
			return Math.hypot(position.x - origin.x, position.y - origin.y) >= (stage.width() * .015);
		} 

		return false;
	}

	function setPointerCountStates(activePointers: number) {
		$am.ActiveStates.delete(States.OnePointer);
		$am.ActiveStates.delete(States.TwoPointers);
		$am.ActiveStates.delete(States.ThreePointers);
		$am.ActiveStates.delete(States.OverThreePointers);

		switch (activePointers) {
		case 1:
			$am.ActiveStates.add(States.OnePointer);
			break;
		case 2:
			$am.ActiveStates.add(States.TwoPointers);
			break;
		case 3:
			$am.ActiveStates.add(States.ThreePointers);
			break;
		default:
			if (activePointers > 3) {
				$am.ActiveStates.add(States.OverThreePointers);

			}
			break;
		}
	}


	function printStates(states: Set<States>) {
		let s: string[] = [];
		states.forEach(a => { s.push(States[a]) })

		return s;
	}

	let zoneConfig = {x: 0, y: 0};
	export function resizeZones(x: number, y: number) {
		zoneConfig.x = x;
		zoneConfig.y = y;
	}

	export function getClickedShape(coordinates: Coordinates) {
		return stage.getIntersection(coordinates)
	}

	export function testZone(shape: Konva.Shape) {
		return shape.getParent() == boxGroup
	}

	let origin: Coordinates | null;
	function handlePointerDown(e: KonvaPointerEvent) {
		$am.ActiveStates.add(States.StagePointerDown);
		origin = {x: e.evt.clientX, y: e.evt.clientY};

		if (e.evt.pointerType != 'mouse') {
			pointers++;
		} else if (e.evt.pointerType == 'mouse' && pointers == 0) {
			pointers++;
		}
		setPointerCountStates(pointers);

		let hitZone = stage.getIntersection(origin);
		if (hitZone && e.target.getParent() == boxGroup) {
			$am.ActiveStates.add(States.ZoneHit);
		}

		console.log(printStates($am.ActiveStates))
		$am.CheckActions({x: origin!.x, y: origin!.y});

		
		// $am.CallAction("click", {x: origin!.x, y: origin!.y});

	}
	
	function handlePointerMove(e: KonvaPointerEvent) {
		if ($am.ActiveStates.has(States.StagePointerDown)) {
			$am.ActiveStates.add(States.StageDragging);
			if (isDragging({x: e.evt.clientX, y: e.evt.clientY})) {
				$am.ActiveStates.add(States.StageDraggingBuffered)
			} else {
				$am.ActiveStates.delete(States.StageDraggingBuffered)
			}
			console.log(printStates($am.ActiveStates))
			// console.log(printStates($am.Actions["draw"].Condition))
			// $am.CallAction("click", {x: origin!.x, y: origin!.y});
			// $am.CallAction("draw", {x: origin!.x, y: origin!.y});
			$am.CheckActions({x: origin!.x, y: origin!.y});

		}

		
	}

	function handlePointerUp(e: KonvaPointerEvent) {
		if (pointers > 0) {
			pointers--;
			if (pointers <= 1) {
				pointers = 0;
			} 
		}
		
		setPointerCountStates(pointers);

		if (pointers == 0) {
			$am.ActiveStates.delete(States.StagePointerDown);
			origin = null;

			$am.ActiveStates.delete(States.StageDragging);
			$am.ActiveStates.delete(States.StageDraggingBuffered);
			$am.ActiveStates.delete(States.ZoneHit);
		} 
		
		console.log(printStates($am.ActiveStates))

	}

	let pointers = 0;
	onMount(async () => {
		await tick();
		dispatch("forceiframeresize");

		stage.on("pointerdown.stage", handlePointerDown)
		stage.on("pointermove.stage", handlePointerMove)
		stage.on("pointerup.stage", handlePointerUp)
		
		// stage.on("touchstart", (e: any) => {
		// 	pointers++;
		// 	setPointerCountStates(pointers);
		// });
		// stage.on("touchend", (e: any) => {
		// 	for (let i = 0; i < e.evt.changedTouches.length; i++) {
		// 		if (pointers > 0) {
		// 			pointers--;
		// 		}
		// 	}
		// 	setPointerCountStates(pointers);
		// });
		// stage.on("mousedown", (e: any) => {
		// 	pointers++;
		// 	setPointerCountStates(pointers);
		// });
		// stage.on("mouseup", (e: any) => {
		// 	pointers--;
		// 	setPointerCountStates(pointers);
		// });

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
	>
	<Layer bind:handle={layer} config={{id: "mainlayer", x: 0, y: 0}}>
		<Group bind:handle={boxGroup} config={zoneConfig}>
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
		<Draw bind:stage />
		<Click bind:stage />
	</Layer>
</Stage>
