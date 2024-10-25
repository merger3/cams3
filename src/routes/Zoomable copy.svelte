<script lang="ts">
	import { onMount } from 'svelte';
	import { type RegisterGestureType, type GestureCallback } from 'svelte-gestures';
	import type { Coordinates } from '$types';
	import _ from 'lodash';
	import Panzoom from '@panzoom/panzoom'
	import { drawing, panzoom, multiTouch, tripleTouch, am } from '$lib/stores';
	import { States, type Action } from '$lib/actions';


	let zoomarea: HTMLElement;

	const pinchName = "pinch";

	$am.Actions[pinchName] = {
		Name: pinchName,
		ActiveConditions: new Set([
			States.TwoPointers,
			States.NodeHit
		]),
		InactiveConditions: new Set([
			States.CommandScrollable
		]),
		MustCancel: [],
		IsActive: false,
		Cancel: cancelPinch,
		Enable: enablePinch
	}

	function enablePinch(this: Action, origin: Coordinates) {
		this.IsActive = true;
	}

	function cancelPinch(this: Action) {
		this.IsActive = false;
	}

	function doubleDownHandler(event: any) {
		if ($am.Actions[pinchName].IsActive) {

		}
  	}

	let zoomDebounce = 0;
	let prevScale: number = 1;
	function doubleMoveHandler(event: any) {
		if ($am.Actions[pinchName].IsActive) {
			let scale: number = prevScale * event.detail.scale;
			scale = scale < 1 ? 1 : scale;
			if (zoomDebounce > 2) {
				$panzoom.zoomToPoint(scale, {clientX: (event.detail.center.x - $panzoom.getPan().x), clientY: (event.detail.center.y - $panzoom.getPan().y)}, {minScale: 1, maxScale: 4})
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
		$am.Actions[pinchName].IsActive = false;
	}
	var upHandlerDebounced = _.debounce(doubleUpHandler, 10, { 'leading': false, 'trailing': true });


	


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

	

	

	

	
/////////////////////////////////


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