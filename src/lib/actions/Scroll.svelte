<script lang="ts">
	import { onMount, tick, createEventDispatcher } from 'svelte';
	import { am, commandText, clickFocus, clickZoom, clickTimer } from '$lib/stores';
	import type { Coordinates } from '$types';
	import { States, type Action } from '$lib/actions';
	import _ from 'lodash';
	
	const dispatch = createEventDispatcher();
	const maxZoom: number = 300;
	const maxZoomTouch: number = 300;
	
	const name = "scroll";
	$am.Actions[name] = {
		Name: name,
		TriggerConditions: {
			Active: new Set([
				States.StagePointerDown,
				States.PointerAdded,
				States.TwoPointers,
				States.CommandScrollable
			]),
			Inactive: new Set([

			]),
		},
		CancelConditions: {
			Active: new Set([
			
			]),
			Inactive: new Set([
				States.StagePointerDown,
				States.TwoPointers,
				States.CommandScrollable
			]),
		},
		IsActive: false,
		Enable: enable,
		Cancel: cancel
	}

	function enable(this: Action, origin: Coordinates) {
		jQuery('#overlay')[0].addEventListener("multiTouchMove", panMove);
		jQuery('#overlay')[0].addEventListener("multiTouchUp", panUpDebounced);
		this.IsActive = true;
	}

	function cancel(this: Action) {
		jQuery('#overlay')[0].removeEventListener("multiTouchMove", panMove);
		jQuery('#overlay')[0].removeEventListener("multiTouchUp", panUpDebounced);

		this.IsActive = false;
	}

	function panMove(event: any) {
		if ($commandText.startsWith("!ptzclick") || $commandText.startsWith("!ptzzoomr")) {
			if (event.detail.notch == 1) {
				if ($clickZoom >= 100) {
					$clickZoom += 20;
				} else if ($clickZoom < 10) {
					$clickZoom += 5;
				} else {
					$clickZoom += 10;
				}
				if ($clickZoom > maxZoomTouch) {
					$clickZoom = 10000;
				}
			} else if (event.detail.notch == -1) {
				if ($clickZoom >= 10000) {
					$clickZoom = maxZoomTouch;			
				} else if ($clickZoom > 0) {
					if ($clickZoom > 100) {
						$clickZoom -= 20;
					} else if ($clickZoom <= 10) {
						$clickZoom -= 5;
					} else {
						$clickZoom -= 10;
					}
				} 
				if ($clickZoom < 0) {
					$clickZoom = 0;
				}
			}
			$commandText = `${$commandText.split(" ").slice(0, -1).join(" ")} ${$clickZoom}`;
		} else if ($commandText.startsWith("!ptzfocusr"))  {
			if (event.detail.notch == 1) {
				$clickFocus += 25
			} else if (event.detail.notch == -1) {
				$clickFocus -= 25;
			}
			$commandText = `${$commandText.split(" ").slice(0, -1).join(" ")} ${$clickFocus}`;
		}
	}


	function panUp(gestureEvent: any) {
		jQuery('#overlay')[0].removeEventListener("multiTouchMove", panMove);
		jQuery('#overlay')[0].removeEventListener("multiTouchUp", panUpDebounced);
		$am.Actions[name].IsActive = false;
	}
	var panUpDebounced = _.debounce(panUp, 10, { 'leading': false, 'trailing': true });



	const scrollName = "wheelScroll";
	$am.Actions[scrollName] = {
		Name: scrollName,
		TriggerConditions: {
			Active: new Set([
				States.WheelScrolling,
				States.CommandScrollable
			]),
			Inactive: new Set(),
		},
		CancelConditions: {
			Active: new Set(),
			Inactive: new Set([
				States.CommandScrollable
			]),
		},
		IsActive: false,
		Enable: enableScroll,
		Cancel: cancelScroll
	}

	function enableScroll(this: Action, origin: Coordinates) {
		this.IsActive = true;
		if ($commandText.startsWith("!ptzclick") || $commandText.startsWith("!ptzzoomr")) {
			if ($am.ActiveStates.has(States.WheelScrollUp)) {
				if ($clickZoom >= 100) {
					$clickZoom += 20;
				} else if ($clickZoom < 10) {
					$clickZoom += 5;
				} else {
					$clickZoom += 10;
				}
				if ($clickZoom > maxZoom) {
					$clickZoom = 10000;
				}
			} else if ($am.ActiveStates.has(States.WheelScrollDown)) {
				if ($clickZoom >= 10000) {
					$clickZoom = maxZoom;			
				} else if ($clickZoom > 0) {
					if ($clickZoom > 100) {
						$clickZoom -= 20;
					} else if ($clickZoom <= 10) {
						$clickZoom -= 5;
					} else {
						$clickZoom -= 10;
					}
				} 
				if ($clickZoom < 0) {
					$clickZoom = 0;
				}

			}
			$commandText = `${$commandText.split(" ").slice(0, -1).join(" ")} ${$clickZoom}`;
		} else if ($commandText.startsWith("!ptzfocusr")) {
			if ($am.ActiveStates.has(States.WheelScrollUp)) {
				$clickFocus += 25;
			} else if ($am.ActiveStates.has(States.WheelScrollDown)) {
				$clickFocus -= 25;
			}
			$commandText = `${$commandText.split(" ").slice(0, -1).join(" ")} ${$clickFocus}`;
		}
		this.IsActive = false;
	}

	function cancelScroll(this: Action) {
		this.IsActive = false;
	}

</script>