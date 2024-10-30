<script lang="ts">
	import { Stage, Layer, Transformer, Rect, Circle, Line, Shape, Arc, Group, type KonvaTouchEvent } from "svelte-konva";
	import Konva from "konva";
	import { createEventDispatcher, onMount, tick } from 'svelte';
	import type { Box, Coordinates, CamPresets } from '$types';
	import RadialLite from "./RadialLite.svelte";
	import Draw from "$lib/actions/Draw.svelte";
	import Swap from "$lib/actions/Swap.svelte";
	import Click from "$lib/actions/Click.svelte";
	import Scroll from "$lib/actions/Scroll.svelte";
	import { type PressCustomEvent } from 'svelte-gestures';

	import { am, commandText, GetZone, panzoom, stage, GrowZone, ResetZone } from '$lib/stores';
	import type { KonvaPointerEvent } from "konva/lib/PointerEvents";
	import { States } from '$lib/actions';
	import _ from 'lodash';
	
	let log = false;
	export let stageWidth: number;
	export let stageHeight: number;

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
			if (distance >= ($stage.width() * .015)) {
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

	let startZone: any;
	function setClickedZone(origin: Coordinates | null) {
		let zoneRect: Konva.Rect | undefined = undefined;
		if (origin) {
			zoneRect = GetZone(origin, $stage);
		}

		if (zoneRect) {
			$am.ActiveStates.add(States.ClickedZone);
			if ($am.ActiveStates.has(States.PointerAdded) && $am.ActiveStates.has(States.OnePointer)) {
				GrowZone($stage, zoneRect!);
				startZone = zoneRect;
			}
		} else {
			$am.ActiveStates.delete(States.ClickedZone);
			startZone = undefined;
		}
		
		
	}

	let hoverZone: any;
	function setHoveredZone(zone: Konva.Rect | null) {
		if (hoverZone) {
			hoverZone.fill("rgba(0, 0, 0, 0)")
		}
		
		hoverZone = zone;

		if (zone) {
			$am.ActiveStates.add(States.HoveredZone);
			if (hoverZone != startZone && $am.ActiveStates.has(States.OnePointer) && $am.ActiveStates.has(States.LeftMouseButtonPressed)) {
				hoverZone.fill("rgba(92, 150, 255, 0.15)")
			}
		} else {
			$am.ActiveStates.delete(States.HoveredZone);
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

	let pointerID: any;
	let origin: Coordinates | null;
	function handlePointerDown(e: KonvaPointerEvent) {
		console.log(e)
		pointerID = e.evt.pointerId;
		if (document.activeElement) {
			(document.activeElement as HTMLElement).blur();
		}
		$am.ActiveStates.add(States.StagePointerDown);
		let ifOverlay = jQuery('#overlay')[0].getBoundingClientRect();
		
		prevPointers = pointers;
		if (e.evt.pointerType != 'mouse') {
			pointers++;
		} else if (e.evt.pointerType == 'mouse' && pointers == 0) {
			pointers++;
		}
		setPointerCountStates(pointers);
		
		if ($am.ActiveStates.has(States.OnePointer)) {
			origin = {x: (e.evt.clientX - ifOverlay.left) / $panzoom.getScale(), y: (e.evt.clientY - ifOverlay.top) / $panzoom.getScale()};
			if (e.target.getParent() == boxGroup) {
				$am.ActiveStates.add(States.ClickedEmptySpace);
			}
			$stage.on("pointermove.stage", handlePointerMove);
		}

		setClickedZone(origin);

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
	
	function handlePointerMoveRaw(e: KonvaPointerEvent) {
		if ($am.ActiveStates.has(States.StagePointerDown)) {
			$am.ActiveStates.add(States.StageDragging);

			let ifOverlay = jQuery('#overlay')[0].getBoundingClientRect();
			let coords = {x: (e.evt.clientX - ifOverlay.left) / $panzoom.getScale(), y: (e.evt.clientY - ifOverlay.top) / $panzoom.getScale()}
			isDragging(coords)
			setCommandState()

			if (log) {
				console.log(printStates($am.ActiveStates))
			}

			$am.CheckActions({x: origin!.x, y: origin!.y});
		}
	}

	var handlePointerMove = _.throttle(handlePointerMoveRaw, 16, { 'leading': true, 'trailing': true });


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
			$stage.off("pointermove.stage");
			$am.ActiveStates.delete(States.StagePointerDown);
			origin = null;

			$am.ActiveStates.delete(States.StageDragging);
			$am.ActiveStates.delete(States.StageDraggingBuffered);
			$am.ActiveStates.delete(States.StageDraggingDejittered)
			$am.ActiveStates.delete(States.PointerRemoved)
			$am.ActiveStates.delete(States.ClickedEmptySpace);

			ResetZone(startZone as Konva.Rect)

			setClickedZone(null);
			setHoveredZone(null);
			$am.ActiveStates.delete(States.CrossedZones);
		} 

		if (log) {
			console.log(printStates($am.ActiveStates))
		}
	}


	function handlePointerOut(e: PointerEvent) {
		if (e.pointerType != "touch" && $am.ActiveStates.has(States.StagePointerDown)) {
			prevPointers = pointers;
			if (pointers > 0) {
				pointers--;
			}

			setPointerCountStates(pointers);

			if (pointers == 0) {
				$stage.off("pointermove.stage");
				$am.ActiveStates.delete(States.StagePointerDown);
				origin = null;

				$am.ActiveStates.delete(States.StageDragging);
				$am.ActiveStates.delete(States.StageDraggingBuffered);
				$am.ActiveStates.delete(States.StageDraggingDejittered)
				$am.ActiveStates.delete(States.PointerRemoved)
				$am.ActiveStates.delete(States.ClickedEmptySpace);

				ResetZone(startZone as Konva.Rect)
				
				setClickedZone(null);
				setHoveredZone(null);
				$am.ActiveStates.delete(States.CrossedZones);
			} 
			
			if (e.button == 0) {
				$am.ActiveStates.delete(States.LeftMouseButtonPressed);
			} else if (e.button == 1) {
				$am.ActiveStates.delete(States.MiddleMouseButtonPressed);
			}  else if (e.button == 2) {
				$am.ActiveStates.delete(States.RightMouseButtonPressed);
			}

		}
	}

	function handlePointerDoubleClick(e: KonvaPointerEvent) {
		$am.ActiveStates.add(States.StageDoubleClick);
		if (e.evt.button == 0) {
			$am.ActiveStates.add(States.LeftMouseButtonPressed);
		} else if (e.evt.button == 1) {
			$am.ActiveStates.add(States.MiddleMouseButtonPressed);
		}  else if (e.evt.button == 2) {
			$am.ActiveStates.add(States.RightMouseButtonPressed);
		}

		if (log) {
			console.log(e);
		}

		let ifOverlay = jQuery('#overlay')[0].getBoundingClientRect();
		$am.CheckActions({x: (e.evt.clientX - ifOverlay.left) / $panzoom.getScale(), y: (e.evt.clientY - ifOverlay.top) / $panzoom.getScale()});
		
		$am.ActiveStates.delete(States.StageDoubleClick);
		if (e.evt.button == 0) {
			$am.ActiveStates.delete(States.LeftMouseButtonPressed);
		} else if (e.evt.button == 1) {
			$am.ActiveStates.delete(States.MiddleMouseButtonPressed);
		}  else if (e.evt.button == 2) {
			$am.ActiveStates.delete(States.RightMouseButtonPressed);
		}
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

		setPointerCountStates(pointers);
		setCommandState();

		if (log) {
			console.log(printStates($am.ActiveStates))
		}

		$am.CheckActions({x: e.evt.clientX, y: e.evt.clientY});

		$am.ActiveStates.delete(States.WheelScrolling);
		$am.ActiveStates.delete(States.WheelScrollUp);
		$am.ActiveStates.delete(States.WheelScrollDown);
	}

	

	function zoneHover(e: any) {
		if ($am.ActiveStates.has(States.StagePointerDown)) {
			setHoveredZone(e.detail.target);
			if ((startZone && hoverZone) && startZone != hoverZone) {
				$am.ActiveStates.add(States.CrossedZones);
			} else {
				$am.ActiveStates.delete(States.CrossedZones);
			}
			if (log) {
				console.log(printStates($am.ActiveStates))
			}
		}
	}

	function pressDownHandler(event: any) {
		let e: PressCustomEvent = event;
		console.log(e)
		$am.ActiveStates.add(States.StagePressed);
		if (log) {
			console.log(printStates($am.ActiveStates))
		}

		if (e.detail.pointerType == "touch") {
			jQuery('#overlay')[0].releasePointerCapture(pointerID);
			jQuery('#stage')[0].setPointerCapture(pointerID);
		}
		let ifOverlay = jQuery('#overlay')[0].getBoundingClientRect();
		$am.CheckActions({x: (e.detail.x + ifOverlay.left), y: (e.detail.y + ifOverlay.top)});
	}

	function pressUpHandler(e: any) {
		console.log("press up handler")
		$am.ActiveStates.delete(States.StagePressed); 
		$am.CheckActions({x: e.clientX, y: e.clientY}); 
		handlePointerUp({"evt": e.detail.event} as KonvaPointerEvent);
	}

	let pointers = 0;
	let prevPointers = 0;
	onMount(async () => {
		await tick();
		dispatch("forceiframeresize");

		$stage.on("pointerdown.stage", handlePointerDown);
		$stage.on("pointerup.stage", handlePointerUp);
		$stage.on("pointerdblclick.stage", handlePointerDoubleClick);
		$stage.on("wheel.stage", wheelHandler);

		jQuery("#overlay")[0].addEventListener("pointerout",handlePointerOut);
		jQuery("#overlay")[0].addEventListener("press", pressDownHandler);
		// jQuery("#overlay")[0].addEventListener("pressup", pressUpHandler);
		// layer.toggleHitCanvas();
   
 	});
</script>


<Stage
	bind:handle={$stage}
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
					on:pointerenter={zoneHover}
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
		<Draw bind:layer />
		<Swap />
		<Click />
		<Scroll on:forceiframeresize={bubbleResize}/>
	</Layer>
</Stage>
<RadialLite bind:stageWidth bind:stageHeight on:simulatepointerup={pressUpHandler}/>
