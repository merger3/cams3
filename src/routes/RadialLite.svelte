<script lang="ts">
	import { Arc, Group, Text, Stage, Layer } from "svelte-konva";
	import Konva from "konva";
	import { createEventDispatcher, onMount, tick } from 'svelte';
	import type { RadialPart, RadialMenu, Coordinates, SwapResponse } from '$types';
	import _ from 'lodash';
	import { server, panzoom, GetCam, ifDimensions, am, stage, commandText, GetZone, zones, Reset, clickFocus, clickZoom, swapsCache, ClearStage, SyncCache } from '$lib/stores';
	import { ClickTangle } from '$lib/rect';
	import { States, type Action } from '$lib/actions';
	import { Selector, AddSelection, RemoveSelection } from '$lib/zones';
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
	
	let lastPointerEvent: any;

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
				States.StageDraggingMinimal
			]),
		},
		CancelConditions: {
			Active: new Set(),
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
	function enable(this: Action, origin: Coordinates) {		
		let zone = GetZone($zones, {x: (origin.x / $panzoom.getScale()), y: (origin.y / $panzoom.getScale())});
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
		activeMenu.target = zone;
		hovered = false;

		$am.Actions["click"].Cancel();
		AddSelection(zone, Selector.Radial);

		radialLayer.listening(true);
		radialStage.listening(true);
		jQuery('#stage').css('z-index', '49');

		fontSize = (2 * parseFloat(getComputedStyle(document.documentElement).fontSize));

		let screenSize = window.innerHeight + window.innerWidth;
		if (screenSize <= 1500) {
			innerRadius = (screenSize * .035);
			outerRadius = (screenSize * .035) + (screenSize * .052);
		} else if (screenSize <= 2000) {
			innerRadius = (screenSize * .030);
			outerRadius = (screenSize * .030) + (screenSize * .046);
		} else {
			innerRadius = (screenSize * .024);
			outerRadius = (screenSize * .024) + (screenSize * .04);
		}

		this.IsActive = true;
	}

	function cancel(this: Action) {
		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
		}
		hovered = false;
		activeMenu = undefined;
		radialLayer.listening(false);
		radialStage.listening(false);
		jQuery('#stage').css('z-index', '');

		RemoveSelection(Selector.Radial);

		this.IsActive = false;
	}

	function getFunctionFromName(name: string) {
		let func = rh[name] ? rh[name] : defaultAction;
    	return async () => {
			radials.hide();
			label.hide();
			jQuery(".vanish").css("visibility", "hidden");
			await func();
			_.defer(function() {dispatch("simulatepointerup", {event: lastPointerEvent});});
		};
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
	let hovered = false;
	function highlightRadial(e: CustomEvent, r: RadialPart) {
		hovered = true;
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
			}, 325);
		}
	}

	function unhighlightRadial(e: CustomEvent, r: RadialPart) {
		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
		}
		hovered = false;
		(e.detail.target as Konva.Shape).fill(r.color);
		label.hide();
	}

	function defaultAction() {
		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
		}
	};

	function radialStageHandlePointerUp(e: any, force: boolean = false) {
		if (e.evt) {
			e = e.evt;
		}
		lastPointerEvent = e;
		if (force || !hovered) {
			dispatch("simulatepointerup", {event: e});
		}
	}

	function arcCustomHitbox(context: Konva.Context, shape: any) {
		var arc = shape as Konva.Arc;
		var angle = Konva.getAngle(arc.angle()),
		clockwise = arc.clockwise();

		context.beginPath();
		context.arc(0, 0, arc.outerRadius() * 1.75, 0, angle, clockwise);
		context.arc(0, 0, arc.innerRadius() * .35, angle, 0, !clockwise);
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
		jQuery("#stage")[0].addEventListener("pointerdown", (e) => radialStageHandlePointerUp(e, true));
 	});

	let rh: {[key: string]: any} = {"send": send, "clear": clear, "select": enableZone, "presets": presetsMenu, "focus": () => focuscam(activeMenu.target), "zoom": () => zoomcam(activeMenu.target), "reset": () => buildCommand("resetcam"), "swap": swapMenu, "nextswap": () => loadNextCam("swap"), "nextload":  () => loadNextCam("load")};
	rh = {...{"iroff": () => buildCommand("ptzir", ["off"]), "iron": () => buildCommand("ptzir", ["on"]), "irauto": () => buildCommand("ptzir", ["auto"])}, ...rh};
	rh = {...{"up": () => buildCommand("ptzmove", ["up"]), "upright": () => buildCommand("ptzmove", ["upright"]), "right": () => buildCommand("ptzmove", ["right"]), "downright": () => buildCommand("ptzmove", ["downright"]), "down": () => buildCommand("ptzmove", ["down"]), "downleft": () => buildCommand("ptzmove", ["downleft"]), "left": () => buildCommand("ptzmove", ["left"]), "upleft": () => buildCommand("ptzmove", ["upleft"])}, ...rh};

	function send() {
		if ($commandText == defaultCMD) {
			let ifOverlay = jQuery('#overlay')[0].getBoundingClientRect();
			$commandText = ClickTangle({
				X: (activeMenu.location.x - ifOverlay.left) / $panzoom.getScale(),
				Y: (activeMenu.location.y - ifOverlay.top) / $panzoom.getScale(),
				Width: 0,
				Height: 0,
				FrameWidth: $ifDimensions.width,
				FrameHeight: $ifDimensions.height
			}).command
		}
		dispatch("sendcmd");
	}

	function enableZone() {
		if (activeMenu.target) {
			$am.Actions["doubleclick"].Enable({x: activeMenu.target.x() + (activeMenu.target.width() / 2), y: activeMenu.target.y() + (activeMenu.target.height() / 2)})
		}
	}

	function clear() {
		Reset($stage);
	}

	async function buildCommand(command: string, values: string[] = []) {
		let cam = await GetCam({coordinates: {x: activeMenu.location.x, y: activeMenu.location.y}, frameWidth: $ifDimensions.width, frameHeight: $ifDimensions.height, position: Number(activeMenu.target.name())}, $server)
		if (!cam.found) {
			return;
		}
		$commandText = `!${command} ${cam.cam} ${values.join(" ")}`
		dispatch('sendcmd');
	}

	async function zoomcam(zone: Konva.Rect) {
		let cam = await GetCam({coordinates: {x: activeMenu.location.x, y: activeMenu.location.y}, frameWidth: $ifDimensions.width, frameHeight: $ifDimensions.height, position: Number(activeMenu.target.name())}, $server)
		if (!cam.found) {
			return;
		}

		$commandText = `!ptzzoomr ${cam.cam} 100`
		$clickZoom = 100;
		ClearStage($stage);
		AddSelection(zone, Selector.Zoom);
	}

	async function focuscam(zone: Konva.Rect) {
		let cam = await GetCam({coordinates: {x: activeMenu.location.x, y: activeMenu.location.y}, frameWidth: $ifDimensions.width, frameHeight: $ifDimensions.height, position: Number(activeMenu.target.name())}, $server)
		if (!cam.found) {
			return;
		}

		$commandText = `!ptzfocusr ${cam.cam} 0`
		$clickFocus = 0;
		ClearStage($stage);
		AddSelection(zone, Selector.Focus);
	}

	function swapMenu() {
		let ifOverlay = jQuery('#overlay')[0].getBoundingClientRect();
		let mousePos = radialStage.getPointerPosition();
		if (mousePos && $am.ActiveStates.has(States.MousePointer)) {
			$am.Actions["swaps"].Enable({x: (mousePos.x - ifOverlay.left) / $panzoom.getScale(), y: (mousePos.y - ifOverlay.top) / $panzoom.getScale()})
		} else {
			$am.Actions["swaps"].Enable({x: (activeMenu.location.x - ifOverlay.left) / $panzoom.getScale(), y: (activeMenu.location.y - ifOverlay.top) / $panzoom.getScale()})
		}

		const pointerUpEvent = new PointerEvent('pointerup', {bubbles: true, cancelable: true, clientX: 0, clientY: 0, button: 2, buttons: 2, pointerId: 1, pointerType: 'mouse', isPrimary: true});
		jQuery('#overlay')[0].dispatchEvent(pointerUpEvent);
	}

	function presetsMenu() {
		let ifOverlay = jQuery('#overlay')[0].getBoundingClientRect();
		let mousePos = radialStage.getPointerPosition();
		if (mousePos && $am.ActiveStates.has(States.MousePointer)) {
			$am.Actions["presetsmenu"].Enable({x: (mousePos.x - ifOverlay.left) / $panzoom.getScale(), y: (mousePos.y - ifOverlay.top) / $panzoom.getScale()})
		} else {
			$am.Actions["presetsmenu"].Enable({x: (activeMenu.location.x - ifOverlay.left) / $panzoom.getScale(), y: (activeMenu.location.y - ifOverlay.top) / $panzoom.getScale()})
		}

		const pointerUpEvent = new PointerEvent('pointerup', {bubbles: true, cancelable: true, clientX: 0, clientY: 0, button: 2, buttons: 2, pointerId: 1, pointerType: 'mouse', isPrimary: true});
		jQuery('#overlay')[0].dispatchEvent(pointerUpEvent);
	}

	async function loadNextCam(action: string) {
		let cam = await GetCam({coordinates: {x: activeMenu.location.x, y: activeMenu.location.y}, frameWidth: $ifDimensions.width, frameHeight: $ifDimensions.height, position: Number(activeMenu.target.name())}, $server)
		if (!cam.found) {
			return;
		}

		let swaps = $swapsCache[cam.cam]
		if (!swaps) {
			let response = await $server.post('/camera/swaps', {camera: cam.cam});
			swaps = response.data;
			if (!swaps.found) {
				return;
			} else {
				$swapsCache[cam.cam] = swaps;
			}
		}

		if (!swaps.swaps.subentries[0] || swaps.swaps.subentries[0].subentries) {
			return;
		}

		if (action == "swap") {
			$commandText = `!swap ${swaps.cam} ${swaps.swaps.subentries[0].label}`
			dispatch('sendcmd');

			SyncCache(swaps.swaps.subentries[0].label);
		} else if (action == "load") {
			let ifOverlay = jQuery('#overlay')[0].getBoundingClientRect();
			let mousePos = radialStage.getPointerPosition();
			if (mousePos && $am.ActiveStates.has(States.MousePointer)) {
				// @ts-ignore: presetsmenu can take an extra argument
				$am.Actions["presetsmenu"].Enable({x: (mousePos.x - ifOverlay.left) / $panzoom.getScale(), y: (mousePos.y - ifOverlay.top) / $panzoom.getScale()}, swaps.swaps.subentries[0].label)
			} else {
				// @ts-ignore: presetsmenu can take an extra argument
				$am.Actions["presetsmenu"].Enable({x: (activeMenu.location.x - ifOverlay.left) / $panzoom.getScale(), y: (activeMenu.location.y - ifOverlay.top) / $panzoom.getScale()}, swaps.swaps.subentries[0].label)
			}

			const pointerUpEvent = new PointerEvent('pointerup', {bubbles: true, cancelable: true, clientX: 0, clientY: 0, button: 2, buttons: 2, pointerId: 1, pointerType: 'mouse', isPrimary: true});
			jQuery('#overlay')[0].dispatchEvent(pointerUpEvent);
		}
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
			<Group bind:handle={radials} config={{visible: true}}>
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
					<i class="bi bi-{r.icon} absolute z-100 pointer-events-none text-2xl vanish" style={iconStyle(r)} use:portal={"#stage"}/>
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