<script lang="ts">
	import { onMount } from 'svelte';
	import Konva from "konva";
	import type { Coordinates } from '$types';
	import _ from 'lodash';
	import Panzoom from '@panzoom/panzoom'
	import { panzoom, multiTouch, tripleTouch, am, stage } from '$lib/stores';
	import { States, type Action } from '$lib/actions';
	import type { KonvaPointerEvent } from 'konva/lib/PointerEvents';
	let zoomarea: HTMLElement;

	function toggleTangle(state: boolean) {
		$stage.find(".tangle").forEach(function (tangleGroup: any) {
			tangleGroup.getChildren().forEach(function (node: Konva.Node) {
				switch(node.getClassName()) { 
					case "Rect": { 
						node.draggable(state);
						node.listening(state);
						if (!state) {
							node.stopDrag();
						}
						break; 
					} 
					case "Transformer": { 
						node.listening(state)
						let tranformer = (node as Konva.Transformer);
						// tranformer.resizeEnabled(state);
						if (!state) {
							tranformer.stopTransform();
						}
						break; 
					} 
				} 
			});
		});
	}

	const pinchName = "pinch";
	$am.Actions[pinchName] = {
		Name: pinchName,
		TriggerConditions: {
			Active: new Set([
				States.StagePointerDown,
				States.TwoPointers,
				States.PointerAdded
			]),
			Inactive: new Set([
				States.CommandScrollable
			]),
		},
		CancelConditions: {
			Active: new Set([
				States.CommandScrollable
			]),
			Inactive: new Set([
				States.TwoPointers
			]),
		},
		IsActive: false,
		Cancel: cancelPinch,
		Enable: enablePinch
	}

	const resetThresholdDefault: number = 1.4;
	let resetThreshold: number = resetThresholdDefault;
	function enablePinch(this: Action, origin: Coordinates) {
		this.IsActive = true;
		
		toggleTangle(false);
		if ($panzoom.getScale() != 1) {
			resetThreshold = Math.max($panzoom.getScale() / 1.7, resetThresholdDefault);
		} else {
			resetThreshold = resetThresholdDefault;
		}
		zoomarea.addEventListener("multiTouchMove", doubleMoveHandler);
		zoomarea.addEventListener("multiTouchUp", upHandlerDebounced);
	}

	function cancelPinch(this: Action) {
		toggleTangle(true);
		zoomarea.removeEventListener("multiTouchMove", doubleMoveHandler);
		zoomarea.removeEventListener("multiTouchUp", upHandlerDebounced);
		this.IsActive = false;
	}

	let zoomDebounced: boolean = false;
	let prevScale: number = 1;
	function doubleMoveHandler(event: any) {
		let scale: number = prevScale * event.detail.scale;
		// scale = scale < 1 ? 1 : scale;
		if (zoomDebounced) {
			$panzoom.zoomToPoint(scale, {clientX: (event.detail.center.x), clientY: (event.detail.center.y)})
			setTimeout(() => $panzoom.pan(event.detail.rawDelta.x / $panzoom.getScale(), event.detail.rawDelta.y / $panzoom.getScale(), {relative: true}))
		} else {
			zoomDebounced = true;
		}
  	}

	function doubleUpHandler(e: any) {	
		zoomDebounced = false;
		
		if ($panzoom.getScale() <= resetThreshold) {
			$panzoom.reset();
			resetThreshold = resetThresholdDefault;
		}
		prevScale = $panzoom.getScale();
		zoom = prevScale;
		zoomarea.removeEventListener("multiTouchMove", doubleMoveHandler);
		zoomarea.removeEventListener("multiTouchUp", upHandlerDebounced);
		toggleTangle(true);
		$am.Actions[pinchName].IsActive = false;
	}
	var upHandlerDebounced = _.debounce(doubleUpHandler, 10, { 'leading': false, 'trailing': true });


	const panName = "pan";
	$am.Actions[panName] = {
		Name: panName,
		TriggerConditions: {
			Active: new Set([
				States.StagePointerDown,
				States.ThreePointers,
				States.PointerAdded
			]),
			Inactive: new Set([

			]),
		},
		CancelConditions: {
			Active: new Set([
			
			]),
			Inactive: new Set([
				States.ThreePointers
			]),
		},
		IsActive: false,
		Enable: enablePan,
		Cancel: cancelPan
	}
	
	let prevPan: Coordinates;
	function enablePan(this: Action, origin: Coordinates) {
		this.IsActive = true;
	
		toggleTangle(false);
		prevPan = {x: $panzoom.getPan().x, y: $panzoom.getPan().y};

		zoomarea.addEventListener("tripleTouchMove", tripleMoveHandler);
		zoomarea.addEventListener("tripleTouchUp", tripleUpHandlerDebounced);
	}

	function cancelPan(this: Action) {
		toggleTangle(true);
		zoomarea.removeEventListener("tripleTouchMove", tripleMoveHandler);
		zoomarea.removeEventListener("tripleTouchUp", tripleUpHandlerDebounced);
		this.IsActive = false;
	}


	function tripleMoveHandler(event: any) {
		$panzoom.pan(prevPan.x + event.detail.delta.x, prevPan.y + event.detail.delta.y)
  	}

	function tripleUpHandler(e: any) {
		toggleTangle(true);
		if ($panzoom.getScale() == 1) {
			$panzoom.reset();
		}
		zoomarea.removeEventListener("tripleTouchMove", tripleMoveHandler);
		zoomarea.removeEventListener("tripleTouchUp", tripleUpHandlerDebounced);
		$am.Actions[panName].IsActive = false;
	}
	var tripleUpHandlerDebounced = _.debounce(tripleUpHandler, 10, { 'leading': false, 'trailing': true });


	const scrollName = "scrollZoom";
	$am.Actions[scrollName] = {
		Name: scrollName,
		TriggerConditions: {
			Active: new Set([
				States.WheelScrolling
			]),
			Inactive: new Set([
				States.StagePointerDown,
				States.CommandScrollable
			]),
		},
		CancelConditions: {
			Active: new Set([
				States.CommandScrollable
			]),
			Inactive: new Set(),
		},
		IsActive: false,
		Enable: enableScroll,
		Cancel: cancelScroll
	}

	let zoom = 1;
	function enableScroll(this: Action, origin: Coordinates) {
		this.IsActive = true;
		if ($am.ActiveStates.has(States.WheelScrollUp)) {
			if (zoom < 4) {
				zoom += .3;
			}
		} else if ($am.ActiveStates.has(States.WheelScrollDown)) {
			if (zoom > 1) {
				zoom -= .3;
			} 
		}

		$panzoom.zoomToPoint(zoom, {clientX: (origin.x - $panzoom.getPan().x / $panzoom.getScale()), clientY: (origin.y - $panzoom.getPan().y / $panzoom.getScale())}, {force: true});
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
		TriggerConditions: {
			Active: new Set([
				States.StagePointerDown,
				States.MiddleMouseButtonPressed
			]),
			Inactive: new Set(),
		},
		CancelConditions: {
			Active: new Set(),
			Inactive: new Set([
				States.StagePointerDown,
				States.MiddleMouseButtonPressed
			]),
		},
		IsActive: false,
		Enable: enableWheelPan,
		Cancel: cancelWheelPan
	}

	let panOrigin: Coordinates;
	let prevMousePan: Coordinates;
	let ifOverlay: any;
	function enableWheelPan(this: Action, origin: Coordinates) {
		this.IsActive = true;
		
		toggleTangle(false);
		panOrigin = {x: origin.x, y: origin.y}
		prevMousePan = {x: $panzoom.getPan().x, y: $panzoom.getPan().y};		
		ifOverlay = jQuery('#overlay')[0].getBoundingClientRect();

		$stage.on('pointermove.wheel', wheelMoveHandler);
		$stage.on('pointerup.wheel', wheelUpHandler);
	}
		
	function cancelWheelPan(this: Action) {
		toggleTangle(true);
		$stage.off('pointermove.wheel');
		$stage.off('pointerup.wheel');
		
		this.IsActive = false;
	}

	function wheelMoveHandler(e: KonvaPointerEvent) {
		$panzoom.pan(prevMousePan.x + ((e.evt.clientX - ifOverlay.left) / $panzoom.getScale()) - panOrigin.x, prevMousePan.y + ((e.evt.clientY - ifOverlay.top) / $panzoom.getScale()) - panOrigin.y);
	}

	function wheelUpHandler(event: KonvaPointerEvent) {
		toggleTangle(true);
		if ($panzoom.getScale() == 1) {
			$panzoom.reset();
			zoom = 1;
		}

		$stage.off('pointermove.wheel');
		$stage.off('pointerup.wheel');
		
		$am.Actions[wheelPanName].IsActive = false;
	}



	const mousePanName = "mousePan";
	$am.Actions[mousePanName] = {
		Name: mousePanName,
		TriggerConditions: {
			Active: new Set([
				States.StagePointerDown,
				States.RightMouseButtonPressed,
				States.StageDraggingDejittered
			]),
			Inactive: new Set(),
		},
		CancelConditions: {
			Active: new Set(),
			Inactive: new Set([
				States.StagePointerDown,
				States.RightMouseButtonPressed
			]),
		},
		IsActive: false,
		Enable: enableMousePan,
		Cancel: cancelMousePan
	}

	function enableMousePan(this: Action, origin: Coordinates) {
		this.IsActive = true;

		toggleTangle(false);
		panOrigin = {x: origin.x, y: origin.y}
		prevMousePan = {x: $panzoom.getPan().x, y: $panzoom.getPan().y};		
		ifOverlay = jQuery('#overlay')[0].getBoundingClientRect();

		$stage.on('pointermove.mouse', mouseMoveHandler);
		$stage.on('pointerup.mouse', mouseUpHandler);		
	}
		
	function cancelMousePan(this: Action) {
		toggleTangle(true);
		$stage.off('pointermove.mouse');
		$stage.off('pointerup.mouse');
		
		this.IsActive = false;
	}

	function mouseMoveHandler(e: KonvaPointerEvent) {
		$panzoom.pan(prevMousePan.x + ((e.evt.clientX - ifOverlay.left) / $panzoom.getScale()) - panOrigin.x, prevMousePan.y + ((e.evt.clientY - ifOverlay.top) / $panzoom.getScale()) - panOrigin.y);
	}

	function mouseUpHandler(event: KonvaPointerEvent) {
		toggleTangle(true);
		if ($panzoom.getScale() == 1) {
			$panzoom.reset();
			zoom = 1;
		}

		$stage.off('pointermove.mouse');
		$stage.off('pointerup.mouse');
		
		$am.Actions[mousePanName].IsActive = false;
	}


	// This block is not used but I can't bring myself to get rid of it because it's cool code

	// import { pinch, press, composedGesture, type PressCustomEvent, pan, type PinchCustomEvent , type GestureCustomEvent, type RegisterGestureType, type GestureCallback, type BaseParams, type GestureReturnType} from 'svelte-gestures';
	// const scrollPan: GestureCallback = (register: RegisterGestureType) => {
	// 	const doubleFns = register(multiTouch, {composed: true, touchAction: "none"});
	// 	const tripleFns = register(tripleTouch, {composed: true, touchAction: "none"});

	// 	return (activeEvents: PointerEvent[], event: PointerEvent) => {
	// 		doubleFns.onMove(activeEvents, event);
	// 		tripleFns.onMove(activeEvents, event);
	// 		return true;
	// 	};
	// };



	onMount(() => {
		$panzoom = Panzoom(zoomarea, {noBind: true, cursor: 'default', pinchAndPan: false, disablePan: false, disableZoom: false, panOnlyWhenZoomed: false, canvas: false, step: 0.6, maxScale: 4, minScale: .7})
	});

  </script>
   

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div id="zoomarea" bind:this={zoomarea} 
	use:multiTouch 
	use:tripleTouch>
	<slot></slot>
</div>


<style>
	#zoomarea {
		/* position: fixed; */
		touch-action: auto;
	}
</style>