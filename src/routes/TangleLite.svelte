<script lang="ts">
	import { Stage, Layer, Transformer, Rect, Circle, Line, Shape, Arc, Group, type KonvaTouchEvent } from "svelte-konva";
	import Konva from "konva";
	import { createEventDispatcher, onMount, tick } from 'svelte';
	import type { Box, Coordinates, CamPresets } from '$types';
	import Radial from "./Radial.svelte";
	import Draw from "$lib/actions/Draw.svelte";
	import Swap from "$lib/actions/Swap.svelte";
	import Click from "$lib/actions/Click.svelte";
	import Scroll from "$lib/actions/Scroll.svelte";
	import DoubleClick from "$lib/actions/DoubleClick.svelte";
	import { am, commandText, panzoom } from '$lib/stores';
	import type { KonvaPointerEvent } from "konva/lib/PointerEvents";
	import { States } from '$lib/actions';
	import _ from 'lodash';
	
	let log = false;
	export let stageWidth: number;
	export let stageHeight: number;

	export let stage: Konva.Stage;
	var layer: Konva.Layer;
	var boxGroup: Konva.Group;

	export let zones: Box[] = [];
	const dispatch = createEventDispatcher();

	function bubbleResize(e: CustomEvent) {
		dispatch('forceiframeresize');
	}

	function isDragging(position: Coordinates) {
		if (origin) {
			let distance = Math.hypot(position.x - origin.x, position.y - origin.y);
			if (distance >= (stage.width() * .015)) {
				$am.ActiveStates.add(States.StageDraggingBuffered)
			} else {
				$am.ActiveStates.delete(States.StageDraggingBuffered)
			}

			if (distance >= 5) {
				$am.ActiveStates.add(States.StageDraggingDejittered)
			} else {
				$am.ActiveStates.delete(States.StageDraggingDejittered)
			}
		} else {
			$am.ActiveStates.delete(States.StageDraggingBuffered)
			$am.ActiveStates.delete(States.StageDraggingDejittered)
		}
	}

	function setCommandState() {
		$am.ActiveStates.delete(States.CommandScrollable)
		if ($commandText.startsWith("!ptzclick") || $commandText.startsWith("!ptzfocusr")) {
			$am.ActiveStates.add(States.CommandScrollable)
		}
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

		if (pointers > prevPointers) {
			$am.ActiveStates.add(States.PointerAdded);
			$am.ActiveStates.delete(States.PointerRemoved);
		} else if (pointers < prevPointers) {
			$am.ActiveStates.add(States.PointerRemoved);
			$am.ActiveStates.delete(States.PointerAdded);
		}
	}


	function printStates(states: Set<States>) {
		let s: string[] = [];
		states.forEach(a => { s.push(States[a]) })

		return s;
	}

	let zoneConfig = {x: 0, y: 0, id: "zones"};
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
		let ifOverlay = jQuery('#overlay')[0].getBoundingClientRect();
		origin = {x: (e.evt.clientX - ifOverlay.left) / $panzoom.getScale(), y: (e.evt.clientY - ifOverlay.top) / $panzoom.getScale()};

		prevPointers = pointers;
		if (e.evt.pointerType != 'mouse') {
			pointers++;
		} else if (e.evt.pointerType == 'mouse' && pointers == 0) {
			pointers++;
		}
		setPointerCountStates(pointers);

		let hitNode = stage.getIntersection(origin);
		if (hitNode) {
			$am.ActiveStates.add(States.NodeHit);
			if (hitNode.getParent() == boxGroup) {
				$am.ActiveStates.add(States.ZoneHit);
			} else if (hitNode == stage.findOne('.tangle') || hitNode == stage.findOne('.transformer')) {
				$am.ActiveStates.add(States.TangleHit);
			}
		}

		if (e.evt.button == 0) {
			$am.ActiveStates.add(States.LeftMouseButtonPressed);
		} else if (e.evt.button == 1) {
			$am.ActiveStates.add(States.MiddleMouseButtonPressed);
		}  else if (e.evt.button == 2) {
			$am.ActiveStates.add(States.RightMouseButtonPressed);
		}

		isDragging({x: (e.evt.clientX - ifOverlay.left) / $panzoom.getScale(), y: (e.evt.clientY - ifOverlay.top) / $panzoom.getScale()})
		setCommandState()

		if (log) {
			console.log(printStates($am.ActiveStates))
		}
		$am.CheckActions({x: origin!.x, y: origin!.y});
	}
	
	function handlePointerMove(e: KonvaPointerEvent) {
		if ($am.ActiveStates.has(States.StagePointerDown)) {
			$am.ActiveStates.add(States.StageDragging);

			let ifOverlay = jQuery('#overlay')[0].getBoundingClientRect();
			let coords = {x: (e.evt.clientX - ifOverlay.left) / $panzoom.getScale(), y: (e.evt.clientY - ifOverlay.top) / $panzoom.getScale()}
			isDragging(coords)
			setCommandState()

			let hoverZone = stage.getIntersection(coords);
			if (hoverZone) {
				$am.ActiveStates.add(States.NodeDragHover);
				if (hoverZone.getParent() == boxGroup) {
					$am.ActiveStates.add(States.ZoneDragHover);
				} else if (hoverZone == stage.findOne('.tangle') || hoverZone == stage.findOne('.transformer')) {
					$am.ActiveStates.add(States.TangleDragHover);
				}
			}

			if (log) {
				console.log(printStates($am.ActiveStates))
			}

			$am.CheckActions({x: origin!.x, y: origin!.y});
		}
	}

	function handlePointerUp(e: KonvaPointerEvent) {
		prevPointers = pointers;
		if (pointers > 0) {
			pointers--;
		}

		if (e.evt.button == 0) {
			$am.ActiveStates.delete(States.LeftMouseButtonPressed);
		} else if (e.evt.button == 1) {
			$am.ActiveStates.delete(States.MiddleMouseButtonPressed);
		}  else if (e.evt.button == 2) {
			$am.ActiveStates.delete(States.RightMouseButtonPressed);
		}

		setPointerCountStates(pointers);
		setCommandState();

		if (pointers == 0) {
			$am.ActiveStates.delete(States.StagePointerDown);
			origin = null;

			$am.ActiveStates.delete(States.StageDragging);
			$am.ActiveStates.delete(States.StageDraggingBuffered);
			$am.ActiveStates.delete(States.ZoneHit);
			$am.ActiveStates.delete(States.ZoneDragHover);
		} 
		
		if (log) {
			console.log(printStates($am.ActiveStates))
		}
	}

	function handlePointerDoubleClick(e: KonvaPointerEvent) {
		$am.ActiveStates.add(States.StageDoubleClick);
		let hitZone = stage.getIntersection({x: e.evt.clientX, y: e.evt.clientY});
		if (hitZone && hitZone.getParent() == boxGroup) {
			$am.ActiveStates.add(States.ZoneHit);
		}

		if (log) {
			console.log(printStates($am.ActiveStates))
		}

		$am.CheckActions({x: e.evt.clientX, y: e.evt.clientY});

		$am.ActiveStates.delete(States.ZoneHit);
		$am.ActiveStates.delete(States.StageDoubleClick);
	}

	function wheelHandler(e: any) {
		$am.ActiveStates.add(States.WheelScrolling);
		if (e.evt.deltaY < 0) {
			$am.ActiveStates.delete(States.WheelScrollDown);
			$am.ActiveStates.add(States.WheelScrollUp);
		} else {
			$am.ActiveStates.delete(States.WheelScrollUp);
			$am.ActiveStates.add(States.WheelScrollDown);
		}

		let ifOverlay = jQuery('#overlay')[0].getBoundingClientRect();
		let coords = {x: (e.evt.clientX - ifOverlay.left) / $panzoom.getScale(), y: (e.evt.clientY - ifOverlay.top) / $panzoom.getScale()}

		let hoverZone = stage.getIntersection(coords);
		if (hoverZone) {
			$am.ActiveStates.add(States.NodeScrollHover);
			if (hoverZone.getParent() == boxGroup) {
				$am.ActiveStates.add(States.ZoneScrollHover);
			} else if (hoverZone == stage.findOne('.tangle') || hoverZone == stage.findOne('.transformer')) {
				$am.ActiveStates.add(States.TangleScrollHover);
			}
		}


		setPointerCountStates(pointers);
		setCommandState();

		if (log) {
			console.log(printStates($am.ActiveStates))
		}

		$am.CheckActions({x: e.evt.clientX, y: e.evt.clientY});

		$am.ActiveStates.delete(States.WheelScrolling);
		$am.ActiveStates.delete(States.WheelScrollUp);
		$am.ActiveStates.delete(States.WheelScrollDown);
		$am.ActiveStates.delete(States.ZoneScrollHover);
	}

	function handlePointerOut(e: PointerEvent) {
		if (e.pointerType != "touch") {
			prevPointers = pointers;
			if (pointers > 0) {
				pointers--;
			}
			
			if (e.button == 0) {
				$am.ActiveStates.delete(States.LeftMouseButtonPressed);
			} else if (e.button == 1) {
				$am.ActiveStates.delete(States.MiddleMouseButtonPressed);
			}  else if (e.button == 2) {
				$am.ActiveStates.delete(States.RightMouseButtonPressed);
			}
			
			setPointerCountStates(pointers);
		}
	}

	let pointers = 0;
	let prevPointers = 0;
	onMount(async () => {
		await tick();
		dispatch("forceiframeresize");

		stage.on("pointerdown.stage", handlePointerDown);
		stage.on("pointermove.stage", handlePointerMove);
		stage.on("pointerup.stage", handlePointerUp);
		stage.on("pointerdblclick.stage", handlePointerDoubleClick);
		stage.on("wheel.stage", wheelHandler);
		// stage.on("pointerout.stage", pointerleave);

		jQuery("#overlay")[0].addEventListener("pointerout",handlePointerOut);
		// stage.on("pointerleave.stage", pointerleave);
		// layer.toggleHitCanvas();
   
 	});
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
		<Draw bind:stage bind:layer />
		<!-- <Swap bind:stage /> -->
		<Click bind:stage />
		<DoubleClick />
		<Scroll on:forceiframeresize={bubbleResize}/>
	</Layer>
</Stage>