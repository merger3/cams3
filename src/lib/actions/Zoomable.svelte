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
						tranformer.resizeEnabled(state);
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

	function enablePinch(this: Action, origin: Coordinates) {
		toggleTangle(false);

		zoomarea.addEventListener("multiTouchMove", doubleMoveHandler);
		zoomarea.addEventListener("multiTouchUp", upHandlerDebounced);
		this.IsActive = true;
	}

	function cancelPinch(this: Action) {
		toggleTangle(true);
		zoomarea.removeEventListener("multiTouchMove", doubleMoveHandler);
		zoomarea.removeEventListener("multiTouchUp", upHandlerDebounced);
		this.IsActive = false;
	}

	let zoomDebounce = 0;
	let prevScale: number = 1;
	function doubleMoveHandler(event: any) {
		let scale: number = prevScale * event.detail.scale;
		scale = scale < 1 ? 1 : scale;
		if (zoomDebounce > 2) {
			$panzoom.zoomToPoint(scale, {clientX: (event.detail.center.x - $panzoom.getPan().x), clientY: (event.detail.center.y - $panzoom.getPan().y)}, {minScale: 1, maxScale: 4})
		} else {
			zoomDebounce++;
		}
  	}

	function doubleUpHandler(e: any) {	
		zoomDebounce = 0;
		if ($panzoom.getScale() <= 1.3) {
			$panzoom.reset();
		}
		prevScale = $panzoom.getScale();
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
	
	let prevPan: Coordinates = {x: 0, y: 0}
	function enablePan(this: Action, origin: Coordinates) {
		toggleTangle(false);
		prevPan = {x: $panzoom.getPan().x, y: $panzoom.getPan().y};

		zoomarea.addEventListener("tripleTouchMove", tripleMoveHandler);
		zoomarea.addEventListener("tripleTouchUp", tripleUpHandlerDebounced);
		this.IsActive = true;
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
		if ($panzoom.getScale() <= 1.3) {
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
				States.CommandScrollable
			]),
		},
		CancelConditions: {
			Active: new Set([
				States.CommandScrollable
			]),
			Inactive: new Set([

			]),
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
				zoom += .2;
			}
		} else if ($am.ActiveStates.has(States.WheelScrollDown)) {
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
		toggleTangle(false);
		panOrigin = {x: origin.x, y: origin.y}
		prevMousePan = {x: $panzoom.getPan().x, y: $panzoom.getPan().y};		
		ifOverlay = jQuery('#overlay')[0].getBoundingClientRect();

		$stage.on('pointermove.wheel', wheelMoveHandler);
		$stage.on('pointerup.wheel', wheelUpHandler);

		this.IsActive = true;
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
		if ($panzoom.getScale() <= 1.1) {
			$panzoom.reset();
			zoom = 1;
		}

		$stage.off('pointermove.wheel');
		$stage.off('pointerup.wheel');
		
		$am.Actions[wheelPanName].IsActive = false;
	}


	onMount(() => {
		$panzoom = Panzoom(zoomarea, {noBind: true, cursor: 'default', pinchAndPan: false, disablePan: false, disableZoom: false, panOnlyWhenZoomed: false, canvas: false, step: 0.6})
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