<script lang="ts">
	import { Arc, Group, Text, Stage, Layer } from "svelte-konva";
	import Konva from "konva";
	import { createEventDispatcher, onMount, tick } from 'svelte';
	import type { RadialPart, RadialMenu, Coordinates, SwapResponse, CamPresets } from '$types';
	import _ from 'lodash';
	import { server, panzoom, GetCam, ifDimensions, am, stage, commandText, GetZone } from '$lib/stores';
	import { ClickTangle } from '$lib/rect';
	import { States, type Action } from '$lib/actions';
	import { RadialMenus, Transparency } from '$lib/radials';
	import { portal } from "svelte-portal";
	const dispatch = createEventDispatcher();

	export let stageWidth: number;
	export let stageHeight: number;

	const defaultCMD: string = "​";
	const mainMenu = "ptzmove";
	let innerRadius: number;
	let outerRadius: number;

	let radialStage: Konva.Stage;
	let radialLayer: Konva.Layer;
	let radials: Konva.Group;
	let label: Konva.Text;
	
	// const buttonHandlers: {[key: string]: any} = {"send": send, "swap": swapMenu, "focus": focusCam, "reset": resetCam, "nextswap": () => loadNextCam("swap"), "nextload": () => loadNextCam("load"), "back": loadPreviousMenu, "iroff": async () => await irCMD("off"), "iron": async () => await irCMD("on"), "irauto": async () => await irCMD("auto"), "up": async () => await moveCMD("up"), "upright": async () => await moveCMD("upright"), "right": async () => await moveCMD("right"), "downright": async () => await moveCMD("downright"), "down": async () => await moveCMD("down"), "downleft": async () => await moveCMD("downleft"), "left": async () => await moveCMD("left"), "upleft": async () => await moveCMD("upleft")};
	const buttonHandlers: {[key: string]: any} = {};

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
			Inactive: new Set(),
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
		Cancel: cancel,
		Enable: enable
	}
	

	let activeMenu: RadialMenu | undefined;
	function enable(this: Action, origin: Coordinates) {
		console.log("enabling radial")
		let zone = GetZone(origin, $stage)
		if (!zone) {
			return;
		}

		activeMenu = RadialMenus[mainMenu];
		if (!activeMenu) {
			return;
		}
		
		activeMenu.location = origin;

		radialLayer.listening(true);
		radialStage.listening(true);
		jQuery('#stage').css('z-index', '49');

		activeMenu.target = Number(zone.name());

		innerRadius = (window.innerHeight * .08);
		outerRadius = (window.innerHeight * .08) + (window.innerHeight * .13);
		labelConfig.fontSize = 2 * parseFloat(getComputedStyle(document.documentElement).fontSize),
		this.IsActive = true;
		console.log("finished enabling radial")
	}

	function cancel(this: Action) {
		activeMenu = undefined;
		radialLayer.listening(false);
		radialStage.listening(false);
		jQuery('#stage').css('z-index', '');
		this.IsActive = false;
	}

	function getFunctionFromName(name: string) {
		let func = buttonHandlers[name] ? buttonHandlers[name] : nop;
    	return func;
	}

	
	let labelConfig: any = {
		x: 0,
		y: 0,
		width: 200,
		text: "",
		padding: 5,
		fill: "white",
		stroke: 'black',
		strokeWidth: 1,
		align: 'center',
		listening: false
	}

	
	
	function nop() {};


	function radialStageHandlePointerUp(e: any) {
		console.log("made it to handler")
		console.log(e)
		dispatch("simulatepointerup", {event: e});
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
		// on:pointerup={radialStageHandlePointerUp}
   
 	});

	

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
							stroke: `rgba(169, 169, 169, ${Transparency})`,
							strokeWidth: 2,
							rotation: r.rotation,
							name: "radialpart",
							hitFunc: arcCustomHitbox
						}}
					/>
					<i class="bi bi-{r.icon} absolute z-100 pointer-events-none text-2xl" style={iconStyle(r)} use:portal={"#stage"}/>
					{radials.moveToTop()}
				{/each}
				<Text bind:handle={label} config={labelConfig} />
			</Group>
		{/if}
	</Layer>
</Stage>