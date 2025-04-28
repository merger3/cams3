<script lang="ts">
	import { Arc, Group, Text, Stage, Layer, Circle } from "svelte-konva";
	import Konva from "konva";
	import { createEventDispatcher, onMount, tick } from 'svelte';
	import type { RadialPart, RadialMenu, Coordinates, SwapResponse, MenuItem } from '$types';
	import _ from 'lodash';
	import { server, panzoom, GetCam, ifDimensions, am, stage, commandText, GetZone, zones, Reset, clickFocus, clickZoom, GetSwaps, ClearStage, SyncCache, sendCommand, GetScreenSize } from '$lib/stores';
	import { ClickTangle } from '$lib/rect';
	import { States, type Action } from '$lib/actions';
	import { Selector, AddSelection, RemoveSelection, GetSelectedRect } from '$lib/zones';
	import { RadialMenus, Transparency } from '$lib/radials';
	import { portal } from "svelte-portal";
	import { customAlphabet } from 'nanoid';

	const dispatch = createEventDispatcher();
	const tangleID = customAlphabet('0123456789abcdef', 5);

	export let stageWidth: number;
	export let stageHeight: number;

	const defaultCMD: string = "​";
	const mainMenu = "main";

	let innerRadius: number;
	let outerRadius: number;

	let calculatedRadius: number;

	let radialStage: Konva.Stage;
	export let radialLayer: Konva.Layer;
	let radials: Konva.Group;
	let label: Konva.Text;
	let collision: Konva.Arc;

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
				States.StageDraggingMinimal,
				States.ClickedTransformer,
				States.ClickedTangle,
				States.ClickedCircle,
				States.StageDoubleClick
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
		$am.Actions["click"].Cancel();
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

		if ($commandText == defaultCMD) {
			activeMenu = RadialMenus["alt"];
		} else {
			activeMenu = RadialMenus["main"];
		}
		if (!activeMenu) {
			return;
		}
		activeMenu.location = origin;
		activeMenu.target = zone;
		hovered = undefined;

		AddSelection(zone, Selector.Radial);

		
		radialLayer.listening(true);
		radialStage.listening(true);
		jQuery('#stage').css('z-index', '51');
		
		fontSize = (1.8 * parseFloat(getComputedStyle(document.documentElement).fontSize));
		
		let screenSize = window.innerHeight + window.innerWidth;
		switch (GetScreenSize()) {
			case "small":
				innerRadius = (screenSize * .035);
				outerRadius = (screenSize * .035) + (screenSize * .052);
				break;
			case "medium":
				innerRadius = (screenSize * .030);
				outerRadius = (screenSize * .030) + (screenSize * .046);
				break;
			case "large":
				innerRadius = (screenSize * .022);
				outerRadius = (screenSize * .022) + (screenSize * .04);
				break;
		}
		
		calculatedRadius = innerRadius * .35;
		this.IsActive = true;
		addCollision();
	}

	function cancel(this: Action) {
		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
		}
		hovered = undefined;
		activeMenu = undefined;
		radialLayer.listening(false);
		radialStage.listening(false);
		collision?.destroy();
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
			collision?.destroy();
			radialStage.container().style.cursor = "default";
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

	function adjustInnerHitboxes(value: number, exempt: string = undefined) {
		radials.getChildren(function(node){
			return node.getClassName() == "Arc" && (!exempt || node.id() != exempt);
		}).forEach(function (shape: Konva.Node) {
			calculatedRadius = innerRadius * value;
			(shape as Konva.Arc).hitFunc(function(context: any) {
				var arc = shape as Konva.Arc;
				var angle = Konva.getAngle(arc.angle()),
				clockwise = arc.clockwise();

				context.beginPath();
				context.arc(0, 0, arc.outerRadius() * 2, 0, angle, clockwise);
				context.arc(0, 0, innerRadius * value, angle, 0, !clockwise);
				context.closePath();
				context.fillStrokeShape(arc);
			});
		});
	}

	let hoverTimeout: number;
	let hovered: Konva.Arc;
	function highlightRadial(e: CustomEvent, r: RadialPart) {
		if (unhoverSubTimeout) {
			clearTimeout(unhoverSubTimeout);
		}
		if (hovered) {
			if (e.detail.target.id() == hovered.id()) {
				if (unhoverTimeout) {
					clearTimeout(unhoverTimeout);
				}
				
			}
		}
		hovered = e.detail.target;
		let shape: Konva.Shape = e.detail.target;

		shape.fill("rgba(92, 150, 255, 0.15)")
		let hoveredElementPos = e.detail.target.getPosition();
		label.position({x: hoveredElementPos.x, y: hoveredElementPos.y});
		label.offsetX(label.width() / 2);
		label.offsetY(label.height() / 2);
		label.text(r.label);
		label.show();

		// adjustInnerHitboxes(1, shape.id());
		radialStage.container().style.cursor = "none";


		if (r.submenu) {
			hoverTimeout = setTimeout(() => {
				loadNewMenu(r);
			}, 200);
		}
	}

	let unhoverTimeout: number;
	let unhoverSubTimeout: number;
	function unhighlightRadial(e: CustomEvent, r: RadialPart) {
		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
		}
		unhoverTimeout = setTimeout(() => {
			(e.detail.target as Konva.Shape).fill(r.color);			
		}, 10);
		unhoverSubTimeout = setTimeout(() => {
			label.hide();
			radialStage.container().style.cursor = "default";
			hovered = undefined;
		}, 10);
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
			radialStage.container().style.cursor = "default";
			dispatch("simulatepointerup", {event: e});
		}
	}

	function arcCustomHitbox(context: Konva.Context, shape: any) {
		var arc = shape as Konva.Arc;
		var angle = Konva.getAngle(arc.angle()),
		clockwise = arc.clockwise();

		context.beginPath();
		context.arc(0, 0, arc.outerRadius() * 2, 0, angle, clockwise);
		context.arc(0, 0, calculatedRadius, angle, 0, !clockwise);
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

	function addCollision() {
		collision = new Konva.Arc({
			x: activeMenu.location.x,
			y: activeMenu.location.y,
			innerRadius: innerRadius,
			outerRadius: outerRadius,
			angle: 360,
			fill: "rgba(10,100,150,0)",
			strokeWidth: 1,
			name: "collision"
		});
		collision.on("pointerenter", (e) => {
			if (unhoverSubTimeout) {
				clearTimeout(unhoverSubTimeout);
			}

			e.target.moveToBottom()
			e.target.listening(false);
			radialStage.container().style.cursor = "none";
			adjustInnerHitboxes(.9);
		})

		radialLayer.add(collision);
		radialLayer.draw();
	}

	onMount(async () => {
		await tick();
		jQuery("#stage")[0].addEventListener("pointerup", radialStageHandlePointerUp);
		jQuery("#stage")[0].addEventListener("pointerdown", (e) => radialStageHandlePointerUp(e, true));
		// radialLayer.toggleHitCanvas()
		
 	});

	let rh: {[key: string]: any} = {
		"send": send, 
		"clear": clear, 
		"click": click, 
		"select": enableZone, 
		"swap": () => openMenu("swaps"), 
		"presets": () => openMenu("presetsmenu"), 
		"clickzoom": () => openMenu("zoommenu"),
		"focus": () => focuscam(activeMenu.target), 
		"zoom": () => zoomcam(activeMenu.target), 
		"reset": () => buildCommand("resetcam"), 
		"nextswap": () => loadNextCam("swap"), 
		"nextload":  () => loadNextCam("load"),
		"primary":  () => swapPosition(1)
	};
	rh = {...{"iroff": () => buildCommand("ptzir", ["off"]), "iron": () => buildCommand("ptzir", ["on"]), "irauto": () => buildCommand("ptzir", ["auto"])}, ...rh};
	rh = {...{"up": () => buildCommand("ptzmove", ["up"]), "upright": () => buildCommand("ptzmove", ["upright"]), "right": () => buildCommand("ptzmove", ["right"]), "downright": () => buildCommand("ptzmove", ["downright"]), "down": () => buildCommand("ptzmove", ["down"]), "downleft": () => buildCommand("ptzmove", ["downleft"]), "left": () => buildCommand("ptzmove", ["left"]), "upleft": () => buildCommand("ptzmove", ["upleft"])}, ...rh};

	function send() {
		sendCommand({cmd: $commandText});
	}

	function click() {
		let ifOverlay = jQuery('#overlay')[0].getBoundingClientRect();
		let cmd = ClickTangle({
			X: (activeMenu.location.x - ifOverlay.left) / $panzoom.getScale(),
			Y: (activeMenu.location.y - ifOverlay.top) / $panzoom.getScale(),
			Width: 0,
			Height: 0,
			FrameWidth: $ifDimensions.width,
			FrameHeight: $ifDimensions.height
		}).command
		
		sendCommand({cmd: cmd, reset: false});
	}

	function enableZone() {
		if (activeMenu.target) {
			$am.Actions["click"].Enable({x: activeMenu.target.x() + (activeMenu.target.width() / 2), y: activeMenu.target.y() + (activeMenu.target.height() / 2)})
			const pointerUpEvent = new PointerEvent('pointerup', {bubbles: true, cancelable: true, clientX:activeMenu.target.x() + (activeMenu.target.width() / 2), clientY: activeMenu.target.y() + (activeMenu.target.height() / 2), button: 2, buttons: 2, pointerId: 1, pointerType: 'mouse', isPrimary: true});
			jQuery(($stage.findOne('#mainlayer') as Konva.Layer).getCanvas()._canvas)[0].dispatchEvent(pointerUpEvent);	

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
		sendCommand({cmd: `!${command} ${cam.cam} ${values.join(" ")}`, reset: false});
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

	function openMenu(menu: string) {
		let ifOverlay = jQuery('#overlay')[0].getBoundingClientRect();
		let mousePos = radialStage.getPointerPosition();
		let targetCoords: Coordinates;
		if (mousePos && $am.ActiveStates.has(States.MousePointer)) {
			targetCoords = {x: (activeMenu.location.x - ifOverlay.left) / $panzoom.getScale(), y: (activeMenu.location.y - ifOverlay.top) / $panzoom.getScale()};
		} else {
			targetCoords = {x: (mousePos.x - ifOverlay.left) / $panzoom.getScale(), y: (mousePos.y - ifOverlay.top) / $panzoom.getScale()};
		}
		// @ts-ignore: presetsmenu can take an extra argument
		$am.Actions[menu].Enable(targetCoords, {x: (activeMenu.location.x - ifOverlay.left) / $panzoom.getScale(), y: (activeMenu.location.y - ifOverlay.top) / $panzoom.getScale()})

		const pointerUpEvent = new PointerEvent('pointerup', {bubbles: true, cancelable: true, clientX: 0, clientY: 0, button: 2, buttons: 2, pointerId: 1, pointerType: 'mouse', isPrimary: true});
		jQuery('#overlay')[0].dispatchEvent(pointerUpEvent);
	}

	async function loadNextCam(action: string) {
		let cam = await GetCam({coordinates: {x: activeMenu.location.x, y: activeMenu.location.y}, frameWidth: $ifDimensions.width, frameHeight: $ifDimensions.height, position: Number(activeMenu.target.name())}, $server, false)
		if (!cam.found) {
			return;
		}
		let name: string = cam.cam;

		let swaps: MenuItem = await GetSwaps(name);
		if (!swaps) {
			return;
		}

		if (!swaps.items[0] || swaps.items[0].items) {
			return;
		}

		if (action == "swap") {
			sendCommand({cmd: `!swap ${name} ${swaps.items[0].value}`, reset: false});
			SyncCache(swaps.items[0].value);
		} else if (action == "load") {
			let ifOverlay = jQuery('#overlay')[0].getBoundingClientRect();
			let mousePos = radialStage.getPointerPosition();
			let targetCoords: Coordinates;
			if (mousePos && $am.ActiveStates.has(States.MousePointer)) {
				targetCoords = {x: (mousePos.x - ifOverlay.left) / $panzoom.getScale(), y: (mousePos.y - ifOverlay.top) / $panzoom.getScale()};
			} else {
				targetCoords = {x: (activeMenu.location.x - ifOverlay.left) / $panzoom.getScale(), y: (activeMenu.location.y - ifOverlay.top) / $panzoom.getScale()}
			}
			// @ts-ignore: presetsmenu can take an extra argument
			$am.Actions["presetsmenu"].Enable(targetCoords, swaps.items[0].value)

			const pointerUpEvent = new PointerEvent('pointerup', {bubbles: true, cancelable: true, clientX: 0, clientY: 0, button: 2, buttons: 2, pointerId: 1, pointerType: 'mouse', isPrimary: true});
			jQuery('#overlay')[0].dispatchEvent(pointerUpEvent);
		}
	}

	function swapPosition(target: number) {
		let sourceZone = GetSelectedRect(Selector.Radial);
		if (!sourceZone) {
			return;
		}
		let targetZone = $zones.findOne(`.${target}`) as Konva.Rect;
		if (!targetZone) {
			return;
		}
		let swaps: number[] = [Number(sourceZone.name()), target]
		
		if (swaps[0] != swaps[1]) {
			swaps.sort(function(a, b){return a - b});
			let cmd = `!swap ${swaps[0]} ${swaps[1]}`;
			sendCommand({cmd: cmd, reset: false})
			return;
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
				<Circle
					config={{
						x: activeMenu.location.x,
						y: activeMenu.location.y,
						radius: innerRadius * 1,
						fill: "rgba(1,1,1,0)",
						strokeEnabled: false,
						name: "detectionzone",
						id: tangleID()
					}}
					on:pointerenter={(e) => {
						radialStage.container().style.cursor = "default";
					}}
				/>
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
							id: tangleID(),
							hitFunc: arcCustomHitbox
						}}
						on:pointerenter={(e) => highlightRadial(e, r)}
						on:pointerleave={(e) => unhighlightRadial(e, r)}
						on:pointerup={getFunctionFromName(r.action)}
						on:pointerdown={getFunctionFromName(r.action)}
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
				<Circle
					config={{
						x: activeMenu.location.x,
						y: activeMenu.location.y,
						radius: innerRadius * .35,
						fill: "rgba(255,255,255,0)",
						strokeEnabled: false,
						name: "detectionzone",
						id: tangleID()
					}}
					on:pointerenter={(e) => {
						radialStage.container().style.cursor = "default";
						adjustInnerHitboxes(.35);
						collision.moveToTop();
						collision.listening(true);
					}}
				/>
			</Group>
		{/if}
	</Layer>
</Stage>