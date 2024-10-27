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
		ActiveConditions: new Set([
			States.TwoPointers,
			States.ZoneHit,
			States.CommandScrollable
		]),
		InactiveConditions: new Set(),
		MustCancel: ["draw"],
		IsActive: false,
		Enable: enable,
		Cancel: cancel
	}

	function enable(this: Action, origin: Coordinates) {
		this.MustCancel.forEach(function (actionName) {
			if ($am.Actions[actionName].IsActive) {
				$am.Actions[actionName].Cancel();
			}
		});
		jQuery('#overlay')[0].addEventListener("multiTouchMove", panMove);
		jQuery('#overlay')[0].addEventListener("multiTouchUp", panUpDebounced);
		this.IsActive = true;
	}

	function cancel(this: Action) {
		jQuery('#overlay')[0].removeEventListener("multiTouchMove", panMove);
		jQuery('#overlay')[0].removeEventListener("multiTouchUp", panUpDebounced);
		$clickZoom = 100;
		$clickFocus = 0;
		this.IsActive = false;	}

	function panMove(event: any) {
		let forceResize: boolean = false;
		if ($commandText.startsWith("!ptzclick")) {
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
					forceResize = true;
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
		} else if ($commandText.startsWith("!ptzfocusr"))  {
			if (event.detail.notch == 1) {
				$clickFocus += 25
			} else if (event.detail.notch == -1) {
				$clickFocus -= 25;
			}
		}
		$commandText = `${$commandText.split(" ").slice(0, -1).join(" ")} ${$clickZoom}`;
		if (forceResize) {
			dispatch('forceiframeresize');
		}
	}


	function panUp(gestureEvent: any) {
		if ($clickTimer) {
			clearTimeout($clickTimer);
		}
		jQuery('#overlay')[0].removeEventListener("multiTouchMove", panMove);
		jQuery('#overlay')[0].removeEventListener("multiTouchUp", panUpDebounced);
		$am.Actions[name].IsActive = false;
	}
	var panUpDebounced = _.debounce(panUp, 10, { 'leading': false, 'trailing': true });



	const scrollName = "scroll";
	$am.Actions[scrollName] = {
		Name: scrollName,
		ActiveConditions: new Set([
			States.WheelScrolling,
			States.CommandScrollable
		]),
		InactiveConditions: new Set(),
		MustCancel: [],
		IsActive: false,
		Enable: enableScroll,
		Cancel: cancelScroll
	}

	function enableScroll(this: Action, origin: Coordinates) {
		this.IsActive = true;
		let forceResize: boolean = false;
		if ($commandText.startsWith("!ptzclick")) {
			if ($am.ActiveStates.has(States.WheelScrollUp)) {
				if ($clickZoom >= 100) {
					$clickZoom += 20;
				} else if ($clickZoom < 10) {
					$clickZoom += 10;
				} else {
					$clickZoom += 10;
				}
				if ($clickZoom > maxZoom) {
					$clickZoom = 10000;
					forceResize = true;
				}
			} else if ($am.ActiveStates.has(States.WheelScrollDown)) {
				if ($clickZoom >= 10000) {
					$clickZoom = maxZoom;			
				} else if ($clickZoom > 0) {
					if ($clickZoom > 100) {
						$clickZoom -= 20;
					} else if ($clickZoom <= 10) {
						$clickZoom -= 10;
					} else {
						$clickZoom -= 10;
					}
				} 
				if ($clickZoom < 0) {
					$clickZoom = 0;
				}

			}
		} else if ($commandText.startsWith("!ptzfocusr")) {
			if ($am.ActiveStates.has(States.WheelScrollUp)) {
				$clickFocus += 25;
			} else if ($am.ActiveStates.has(States.WheelScrollDown)) {
				$clickFocus -= 25;
			}
		}
		$commandText = `${$commandText.split(" ").slice(0, -1).join(" ")} ${$clickZoom}`;
		if (forceResize) {
			dispatch('forceiframeresize');
		}
		this.IsActive = false;
	}

	function cancelScroll(this: Action) {
		$clickZoom = 100;
		$clickFocus = 0;
		this.IsActive = false;
	}


	onMount(async () => {
		await tick();
 	});

</script>