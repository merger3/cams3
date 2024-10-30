<script lang="ts">
	import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
	import { createEventDispatcher, onMount, tick } from 'svelte';
	import type { SwapResponse, Coordinates } from '$types';
	import { States, type Action } from '$lib/actions';
	import { am, ifDimensions, GetZone, GetCam, server, stage, zones } from '$lib/stores';
	import SubContextMenu from '$lib/actions/SubContextMenu.svelte';
	const dispatch = createEventDispatcher();
	
	let topEntry: SwapResponse = {found: false, cam: "", position: 0, swaps: {label: "", subentries: []}};
	let isOpen: boolean;
	let animationTimer: number;

	const name = "swaps";
	$am.Actions[name] = {
		Name: name,
		TriggerConditions: {
			Active: new Set([
				States.OnePointer,
				States.RightMouseButtonPressed,
				States.ClickedZone
			]),
			Inactive: new Set(),
		},
		CancelConditions: {
			Active: new Set([
				States.MiddleMouseButtonPressed
			]),
			Inactive: new Set(),
		},
		IsActive: false,
		Enable: enable,
		Cancel: cancel
	}


	let dataReady: boolean = false;
	let cancelled: boolean = true;
	function enable(this: Action, origin: Coordinates) {
		$am.Actions[name].IsActive = true;
		let target = GetZone($zones, origin);
		if (!target) {
			$am.Actions[name].Cancel();
			return;
		}

		cancelled = false;
		loadMenu(origin, Number(target.id()))
	}

	function cancel(this: Action) {
		if (isOpen) {
			isOpen = false;
			animationTimer = setTimeout(() => {
				cancelled = true;
				topEntry = {found: false, cam: "", position: 0, swaps: {label: "", subentries: []}};
				dataReady = false;
				$am.Actions[name].IsActive = false;
			}, 200);
		} else {
			cancelled = true;
			topEntry = {found: false, cam: "", position: 0, swaps: {label: "", subentries: []}};
			dataReady = false;
			$am.Actions[name].IsActive = false;
		}
	}

	async function loadMenu(coordinates: Coordinates, target: number) {
		let cam = await GetCam({coordinates: coordinates, frameWidth: $ifDimensions.width, frameHeight: $ifDimensions.height, position: target}, $server)
		if (!cam.found) {
			$am.Actions[name].Cancel();
			return;
		}

		// topEntry = await $server.post('/camera/swaps', {camera: cam.name});
		topEntry = JSON.parse(testString());
		if (!topEntry.found || !topEntry.swaps.subentries) {
			$am.Actions[name].Cancel();
			return;
		}

		
		let ifOverlay = jQuery('#overlay')[0].getBoundingClientRect();
		const rightClickEvent = new MouseEvent('contextmenu', {bubbles: true, cancelable: true, view: window, button: 2, buttons: 2, clientX: coordinates.x + ifOverlay.left, clientY: coordinates.y + ifOverlay.top});
		
		dataReady = true;

		await tick();
		jQuery('#menutrigger')[0].dispatchEvent(rightClickEvent);
	}

	function opc(open: boolean) {
		if (open) {
			dispatch("openmenu");
		} else {
			animationTimer = setTimeout(() => {
				topEntry = {found: false, cam: "", position: 0, swaps: {label: "", subentries: []}};
				dataReady = false;
				$am.Actions[name].IsActive = false;
			}, 200);
		}
	}


	function testString(): string {
		return `{
			"found": true,
			"cam": "foxes",
			"swaps": {
				"label": "foxes",
				"subentries": [
				{
					"label": "foxcorner",
					"subentries": null
				},
				{
					"label": "foxmulti",
					"subentries": null
				},
				{
					"label": "separator",
					"subentries": null
				},
				{
					"label": "wolves",
					"subentries": [
					{
						"label": "wolf",
						"subentries": null
					},
					{
						"label": "wolfcorner",
						"subentries": null
					},
					{
						"label": "wolfinside",
						"subentries": null
					},
					{
						"label": "wolfden",
						"subentries": null
					},
					{
						"label": "wolfden2",
						"subentries": null
					},
					{
						"label": "wolfmultis",
						"subentries": [
						{
							"label": "wolfmulti",
							"subentries": null
						},
						{
							"label": "wolfmulti2",
							"subentries": null
						},
						{
							"label": "wolfdenmulti",
							"subentries": null
						},
						{
							"label": "wolfdenmulti2",
							"subentries": null
						}
						]
					}
					]
				},
				{
					"label": "rats",
					"subentries": [
					{
						"label": "rat1",
						"subentries": null
					},
					{
						"label": "rat2",
						"subentries": null
					},
					{
						"label": "rat3",
						"subentries": null
					},
					{
						"label": "ratmulti",
						"subentries": null
					}
					]
				},
				{
					"label": "reptiles",
					"subentries": [
					{
						"label": "georgie",
						"subentries": null
					},
					{
						"label": "noodle",
						"subentries": null
					},
					{
						"label": "patchy",
						"subentries": null
					},
					{
						"label": "toast",
						"subentries": null
					}
					]
				},
				{
					"label": "insects",
					"subentries": [
					{
						"label": "marty",
						"subentries": null
					},
					{
						"label": "bb",
						"subentries": null
					},
					{
						"label": "roaches",
						"subentries": null
					},
					{
						"label": "hank",
						"subentries": null
					}
					]
				},
				{
					"label": "crows",
					"subentries": [
					{
						"label": "crowout",
						"subentries": null
					},
					{
						"label": "crowin",
						"subentries": null
					},
					{
						"label": "crowmulti",
						"subentries": null
					},
					{
						"label": "crowmulti2",
						"subentries": null
					}
					]
				},
				{
					"label": "marmosets",
					"subentries": [
					{
						"label": "marmin",
						"subentries": null
					},
					{
						"label": "marmout",
						"subentries": null
					},
					{
						"label": "marmmulti",
						"subentries": null
					}
					]
				},
				{
					"label": "parrots",
					"subentries": null
				},
				{
					"label": "pasture",
					"subentries": null
				},
				{
					"label": "separator",
					"subentries": null
				},
				{
					"label": "swap",
					"subentries": [
					{
						"label": "1",
						"subentries": null
					},
					{
						"label": "2",
						"subentries": null
					},
					{
						"label": "3",
						"subentries": null
					},
					{
						"label": "4",
						"subentries": null
					},
					{
						"label": "5",
						"subentries": null
					},
					{
						"label": "6",
						"subentries": null
					}
					]
				}
				]
			}
		}`;
	}


</script>
   
   <!-- let swaps: SwapResponse = {found: false, cam: "", position: 0, swaps: null} -->


<ContextMenu.Root bind:open={isOpen} onOpenChange={opc}>
	{#if $am.Actions[name].IsActive && dataReady && !cancelled}
		<ContextMenu.Trigger>
			<slot></slot>
		</ContextMenu.Trigger>
		<ContextMenu.Content class="w-52 dark:bg-slate-800 z-50" fitViewport={true} overlap={true}>
			<SubContextMenu entries={topEntry.swaps.subentries} cam={{cam: topEntry.cam, position: topEntry.position, found: true, swaps: {label: "", subentries: []}}} />
		</ContextMenu.Content>
	{/if}
</ContextMenu.Root>
	