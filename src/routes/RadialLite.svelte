<script lang="ts">
	import { Arc, Group, Text, Stage, Layer } from "svelte-konva";
	import Konva from "konva";
	import { createEventDispatcher, onMount, tick } from 'svelte';
	import type { RadialPart, RadialMenu, Coordinates, SwapResponse } from '$types';
	import _ from 'lodash';
	import { server, panzoom, GetCam, ifDimensions, am, stage, commandText, GetZone, zones, Reset, clickFocus, camPresets } from '$lib/stores';
	import { ClickTangle } from '$lib/rect';
	import { States, type Action } from '$lib/actions';
	import { Zones, AddSelection, RemoveSelection } from '$lib/zones';
	import { RadialMenus, Transparency } from '$lib/radials';
	import { portal } from "svelte-portal";
	const dispatch = createEventDispatcher();

	export let stageWidth: number;
	export let stageHeight: number;

	const defaultCMD: string = "​";
	const mainMenu = "main";

	let innerRadius: number;
	let outerRadius: number;

	let radialStage: Konva.Stage;
	export let radialLayer: Konva.Layer;
	let radials: Konva.Group;
	let label: Konva.Text;
	

	const name = "radial";
	$am.Actions[name] = {
		Name: name,
		TriggerConditions: {
			Active: new Set([
				States.StagePointerDown,
				States.OnePointer,
				States.PointerAdded,
				States.LeftMouseButtonPressed,
				States.StagePressed
			]),
			Inactive: new Set([
				States.StageDraggingBuffered
			]),
		},
		CancelConditions: {
			Active: new Set([
				States.StageDraggingBuffered
			]),
			Inactive: new Set([
				States.StagePressed,
				States.StagePointerDown,
				States.OnePointer
			]),
		},
		IsActive: false,
		Enable: enable,
		Cancel: cancel
	}
	
	let fontSize: number = 0;
	let activeMenu: RadialMenu | undefined;
	let zone: Konva.Rect;
	function enable(this: Action, origin: Coordinates) {		
		zone = GetZone($zones, {x: (origin.x / $panzoom.getScale()), y: (origin.y / $panzoom.getScale())});
		if (!zone) {
			return;
		}
		
		let ifOverlay = jQuery('#overlay')[0].getBoundingClientRect();
		origin = {x: (origin.x + ifOverlay.left), y: (origin.y + ifOverlay.top)}

		$stage.find(".tangle").forEach(function (tangleGroup: any) {
			tangleGroup.getChildren().forEach(function (node: Konva.Node) {
				switch(node.getClassName()) { 
					case "Rect": { 
						node.stopDrag();
						break; 
					} 
					case "Transformer": { 
						let tranformer = (node as Konva.Transformer);
						tranformer.stopTransform();
						break; 
					} 
				} 
			});
		});

		activeMenu = RadialMenus[mainMenu];
		if (!activeMenu) {
			return;
		}
		activeMenu.location = origin;
		activeMenu.target = Number(zone.name());


		AddSelection(zone, Zones.Radial);
		// zone.stroke('rgba(136, 48, 10, 1)');
		// zone.strokeWidth(2.5);
		// zone.moveToTop();

		radialLayer.listening(true);
		radialStage.listening(true);
		jQuery('#stage').css('z-index', '49');

		fontSize = (2 * parseFloat(getComputedStyle(document.documentElement).fontSize));
		innerRadius = (window.innerHeight * .08);
		outerRadius = (window.innerHeight * .08) + (window.innerHeight * .13);
		this.IsActive = true;
	}

	function cancel(this: Action) {
		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
		}
		activeMenu = undefined;
		radialLayer.listening(false);
		radialStage.listening(false);
		jQuery('#stage').css('z-index', '');

		RemoveSelection(Zones.Radial);
		zone = undefined;

		this.IsActive = false;
	}

	function getFunctionFromName(name: string) {
		let func = rh[name] ? rh[name] : defaultAction;
    	return func;
	}

	function loadNewMenu(r: RadialPart) {
		if (RadialMenus[r.submenu] != undefined) {
			let newMenu = RadialMenus[r.submenu];
			newMenu.location = activeMenu.location;
			newMenu.target = activeMenu.target;
			if (r.label != "back" && r.label != "prev" && r.label != "previous") {
				newMenu.parts.forEach((part) => {
					if (part.label == "back" || part.label == "prev" || part.label == "previous") {
						part.submenu = activeMenu.name;
					}
				});
			}
			activeMenu = newMenu;
		}	
	}

	let hoverTimeout: number;
	function highlightRadial(e: CustomEvent, r: RadialPart) {
		(e.detail.target as Konva.Shape).fill("rgba(92, 150, 255, 0.15)")
		let hoveredElementPos = e.detail.target.getPosition();
		label.position({x: hoveredElementPos.x, y: hoveredElementPos.y});
		label.offsetX(label.width() / 2);
		label.offsetY(label.height() / 2);
		label.text(r.label);
		label.show();

		if (r.submenu) {
			hoverTimeout = setTimeout(() => {
				loadNewMenu(r);
			}, 400);
		}
	}

	function unhighlightRadial(e: CustomEvent, r: RadialPart) {
		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
		}
		(e.detail.target as Konva.Shape).fill(r.color);
		label.hide();
	}

	function defaultAction() {
		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
		}
	};

	function radialStageHandlePointerUp(e: any) {
		dispatch("simulatepointerup", {event: e});
	}

	function arcCustomHitbox(context: Konva.Context, shape: any) {
		var arc = shape as Konva.Arc;
		var angle = Konva.getAngle(arc.angle()),
		clockwise = arc.clockwise();

		context.beginPath();
		context.arc(0, 0, arc.outerRadius() * 1.75, 0, angle, clockwise);
		context.arc(0, 0, arc.innerRadius() * .5, angle, 0, !clockwise);
		context.closePath();
		context.fillStrokeShape(arc);
	}

	function polar2xy(r: number, theta: number) {
		theta = theta * (Math.PI / 180)
		// theta in radians
		if (r == 0) {
			return {
				x: 0,
				y: 0,
			}
		}
		return {
			x: r * Math.cos(theta),
			y: r * Math.sin(theta),
		}
	}

	function iconStyle(r: RadialPart) {
		let location: Coordinates = activeMenu.location;
		let polar: Coordinates = polar2xy((innerRadius + outerRadius) / 2, (r.rotation! + (r.rotation + r.angle)) / 2);
		return `left: ${polar.x + location.x}px; top: ${polar.y + location.y}px; transform: translate(-50%, -50%)`
	}

	onMount(async () => {
		await tick();
		jQuery("#stage")[0].addEventListener("pointerup", radialStageHandlePointerUp);
		jQuery("#stage")[0].addEventListener("pointerdown", radialStageHandlePointerUp);
		console.log(radialLayer.getCanvas()._canvas)
 	});


	// const buttonHandlers: {[key: string]: any} = {"send": send, "swap": swapMenu, "focus": focusCam, "reset": resetCam, "nextswap": () => loadNextCam("swap"), "nextload": () => loadNextCam("load"), "back": loadPreviousMenu, "iroff": async () => await irCMD("off"), "iron": async () => await irCMD("on"), "irauto": async () => await irCMD("auto"), "up": async () => await moveCMD("up"), "upright": async () => await moveCMD("upright"), "right": async () => await moveCMD("right"), "downright": async () => await moveCMD("downright"), "down": async () => await moveCMD("down"), "downleft": async () => await moveCMD("downleft"), "left": async () => await moveCMD("left"), "upleft": async () => await moveCMD("upleft")};
	let rh: {[key: string]: any} = {"send": send, "clear": clear, "focus": focuscam, "reset": () => buildCommand("resetcam"), "swap": swapMenu, "nextswap": () => loadNextCam("swap"), "nextload": () => loadNextCam("load")};
	rh = {...{"iroff": async () => await buildCommand("ptzir", ["off"]), "iron": async () => await buildCommand("ptzir", ["on"]), "irauto": async () => await buildCommand("ptzir", ["auto"])}, ...rh};
	rh = {...{"iroff": async () => await buildCommand("ptzir", ["off"]), "iron": async () => await buildCommand("ptzir", ["on"]), "irauto": async () => await buildCommand("ptzir", ["auto"])}, ...rh};
	rh = {...{"up": async () => await buildCommand("ptzmove", ["up"]), "upright": async () => await buildCommand("ptzmove", ["upright"]), "right": async () => await buildCommand("ptzmove", ["right"]), "downright": async () => await buildCommand("ptzmove", ["downright"]), "down": async () => await buildCommand("ptzmove", ["down"]), "downleft": async () => await buildCommand("ptzmove", ["downleft"]), "left": async () => await buildCommand("ptzmove", ["left"]), "upleft": async () => await buildCommand("ptzmove", ["upleft"])}, ...rh};

	function sendHelper(cacheHit: boolean) {
		if (cacheHit) {
			dispatch('sendcmd');
		} else {
			_.delay(function(text) {dispatch(text);}, 1050, 'sendcmd');
		}
	}

	function send() {
		if ($commandText == defaultCMD) {
			$commandText = ClickTangle({
				X: activeMenu.location.x,
				Y: activeMenu.location.y,
				Width: 0,
				Height: 0,
				FrameWidth: $ifDimensions.width,
				FrameHeight: $ifDimensions.height
			}).command
		}
		dispatch("sendcmd");
	}

	function clear() {
		Reset($stage);
	}

	async function buildCommand(command: string, values: string[] = []) {
		let cam = await GetCam({coordinates: {x: activeMenu.location.x, y: activeMenu.location.y}, frameWidth: $ifDimensions.width, frameHeight: $ifDimensions.height, position: activeMenu.target}, $server)
		if (!cam.found) {
			return;
		}
		$commandText = `!${command} ${cam.name} ${values.join(" ")}`

		// sendHelper(cam.cacheHit)
	}

	async function focuscam() {
		let cam = await GetCam({coordinates: {x: activeMenu.location.x, y: activeMenu.location.y}, frameWidth: $ifDimensions.width, frameHeight: $ifDimensions.height, position: activeMenu.target}, $server)
		if (!cam.found) {
			return;
		}

		$commandText = `!ptzfocusr ${cam.name} 0`
		$clickFocus = 0;

	}

	function swapMenu() {
		let ifOverlay = jQuery('#overlay')[0].getBoundingClientRect();
		let mousePos = radialStage.getPointerPosition();
		if (mousePos) {
			$am.Actions["swaps"].Enable({x: (mousePos.x - ifOverlay.left) / $panzoom.getScale(), y: (mousePos.y - ifOverlay.top) / $panzoom.getScale()})
		} else {
			$am.Actions["swaps"].Enable({x: (activeMenu.location.x - ifOverlay.left) / $panzoom.getScale(), y: (activeMenu.location.y - ifOverlay.top) / $panzoom.getScale()})
		}
	}

	async function loadNextCam(action: string) {
		let cam = await GetCam({coordinates: {x: activeMenu.location.x, y: activeMenu.location.y}, frameWidth: $ifDimensions.width, frameHeight: $ifDimensions.height, position: activeMenu.target}, $server)
		if (!cam.found) {
			return;
		}
		
		// let response = await $server.post('/camera/swaps', {camera: cam.name});
		let response = {data: JSON.parse(testString())};
		console.log(response)
		let swaps: SwapResponse = response.data;
		if (!swaps.found || !swaps.swaps.subentries[0]) {
			return;
		}
		if (action == "swap") {
			$commandText = `!swap ${swaps.cam} ${swaps.swaps.subentries[0].label}`
			sendHelper(cam.cacheHit)
		} else if (action == "load") {
			// let presetResponse = await $server.post('/camera/presets', {camera: swaps.swaps!.subentries![0].label});
			let presetResponse = JSON.parse(testPresets());
			if (!presetResponse.data.found) {
				return;
			}

			$camPresets = presetResponse.data.camPresets;
		}
	}


	function testPresets(): string {
		return `
		{
			"data": {
				"found": true,
				"camPresets": {
					"name": "foxcorner",
					"presets": [
						"home",
						"training",
						"den",
						"insidedoor"
					]
				}
			}
		}`;
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

<Stage
	bind:handle={radialStage}
	config={{
		container: 'stage',
		x: 0,
		y: 0,
		width: stageWidth,
		height: stageHeight,
		listening: false
	}}
>
	<Layer bind:handle={radialLayer} config={{listening: false}}>
		{#if $am.Actions[name].IsActive && activeMenu}
			<Group bind:handle={radials}>
				{#each activeMenu.parts as r}
					<Arc 
						config={{
							x: activeMenu.location.x,
							y: activeMenu.location.y,
							innerRadius: innerRadius,
							outerRadius: outerRadius,
							angle: r.angle,
							fill: r.color,
							stroke: `rgba(110, 110, 110, ${Transparency})`,
							strokeWidth: 1,
							rotation: r.rotation,
							name: "radialpart",
							hitFunc: arcCustomHitbox
						}}
						on:pointerenter={(e) => highlightRadial(e, r)}
						on:pointerleave={(e) => unhighlightRadial(e, r)}
						on:pointerup={getFunctionFromName(r.action)}
					/>
					<i class="bi bi-{r.icon} absolute z-100 pointer-events-none text-2xl" style={iconStyle(r)} use:portal={"#stage"}/>
				{/each}
				<Text bind:handle={label} 
					config={{
						x: 0,
						y: 0,
						width: 200,
						text: "",
						padding: 5,
						fontSize: fontSize,
						fill: "white",
						stroke: 'black',
						strokeWidth: 1,
						align: 'center',
						listening: false,
						visible: false
					}}
				/>
			</Group>
		{/if}
	</Layer>
</Stage>