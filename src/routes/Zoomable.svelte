<script lang="ts">
	import { onMount } from 'svelte';
	import Konva from "konva";
	import type { Coordinates } from '$types';
	import _ from 'lodash';
	import Panzoom from '@panzoom/panzoom'
	import { drawing, panzoom, multiTouch, tripleTouch, am, clickTimer } from '$lib/stores';
	import { States, type Action } from '$lib/actions';
	import type { KonvaPointerEvent } from 'konva/lib/PointerEvents';

	export let stage: Konva.Stage;
	let zoomarea: HTMLElement;

	// Instead of leaving the handlers bound all the time and just selectively triggering them
	// bind them in enable like in Scroll

	function toggleTangle(state: boolean) {
		let tangle = stage.findOne(".tangle");
		if (tangle) {
			if (!state) {
				tangle.stopDrag();
			}
			tangle.draggable(state);
			tangle.listening(state);
		}

		let transformer = stage.findOne(".transformer") as Konva.Transformer;
		if (transformer) {
			if (!state) {
				transformer.stopTransform();
			}
			transformer.resizeEnabled(state);
		}
	}

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
		MustCancel: ["draw", "click"],
		IsActive: false,
		Cancel: cancelPinch,
		Enable: enablePinch
	}

	function enablePinch(this: Action, origin: Coordinates) {
		console.log("pinch enabled")
		toggleTangle(false);
		this.MustCancel.forEach(function (actionName) {
			if ($am.Actions[actionName].IsActive) {
				$am.Actions[actionName].Cancel();
			}
		});
		this.IsActive = true;
	}

	function cancelPinch(this: Action) {
		toggleTangle(true);
		this.IsActive = false;
	}

	function doubleDownHandler(event: any) {
		if ($am.Actions[pinchName].IsActive) {}
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
		if ($am.Actions[pinchName].IsActive) {
			if ($clickTimer) {
				clearTimeout($clickTimer);
			}
			zoomDebounce = 0;
			if ($panzoom.getScale() <= 1.3) {
				$panzoom.reset();
			}
			prevScale = $panzoom.getScale();
			$am.Actions[pinchName].IsActive = false;
			toggleTangle(true);
		}
	}
	var upHandlerDebounced = _.debounce(doubleUpHandler, 10, { 'leading': false, 'trailing': true });


	const panName = "pan";
	$am.Actions[panName] = {
		Name: panName,
		ActiveConditions: new Set([
			States.ThreePointers,
			States.NodeHit
		]),
		InactiveConditions: new Set(),
		MustCancel: ["draw", "click"],
		IsActive: false,
		Enable: enablePan,
		Cancel: cancelPan
	}

	function enablePan(this: Action, origin: Coordinates) {
		toggleTangle(false);
		this.MustCancel.forEach(function (actionName) {
			if ($am.Actions[actionName].IsActive) {
				$am.Actions[actionName].Cancel();
			}
		});
		this.IsActive = true;
	}

	function cancelPan(this: Action) {
		toggleTangle(true);
		this.IsActive = false;
	}

	function tripleDownHandler(event: any) {
		if ($am.Actions[panName].IsActive) {
			prevPan = {x: $panzoom.getPan().x, y: $panzoom.getPan().y};
		}
  	}


	let prevPan: Coordinates = {x: 0, y: 0}
	function tripleMoveHandler(event: any) {
		if ($am.Actions[panName].IsActive) {
			$panzoom.pan(prevPan.x + event.detail.delta.x, prevPan.y + event.detail.delta.y)
		}
  	}

	function tripleUpHandler(e: any) {
		if ($am.Actions[panName].IsActive) {
			if ($clickTimer) {
				clearTimeout($clickTimer);
			}
			$am.Actions[panName].IsActive = false;
			toggleTangle(true);
		}
	}
	var tripleUpHandlerDebounced = _.debounce(tripleUpHandler, 10, { 'leading': false, 'trailing': true });


	const scrollName = "scrollZoom";
	$am.Actions[scrollName] = {
		Name: scrollName,
		ActiveConditions: new Set([
			States.WheelScrolling,
			States.NodeScrollHover
		]),
		InactiveConditions: new Set([
			States.CommandScrollable
		]),
		MustCancel: [],
		IsActive: false,
		Enable: enableScroll,
		Cancel: cancelScroll
	}

	let zoom = 1;
	function enableScroll(this: Action, origin: Coordinates) {
		this.IsActive = true;
		if ($am.ActiveStates.has(States.WheelScrollUp)) {
			// Scroll Up
			if (zoom < 4) {
				zoom += .2;
			}
		} else if ($am.ActiveStates.has(States.WheelScrollDown)) {
			// Scroll down
			if (zoom > 1) {
				zoom -= .2;
			} 
		}

		$panzoom.zoomToPoint(zoom, {clientX: (origin.x - $panzoom.getPan().x / $panzoom.getScale()), clientY: (origin.y - $panzoom.getPan().y / $panzoom.getScale())}, {maxScale: 4, minScale: 1, force: true});
		if ($panzoom.getScale() <= 1.1) {
			$panzoom.reset();
			zoom = 1;
		}
		this.IsActive = false;
	}

	function cancelScroll(this: Action) {
		this.IsActive = false;
	}


	const wheelPanName = "wheelPan";
	$am.Actions[wheelPanName] = {
		Name: wheelPanName,
		ActiveConditions: new Set([
			States.MiddleMouseButtonPressed,
			States.NodeHit
		]),
		InactiveConditions: new Set(),
		MustCancel: [],
		IsActive: false,
		Enable: enableWheelPan,
		Cancel: cancelWheelPan
	}

	let panOrigin: Coordinates;
	let prevMousePan: Coordinates;
	let ifOverlay: any;
	function enableWheelPan(this: Action, origin: Coordinates) {
		toggleTangle(false);
		panOrigin = {x: origin.x, y: origin.y}
		prevMousePan = {x: $panzoom.getPan().x, y: $panzoom.getPan().y};		
		ifOverlay = jQuery('#overlay')[0].getBoundingClientRect();

		stage.on('pointermove.wheel', wheelMoveHandler);
		stage.on('pointerup.wheel', wheelUpHandler);

		this.IsActive = true;
	}
		
	function cancelWheelPan(this: Action) {
		toggleTangle(true);
		stage.off('pointermove.wheel');
		stage.off('pointerup.wheel');
		
		this.IsActive = false;
	}

	function wheelMoveHandler(e: KonvaPointerEvent) {
		$panzoom.pan(prevMousePan.x + ((e.evt.clientX - ifOverlay.left) / $panzoom.getScale()) - panOrigin.x, prevMousePan.y + ((e.evt.clientY - ifOverlay.top) / $panzoom.getScale()) - panOrigin.y);
	}

	function wheelUpHandler(event: KonvaPointerEvent) {
		toggleTangle(true);
		if ($panzoom.getScale() <= 1.1) {
			$panzoom.reset();
			zoom = 1;
		}

		stage.off('pointermove.wheel');
		stage.off('pointerup.wheel');
		
		$am.Actions[wheelPanName].IsActive = false;
	}


	onMount(() => {
		$panzoom = Panzoom(zoomarea, {noBind: true, cursor: 'default', pinchAndPan: false, disablePan: false, disableZoom: false, panOnlyWhenZoomed: false, canvas: false, step: 0.6})
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
		on:tripleTouchUp={tripleUpHandlerDebounced}>
	<slot></slot>
</div>


<style>
	#zoomarea {
		/* position: fixed; */
		touch-action: auto;
	}
</style>