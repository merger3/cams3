<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { pinch, press, type PressCustomEvent, pan, type PinchCustomEvent , type GestureCustomEvent } from 'svelte-gestures';
	import type { Coordinates, Point } from '$types';
	import _ from 'lodash';
	const dispatch = createEventDispatcher();
	
	export let commandText: string;

	let zoomarea: any;

	let emptyPoint: Point = {position: {x: 0, y: 0}, initialized: false};

	let Point1: Point = emptyPoint;
	let Point2: Point = emptyPoint;

	function resetPoints() {
		Point1 = emptyPoint;
		Point2 = emptyPoint;
		if (zoomScale <= 1) {
			zoomScale = 1;
			translation = {x: 0, y: 0};
		}
		zoomScale = zoomScale < 1 ? 1 : zoomScale;
		// centerPoint = {x: 0, y: 0};
	}

	function isZoomable(): boolean {
		if (commandText.startsWith("!ptzclick") || commandText.startsWith("!ptzfocusr")) {
			return false
		}
		return true
	}


	function getPointsMidpoint(): Point {
		let midX = (Point1.position.x + Point2.position.x) / 2;
		let midY = (Point1.position.y + Point2.position.y) / 2;

		return {position: {x: Math.round(midX), y: Math.round(midY)}, initialized: true};
	}

	function applyScaledTranslation(translateX: number, translateY: number) {
		const rect = zoomarea.getBoundingClientRect();

		const scaledWidth = rect.width * zoomScale;
		const scaledHeight = rect.height * zoomScale;

		const maxTranslateX = (scaledWidth - rect.width) / 2;
		const maxTranslateY = (scaledHeight - rect.height) / 2;

		const constrainedTranslateX = Math.max(-maxTranslateX, Math.min(translateX, maxTranslateX));
		const constrainedTranslateY = Math.max(-maxTranslateY, Math.min(translateY, maxTranslateY));

		translation = {x: constrainedTranslateX, y: constrainedTranslateY};
	}

	let relativeTranslation: Coordinates = {x: 0, y: 0};
	let translation: Coordinates = {x: 0, y: 0};

	let zoomScale: number = 1;
	let zoomX: number;
	let zoomY: number;
	function pinchHandlerThrottled(event: PinchCustomEvent) {
		// can probably remove pan and zoom init check
		if (!panAndZoomInitialized || !isZoomable()) {
			return;
		}
		// zoomScale = Math.max(event.detail.scale, 1);
		zoomScale = event.detail.scale;
		// zoomScale += (event.detail.scale - zoomScale)
		console.log(zoomScale);
		zoomX = event.detail.center.x;
		zoomY = event.detail.center.y;
  	}

	// var pinchHandlerThrottled = _.throttle(pinchHandler, 10, { 'leading': true, 'trailing': true });




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

	let centerPoint: Coordinates = {x: 0, y: 0};
	export let panAndZoomInitialized: boolean = false;
	function panDownHandler(e: GestureCustomEvent) {
		if (!isZoomable()) {
			return;
		}

		const adjustedX = e.detail.x / zoomScale;
    	const adjustedY = e.detail.y / zoomScale;

		if (e.detail.pointersCount == 1) {
			Point1 = {position: {x: adjustedX, y: adjustedY}, initialized: true};
		} else if (e.detail.pointersCount == 2) {
			Point2 = {position: {x: adjustedX, y: adjustedY}, initialized: true};
		} else {
			resetPoints();
			return;
		}
		if (Point1.initialized && Point2.initialized) {
			centerPoint = getPointsMidpoint().position;
			panAndZoomInitialized = true;
		}
	}

	let panSensitivity = 1;
	function panMoveHandler(e: GestureCustomEvent) {
		// Also check that scale is not less than 1 so panning is only possible when zoomed in
		if (!isZoomable() || !panAndZoomInitialized) {
			return;
		}
		// console.log(`X: ${e.detail.x}, Y: ${e.detail.y}`)

		// console.log(e.detail);
		if (pointsNet({x: e.detail.x, y: e.detail.y})) {
			
			let center: Point = getPointsMidpoint();
			if (!center.initialized) {
				return;
			}

			// console.log(center.position)
			// applyScaledTranslation(center.position.x - centerPoint.x, center.position.y - centerPoint.y);
			relativeTranslation = {x: (center.position.x - centerPoint.x) * panSensitivity, y: (center.position.y - centerPoint.y) * panSensitivity};
			translation.x += relativeTranslation.x;
			translation.y += relativeTranslation.y;

		}
	}

	var panMoveHandlerThrottled = _.throttle(panMoveHandler, 10, { 'leading': true, 'trailing': true });

	function panUpHandler(e: GestureCustomEvent) {
		// reset both points unconditionally
		// storeTranslation();
		resetPoints();
		panAndZoomInitialized = false;
	}

	var panUpHandlerDebounced = _.debounce(panUpHandler, 5, { 'leading': false, 'trailing': true });

	let maxDelta: number = 50;

	let lastPointCaught: number = 0;
	function pointsNet (eventCoordinates: Coordinates): boolean {
		let pointCaught: number = 0;

		const adjustedX = eventCoordinates.x / zoomScale;
		const adjustedY = eventCoordinates.y / zoomScale;

		// console.log(`Event X: ${eventCoordinates.x},. Event Y: ${eventCoordinates.y}`)
		// console.log(`Scale: ${zoomScale}`)
		if ((Math.abs(Point1.position.x - adjustedX) <= maxDelta) && (Math.abs(Point1.position.y - adjustedY) <= maxDelta)) {
			// console.log("point 1 caught");
			Point1.position = { x: adjustedX, y: adjustedY }; // Save the unscaled coordinates
			pointCaught = 1;
		} else if (!Point2.initialized || ((Math.abs(Point2.position.x - adjustedX) <= maxDelta) && (Math.abs(Point2.position.y - adjustedY) <= maxDelta))) {
			// console.log("point 2 caught");
			Point2.position = { x: adjustedX, y: adjustedY }; // Save the unscaled coordinates
			pointCaught = 2;
		} else {
			// console.log("Bad point caught!");
			// Point1.position = { x: adjustedX, y: adjustedY };
			// Point2.initialized = false;
		}

		let bothPointsCaught: boolean = (pointCaught != 0 && pointCaught != lastPointCaught);
		lastPointCaught = pointCaught;
		return bothPointsCaught;
	}



	onMount(() => {
		console.log("Zoomable mounted")
	});
  </script>
   
   <!-- let swaps: SwapResponse = {found: false, cam: "", position: 0, swaps: null} -->

<div id="zoomarea" bind:this={zoomarea} use:pinch on:pinch={pinchHandlerThrottled} on:wheel={wheelHandler} use:pan on:pandown={panDownHandler} on:panmove={panMoveHandlerThrottled} on:panup={panUpHandlerDebounced} style="transform: scale({zoomScale}) translate({translation.x}px, {translation.y}px); ; transform-origin: {centerPoint.x}px {centerPoint.y}px;">  
	<slot></slot>
</div>