<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { pinch, press, composedGesture, type PressCustomEvent, pan, type PinchCustomEvent , type GestureCustomEvent, type RegisterGestureType, type GestureCallback, type BaseParams, type GestureReturnType} from 'svelte-gestures';
	import type { Coordinates, Point } from '$types';
	import _ from 'lodash';
	import Tangle from './Tangle.svelte';
	import Panzoom from '@panzoom/panzoom'
	import {type PanzoomObject} from '@panzoom/panzoom'
	import { setPointerControls, getCenterOfTwoPoints } from 'svelte-gestures';
	import { drawing, panzoom, multiTouch, tripleTouch } from '$lib/stores';

	
	export let commandText: string;
	export let panAndZoomInitialized: boolean = false;
	export let middleClick: boolean = false;
	export let selector: Tangle; 
	let zoomarea: any;

	function isZoomable(): boolean {
		if (commandText.startsWith("!ptzclick") || commandText.startsWith("!ptzfocusr") || $drawing) {
			return false
		}
		return true
	}

	function setPanState(state: boolean) {
		panInitialized = state;
		if (panInitialized || zoomInitialized) {
			panAndZoomInitialized = true;
		} else {
			panAndZoomInitialized = false;
		}
	}

	function setZoomState(state: boolean) {
		zoomInitialized = state;
		if (panInitialized || zoomInitialized) {
			panAndZoomInitialized = true;
		} else {
			panAndZoomInitialized = false;
		}
	}


	
	let zoom = 1;
	function wheelHandler(e: WheelEvent) {
		if (!isZoomable()) {
			return;
		}

		if (e.deltaY < 0) {
			// Scroll Up
			if (zoom < 4) {
				zoom += .2;
			}
		} else {
			// Scroll down
			if (zoom > 1) {
				zoom -= .2;
			} 
		}

		$panzoom.zoomToPoint(zoom, {clientX: (e.clientX - $panzoom.getPan().x), clientY: (e.clientY - $panzoom.getPan().y)}, {maxScale: 3, minScale: 1, force: true});
		if ($panzoom.getScale() <= 1.1) {
			$panzoom.reset();
			zoom = 1;
		}

	}

	let origin: Coordinates = {x: 0, y: 0}
	function wheelDownHandler(event: MouseEvent) {
		if (event.button == 1) {
			middleClick = true;
			origin = {x: (event.clientX), y: (event.clientY)}
			prevMousePan = {x: $panzoom.getPan().x, y: $panzoom.getPan().y};
		}
  	}


	let prevMousePan: Coordinates = {x: 0, y: 0}
	function wheelMoveHandler(event: MouseEvent) {
		if (middleClick) {
			$panzoom.pan(prevMousePan.x + ((event.clientX - origin.x) / $panzoom.getScale()), prevMousePan.y + ((event.clientY - origin.y) / $panzoom.getScale()));
		}
  	}

	function wheelUpHandler(event: MouseEvent) {
		if (event.button == 1) {
			if ($panzoom.getScale() <= 1.1) {
				$panzoom.reset();
				zoom = 1;
			}
			middleClick = false;
		}
	}

///////////////////////////////////////////////////////////////////

	

	

	let zoomInitialized: boolean = false;
	function doubleDownHandler(event: any) {
		selector.removeHandlers();
		if (isZoomable()) {
			setZoomState(true);
		}
  	}

	let zoomDebounce = 0;
	let prevScale: number = 1;
	function doubleMoveHandler(event: any) {
		if (isZoomable()) {
			let scale: number = prevScale * event.detail.scale;
			scale = scale < 1 ? 1 : scale;
			if (zoomDebounce > 2) {
				$panzoom.zoomToPoint(scale, {clientX: (event.detail.center.x - $panzoom.getPan().x), clientY: (event.detail.center.y - $panzoom.getPan().y)})
				// $panzoom.zoomToPoint(scale, {clientX: (event.detail.center.x), clientY: (event.detail.center.y)})
			} else {
				zoomDebounce++;
			}
		}
  	}

	  function doubleUpHandler(e: any) {
		zoomDebounce = 0;
		if ($panzoom.getScale() <= 1.3) {
			$panzoom.reset();
			
		}
		prevScale = $panzoom.getScale();
		setZoomState(false);
	}
	var upHandlerDebounced = _.debounce(doubleUpHandler, 10, { 'leading': false, 'trailing': true });

	
/////////////////////////////////

	let panInitialized: boolean = false;
	function tripleDownHandler(event: any) {
		selector.removeHandlers();
		if (isZoomable()) {
			prevPan = {x: $panzoom.getPan().x, y: $panzoom.getPan().y};
			setPanState(true);
		}
  	}


	let panScaler: number = 1.2;
	let prevPan: Coordinates = {x: 0, y: 0}
	function tripleMoveHandler(event: any) {
		if (isZoomable()) {
			$panzoom.pan(prevPan.x + event.detail.delta.x, prevPan.y + event.detail.delta.y)
		}
  	}

	function tripleUpHandler(e: any) {
		setPanState(false);
	}

//////////////////////////////////////////////////////////////////////////
	const scrollPan: GestureCallback = (register: RegisterGestureType) => {
		const doubleFns = register(multiTouch, {composed: true, touchAction: "none"});
		const tripleFns = register(tripleTouch, {composed: true, touchAction: "none"});

		return (activeEvents: PointerEvent[], event: PointerEvent) => {
			if (activeEvents.length == 2) {
				console.log("two touching")
				doubleFns.onMove(activeEvents, event);
				return true;
			} else if (activeEvents.length == 3) {
				console.log("three touching")
				tripleFns.onMove(activeEvents, event);
				return true;
			} else {
				console.log("NONE touching")

				return false;
			}
		};
	};





	onMount(() => {
		$panzoom = Panzoom(zoomarea, {noBind: true, cursor: 'default', pinchAndPan: false, disablePan: false, disableZoom: false, panOnlyWhenZoomed: false, canvas: false, step: 0.6})
		console.log("Zoomable mounted")
	});

  </script>
   

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div id="zoomarea" bind:this={zoomarea} 
	use:multiTouch 
		on:multiTouchDown={doubleDownHandler} 
		on:multiTouchMove={doubleMoveHandler} 
		on:multiTouchUp={upHandlerDebounced} 
	use:tripleTouch
		on:tripleTouchDown={tripleDownHandler} 
		on:tripleTouchMove={tripleMoveHandler} 
		on:tripleTouchUp={tripleUpHandler} 
	on:wheel={wheelHandler}
		on:mousedown={wheelDownHandler}
		on:mousemove={wheelMoveHandler}
		on:mouseup={wheelUpHandler}>
	<slot></slot>
</div>


<style>
	#zoomarea {
		/* position: fixed; */
		touch-action: auto;
	}
</style>