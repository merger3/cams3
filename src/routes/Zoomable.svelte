<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { pinch, press, composedGesture, type PressCustomEvent, pan, type PinchCustomEvent , type GestureCustomEvent, type RegisterGestureType, type GestureCallback } from 'svelte-gestures';
	import type { Coordinates, Point } from '$types';
	import _ from 'lodash';
	import Panzoom from '@panzoom/panzoom'
	import {type PanzoomObject} from '@panzoom/panzoom'
	import { setPointerControls, getCenterOfTwoPoints } from 'svelte-gestures';
	import { drawing } from '$lib/stores';
	
	export let commandText: string;
	export let panAndZoomInitialized: boolean = false;

	let zoomarea: any;

	let origin: Coordinates = {x: 0, y: 0};

	let savedTranslation: Coordinates = {x: 0, y: 0};
	let translation: Coordinates = {x: 0, y: 0};

	let scale: number = 1;
	let savedScale: number = 1;

	function isZoomable(): boolean {
		if (commandText.startsWith("!ptzclick") || commandText.startsWith("!ptzfocusr") || $drawing) {
			return false
		}
		return true
	}


	

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
			console.log(activeEvents)
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
		if (isZoomable()) {
			panAndZoomInitialized = true;
			panzoom.setOptions({ disablePan: false, disableZoom: false })
		}
  	}

	let zoomDebounce = 0;
	let panScaler: number = 1.2;
	function movehandler(event: any) {
		if (isZoomable()) {

		}
  	}

	  function uphandler(e: any) {
		panzoom.setOptions({ disablePan: true, disableZoom: true })
		zoomDebounce = 0;
		if (panzoom.getScale() <= 1.3) {
			panzoom.reset();
			
		}
	
		panAndZoomInitialized = false;
	}
	var upHandlerDebounced = _.debounce(uphandler, 10, { 'leading': false, 'trailing': true });
	let panzoom: PanzoomObject;
	onMount(() => {
		panzoom = Panzoom(zoomarea, { noBind: false, cursor: 'default', pinchAndPan: true, disablePan: true, disableZoom: true, panOnlyWhenZoomed: true })
		console.log("Zoomable mounted")
	});
  </script>
   

<div id="zoomarea" bind:this={zoomarea} use:multiTouch on:multiTouchDown={downhandler} on:multiTouchMove={movehandler} on:multiTouchUp={upHandlerDebounced}>  
<!-- <div id="zoomarea" bind:this={zoomarea} >   -->
	<slot></slot>
</div>


<style>
	#zoomarea {
		touch-action: auto;
	}
</style>