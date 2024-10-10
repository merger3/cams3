<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { pinch, press, type PressCustomEvent, pan, type PinchCustomEvent , type GestureCustomEvent } from 'svelte-gestures';
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


	function panMoveHandler(e: GestureCustomEvent) {
		// Also check that scale is not less than 1 so panning is only possible when zoomed in
		if (!isZoomable() || !panAndZoomInitialized) {
			return;
		}

		// console.log(`X: ${e.detail.x}, Y: ${e.detail.y}`)
		console.log(e)
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
		savedScale = scale;
		panAndZoomInitialized = false;
	}

	var panUpHandlerDebounced = _.debounce(panUpHandler, 5, { 'leading': true, 'trailing': false });

	onMount(() => {
		console.log("Zoomable mounted")
	});
  </script>
   

<div id="zoomarea" bind:this={zoomarea} use:pinch on:pinch={pinchHandler} on:wheel={wheelHandler} use:pan on:pandown={panDownHandler} on:panmove={panMoveHandler} on:panup={panUpHandlerDebounced} style="transform: scale({scale}) translate({translation.x}px, {translation.y}px); transform-origin: {origin.x}px {origin.y}px;">  
	<slot></slot>
</div>


<style>
	#zoomarea {
		touch-action: auto;
	}
</style>