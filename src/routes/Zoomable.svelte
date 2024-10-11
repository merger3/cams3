<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { pinch, press, composedGesture, type PressCustomEvent, pan, type PinchCustomEvent , type GestureCustomEvent, type RegisterGestureType, type GestureCallback } from 'svelte-gestures';
	import type { Coordinates, Point } from '$types';
	import _ from 'lodash';
	import Page from './+page.svelte';
	const dispatch = createEventDispatcher();
	
	export let commandText: string;

	let zoomarea: any;

	let origin: Coordinates = {x: 0, y: 0};
	let points: Coordinates[];

	let relativeTranslation: Coordinates = {x: 0, y: 0};
	let translation: Coordinates = {x: 0, y: 0};

	let scale: number = 1;
	let savedScale: number = 1;

	function isZoomable(): boolean {
		if (commandText.startsWith("!ptzclick") || commandText.startsWith("!ptzfocusr")) {
			return false
		}
		return true
	}


	function getPointsMidpoint(points: Coordinates[]): Coordinates {
		if (points.length != 2) {
			console.log("points was not 2")
			return {x: 0, y: 0};
		}
		if (points[0].x == points[1].x && points[0].y == points[1].y) {
			// console.log("points were identical")
			// return {x: 0, y: 0};
		} else {
			// console.log("not a match")
		}

		let midX = (points[0].x + points[1].x) / 2;
		let midY = (points[0].y + points[1].y) / 2;

		return {x: midX, y: midY};
	}


	function wheelHandler(e: any) {
		if (!isZoomable()) {
			return;
		}

		if (e.deltaY < 0) {
			// Scroll up
		} else {
			// Scroll down
		}
	}



	function pinchHandler(event: PinchCustomEvent) {
		if (!isZoomable()) {
			return;
		}

		scale = savedScale * event.detail.scale;
		scale = scale < 1 ? 1 : scale;
		// origin = {x: origin.x / scale, y: origin.y / scale};
  	}


	export let panAndZoomInitialized: boolean = false;
	function panDownHandler(e: GestureCustomEvent) {
		if (!isZoomable()) {
			return;
		}

		console.log("pan down")
		console.log(e)

		const adjustedX = e.detail.x / scale;
    	const adjustedY = e.detail.y / scale;

		points.push({x: adjustedX, y: adjustedY});

		if (points.length == 2) {
			origin = getPointsMidpoint(points);
			points = [];
			panAndZoomInitialized = true;
		} else if (points.length > 2) {
			points = [];
			panAndZoomInitialized = false;
		}

	}


	let lastEventCoords: Coordinates = {x: -1, y: -1}
	function panMoveHandler(e: GestureCustomEvent) {
		// Also check that scale is not less than 1 so panning is only possible when zoomed in
		if (!isZoomable() || !panAndZoomInitialized) {
			return;
		}

		if (e.detail.x == lastEventCoords.x && e.detail.y == lastEventCoords.y) {
			lastEventCoords = {x: e.detail.x, y: e.detail.y}
			return;
		}
		
		lastEventCoords = {x: e.detail.x, y: e.detail.y}

		console.log(`X: ${e.detail.x}, Y: ${e.detail.y}`)
		// console.log(e)
		const adjustedX = e.detail.x / scale;
    	const adjustedY = e.detail.y / scale;

		points.push({x: adjustedX, y: adjustedY});

		if (points.length == 2) {
			// console.log(points)
			let midpoint = getPointsMidpoint(points);
			relativeTranslation = {x: (midpoint.x - origin.x), y: (midpoint.y - origin.y)};

			translation.x += relativeTranslation.x;
			translation.y += relativeTranslation.y;
			points = [];
		}


	}

	// var panMoveHandlerThrottled = _.throttle(panMoveHandler, 10, { 'leading': true, 'trailing': true });

	function panUpHandler(e: GestureCustomEvent) {
		if (scale <= 1) {
			scale = 1;
			translation = {x: 0, y: 0};
		}
		points = [];
		lastEventCoords = {x: -1, y: -1}

		savedScale = scale;
		panAndZoomInitialized = false;
	}

	var panUpHandlerDebounced = _.debounce(panUpHandler, 5, { 'leading': true, 'trailing': false });

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


	import { setPointerControls, getCenterOfTwoPoints } from 'svelte-gestures';

	function getPointersDistance(activeEvents: PointerEvent[]) {
		return Math.hypot(
			activeEvents[0].clientX - activeEvents[1].clientX,
			activeEvents[0].clientY - activeEvents[1].clientY
		);
	}

	export function multiTouch(node: HTMLElement) {
		const gestureName = 'multiTouch';
		const touchCount = 2;
		let origin: Coordinates;
		let initDistance = 0;
		let prevDistance: number | undefined;
		let scale = 1;
		let prevScale = 1;

		function onUp(activeEvents: PointerEvent[], event: PointerEvent) {
			if (activeEvents.length === 1) {
				prevDistance = undefined;
			}
			node.dispatchEvent(
				new CustomEvent(`${gestureName}Up`, {
					detail: { target: event.target },
				})
			);	
		}
			
			

		function onDown(activeEvents: PointerEvent[], event: PointerEvent) {
			if (activeEvents.length == touchCount) {
				let midX = (activeEvents[0].clientX + activeEvents[1].clientX) / 2;
				let midY = (activeEvents[0].clientY + activeEvents[1].clientY) / 2;
				initDistance = getPointersDistance(activeEvents);

				origin = {x: midX, y: midY};
				node.dispatchEvent(
					new CustomEvent(`${gestureName}Down`, {
					detail: { center: origin, target: event.target },
					})
				);	
			}
		}

		function onMove(activeEvents: PointerEvent[], event: PointerEvent) {
			if (activeEvents.length == touchCount) {
				let midX = (activeEvents[0].clientX + activeEvents[1].clientX) / 2;
				let midY = (activeEvents[0].clientY + activeEvents[1].clientY) / 2;

				const curDistance = getPointersDistance(activeEvents);

				if (prevDistance !== undefined && curDistance !== prevDistance) {
					scale = curDistance / initDistance;
				} else {
					scale = prevScale;
				}
				prevScale = scale;
				prevDistance = curDistance;

				node.dispatchEvent(
					new CustomEvent(`${gestureName}Move`, {
					detail: { center: {x: midX - origin.x, y: midY - origin.y}, scale: scale, target: event.target },
					})
				);	
			}
			return false;
		}

	

		return setPointerControls(gestureName, node, onMove, onDown, onUp);
	}


	function downhandler(event: any) {
		origin = event.detail.center;
		panAndZoomInitialized = true;
  	}

	  function movehandler(event: any) {
		// console.log(event)
		const adjustedX = event.detail.center.x / scale;
    	const adjustedY = event.detail.center.y / scale;
		translation.x = adjustedX;
		translation.y = adjustedY;
		scale = savedScale * event.detail.scale;
		scale = scale < 1 ? 1 : scale;
		// console.log(translation)
  	}

	  function uphandler(e: any) {
		if (scale <= 1) {
			scale = 1;
			translation = {x: 0, y: 0};
		}
		points = [];
		lastEventCoords = {x: -1, y: -1}

		savedScale = scale;
		panAndZoomInitialized = false;
	}

	onMount(() => {
		console.log("Zoomable mounted")
	});
  </script>
   

<!-- <div id="zoomarea" bind:this={zoomarea} use:pinch on:pinch={pinchHandler} on:wheel={wheelHandler} use:pan on:pandown={panDownHandler} on:panmove={panMoveHandler} on:panup={panUpHandlerDebounced} style="transform: scale({scale}) translate({translation.x}px, {translation.y}px); transform-origin: {origin.x}px {origin.y}px;">   -->
<div id="zoomarea" bind:this={zoomarea} use:multiTouch on:multiTouchDown={downhandler} on:multiTouchMove={movehandler} on:multiTouchUp={uphandler} style="transform: scale({scale}) translate({translation.x}px, {translation.y}px); transform-origin: {origin.x}px {origin.y}px;">  
	<slot></slot>
</div>


<style>
	#zoomarea {
		touch-action: auto;
	}
</style>