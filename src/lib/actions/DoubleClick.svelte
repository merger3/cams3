<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { am, commandText, clickTimer } from '$lib/stores';
	import type { Coordinates } from '$types';
	import { States, type Action } from '$lib/actions';

	const name = "doubleclick";

	$am.Actions[name] = {
		Name: name,
		TriggerConditions: {
			Active: new Set([
				States.StageDoubleClick
			]),
			Inactive: new Set(),
		},
		CancelConditions: {
			Active: new Set(),
			Inactive: new Set(),
		},
		IsActive: false,
		Cancel: cancel,
		Enable: enable
	}

	function enable(this: Action, origin: Coordinates) {
		console.log("Double Click")
		this.IsActive = true;
		this.IsActive = false;
	}

	function cancel(this: Action) {
		this.IsActive = false;
	}


	// function writeCommand() {
	// 	let ifOverlay = jQuery('#overlay')[0].getBoundingClientRect();
	// 	$commandText = ClickTangle({
	// 		X: dot.x() - ifOverlay.left,
	// 		Y: dot.y() - ifOverlay.top,
	// 		Width: 0,
	// 		Height: 0,
	// 		FrameWidth: $ifDimensions.width,
	// 		FrameHeight: $ifDimensions.height
	// 	}).command
	// }

	onMount(async () => {
		await tick();
 	});

</script>