<script lang="ts">
	import { Arc, Group, Shape, Text, TextPath } from "svelte-konva";
	import Konva from "konva";
	import { createEventDispatcher, onMount, tick } from 'svelte';
	import type { RadialPart, RadialMenu, Coordinates, SwapResponse, CamPresets } from '$types';
	import _ from 'lodash';
	import { server, panzoom, GetCam } from '$lib/stores';

	const dispatch = createEventDispatcher();
	const defaultCMD: string = "​";
	const buttonHandlers: {[key: string]: any} = {"send": send, "swap": swapMenu, "focus": focusCam, "reset": resetCam, "nextswap": () => loadNextCam("swap"), "nextload": () => loadNextCam("load"), "back": loadPreviousMenu, "iroff": async () => await irCMD("off"), "iron": async () => await irCMD("on"), "irauto": async () => await irCMD("auto"), "up": async () => await moveCMD("up"), "upright": async () => await moveCMD("upright"), "right": async () => await moveCMD("right"), "downright": async () => await moveCMD("downright"), "down": async () => await moveCMD("down"), "downleft": async () => await moveCMD("downleft"), "left": async () => await moveCMD("left"), "upleft": async () => await moveCMD("upleft")};

	export let stage: Konva.Stage;
	export let commandText: string;
	export let ifWidth: number;
	export let ifHeight: number;
	export let camPresets: CamPresets;

	let menuDefinition: RadialMenu;
	let color: string;
	let location: Coordinates;
	let innerRadius: number = window.innerHeight * .08;
	let outerRadius: number = (window.innerHeight * .08) + (window.innerHeight * .13);
	

	function getRelativeZoom(): number {
		if ($panzoom.getScale() <= 1.5) {
			return $panzoom.getScale()
		} else {
			return $panzoom.getScale() * .8
		}
		
	}

	function builder(definition: RadialMenu): RadialPart[] {
		if (!definition) {
			return [];
		}
		cancelMenu = false;
		color = definition.color;
		location = definition.location;
		innerRadius = (window.innerHeight * .08);
		outerRadius = (window.innerHeight * .08) + (window.innerHeight * .13);

		return definition.parts;
	}

	function getFunctionFromName(name: string) {
		let func = buttonHandlers[name] ? buttonHandlers[name] : nop;
    	return func;
	}

	let radials: Konva.Group;
	export function redefine(definition: RadialMenu) {
		menuDefinition = definition;
	}
	
	export function addHandlers() {
		stage.on("pointerup", function () {
			menuDefinition.parts = [];
			label.hide();
			dispatch("closemenu");
			jQuery('.movedown').css('z-index', '');
			stage.off("pointerup");
      	});
	}
	
	let labelConfig = {
		x: 0,
		y: 0,
		width: 200,
		text: "",
		fontSize: 2 * parseFloat(getComputedStyle(document.documentElement).fontSize) / getRelativeZoom(),
		padding: 5,
		fill: "white",
		stroke: 'black',
		strokeWidth: 1,
		align: 'center',
		listening: false
	}

	
	let label: Konva.Text;
	let hoverTimeout: number;
	let cancelMenu: boolean = false;
	function highlightRadial(e: CustomEvent, r: RadialPart) {
		console.log(e.detail.target);
		console.log(e.detail.target.offsetX());
		
		(e.detail.target as Konva.Shape).fill("rgba(92, 150, 255, 0.15)")
		let hoveredElementPos = e.detail.target.getPosition();
		label.position({x: hoveredElementPos.x, y: hoveredElementPos.y});
		label.offsetX(label.width() / 2);
		label.offsetY(label.height() / 2);
		label.text(r.label);
		label.show();

		if (r.action == "back" && !cancelMenu) {
			hoverTimeout = setTimeout(() => {
				loadPreviousMenu();
			}, 500);
		} else if (r.action == "submenu"  && !cancelMenu) {
			hoverTimeout = setTimeout(() => {
				loadSubmenu(r.submenu!);
			}, 500);
		}
	}
	
	function unhighlightRadial(e: CustomEvent, r: RadialPart) {
		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
		}
		(e.detail.target as Konva.Shape).fill(r.color!);
		label.hide();
	}

	function nop() {
		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
		}
		cancelMenu = true;
		menuDefinition.parts = [];
		label.hide();
		dispatch("closemenu");
		jQuery('.movedown').css('z-index', '');
		stage.off("pointerup");
	};

	function loadSubmenu(submenu: RadialMenu) {
		console.log("Loading submenu");
		submenu.location = {x: menuDefinition.location.x, y: menuDefinition.location.y};
		submenu.previousMenu = menuDefinition;
		label.hide();

		redefine(submenu);
	};

	function loadPreviousMenu() {
		console.log("Going back to previous menu");
		if (menuDefinition.previousMenu) {
			label.hide();
			redefine(menuDefinition.previousMenu);
		} else {
			nop();
		}
	}
	

	async function send() {
		if (commandText == defaultCMD) {
			let response = await $server.post("/click", {x: menuDefinition.location.x, y: menuDefinition.location.y, width: 0, height: 0, frameWidth: ifWidth,frameHeight: ifHeight})
			commandText = response.data.command;
			// _.delay(function(text) {dispatch(text);}, 1050, 'sendcmd');
		}

		dispatch("sendcmd");
	}

	function swapMenu() {
		// let layer = stage.findOne('#mainlayer') as Konva.Layer;
		// let mousePos = layer.getRelativePointerPosition();

		let mousePos = stage.getPointerPosition();
		if (!mousePos) {
			return;
		}
		dispatch("openmenu", {
			camCoordinates: {x: menuDefinition.location.x, y: menuDefinition.location.y},
			zone: menuDefinition.target,
			menuPosition: {x: mousePos.x, y: mousePos.y}
		});
	}

	async function resetCam() {
		let cam = await GetCam({coordinates: {x: menuDefinition.location.x, y: menuDefinition.location.y}, frameWidth: ifWidth, frameHeight: ifHeight, position: menuDefinition.target}, $server)
	
		if (!cam.found) {
			return;
		}

		commandText = `!resetcam ${cam.name}`
		if (cam.cacheHit) {
			dispatch('sendcmd');
		} else {
			_.delay(function(text) {dispatch(text);}, 1050, 'sendcmd');
		}
	}
	
	async function moveCMD(direction: string) {
		let camera = await GetCam({coordinates: {x: menuDefinition.location.x, y: menuDefinition.location.y}, frameWidth: ifWidth, frameHeight: ifHeight, position: menuDefinition.target}, $server)
		if (!camera.found) {
			return;
		}

		commandText = `!ptzmove ${camera.name} ${direction}`
		if (camera.cacheHit) {
			dispatch('sendcmd');
		} else {
			_.delay(function(text) {dispatch(text);}, 1050, 'sendcmd');
		}
	}

	async function irCMD(state: string) {
		let camera = await GetCam({coordinates: {x: menuDefinition.location.x, y: menuDefinition.location.y}, frameWidth: ifWidth, frameHeight: ifHeight, position: menuDefinition.target}, $server)
		if (!camera.found) {
			return;
		}

		commandText = `!ptzir ${camera.name} ${state}`
	}

	async function focusCam() {
		let camera = await GetCam({coordinates: {x: menuDefinition.location.x, y: menuDefinition.location.y}, frameWidth: ifWidth, frameHeight: ifHeight, position: menuDefinition.target}, $server)
		if (!camera.found) {
			return;
		}

		commandText = `!ptzfocusr ${camera.name} 0`

		dispatch('resetfocus');
	}

	async function loadNextCam(action: string) {
		let cam = await GetCam({coordinates: {x: menuDefinition.location.x, y: menuDefinition.location.y}, frameWidth: ifWidth, frameHeight: ifHeight, position: menuDefinition.target}, $server)
		let response = await $server.post('/camera/swaps', {camera: cam.name});

		console.log(response)
		let swaps: SwapResponse = response.data;

		if (!swaps.found) {
			return;
		}

		if (swaps.swaps!.subentries![0].subentries != null) {
			return;
		}

		if (action == "swap") {
			commandText = `!swap ${swaps.cam} ${swaps.swaps!.subentries![0].label}`
			if (cam.cacheHit) {
				dispatch('sendcmd');
			} else {
				_.delay(function(text) {dispatch(text);}, 1050, 'sendcmd');
			}
		} else if (action == "load") {
			let presetResponse = await $server.post('/camera/presets', {camera: swaps.swaps!.subentries![0].label});
			console.log(presetResponse)
			camPresets = presetResponse.data.camPresets;
		}
	}

	onMount(async () => {
		await tick();
 	});

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

	export function setRotations(menu: RadialMenu) {
		let currentRotation: number = 0;
		for (const part of menu.parts) {
			part.rotation = currentRotation + menu.rotation;
			if (!part.color) {
				part.color = menu.color;
			}
			currentRotation += part.angle;
		}
	}

	// window.addEventListener('keydown', function (e) {
    //     if (e.code == "Space") {
	// 		var node = stage.findOne('#mainlayer') as Konva.Layer;
	// 		node!.toggleHitCanvas();
	// 		e.preventDefault();
    //     } 
    //   });
	function polar2xy(r: number, theta: number) {
		theta = theta * (Math.PI / 180)
		// theta in radians
		if (r===0) {
			return {
				x: 0,
				y: 0,
			}
		}
		return {
			x: r*Math.cos(theta) / getRelativeZoom(),
			y: r*Math.sin(theta) / getRelativeZoom(),
		}
	}

	function iconStyle(r: RadialPart) {
		let location: Coordinates = menuDefinition.location;
		let polar: Coordinates = polar2xy((innerRadius + outerRadius) / 2, (r.rotation! + (r.rotation! + r.angle)) / 2);
		return `left: ${polar.x + location.x}px; top: ${polar.y + location.y}px; transform: translate(-50%, -50%)`
	}

</script>

<Group 
	bind:handle={radials}
	config={{
		x: stage.x(),
		y: stage.y(),
	}}
>
	{#each builder(menuDefinition) as r}
		<Arc config={{
			x: menuDefinition.location.x,
			y: menuDefinition.location.y,
			innerRadius: innerRadius / getRelativeZoom(),
			outerRadius: outerRadius / getRelativeZoom(),
			angle: r.angle,
			fill: r.color,
			stroke: 'darkgrey',
			strokeWidth: 2 / getRelativeZoom(),
			rotation: r.rotation,
			name: "radialpart",
			hitFunc: arcCustomHitbox
		}}
		on:pointerenter={(e) => highlightRadial(e, r)}
		on:pointerleave={(e) => unhighlightRadial(e, r)}
		on:pointerup={getFunctionFromName(r.action)}
		/>
		<i class="bi bi-{r.icon} absolute z-50 pointer-events-none text-2xl" style={iconStyle(r)}></i>
		{radials.moveToTop()}
	{/each}
	<Text bind:handle={label} config={labelConfig} />
</Group>
