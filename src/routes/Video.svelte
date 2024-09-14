<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import Konva from "konva";
	import Tangle from './Tangle.svelte';
	import axios from 'axios';
	import { fit, parent_style } from '@leveluptuts/svelte-fit'
	import ContextMenu from './ContextMenu.svelte';
	import type { SwapResponse, Coordinates, Box, RadialPart, RadialMenu } from '$types';
	import { Motion } from 'svelte-motion'
	import { press, type PressCustomEvent, pan, type PanCustomEvent, type GestureCustomEvent } from 'svelte-gestures';
	import Radial from "./Radial.svelte";
	import _ from 'lodash';

	export let selector: Tangle;
	export let commandText: string;

	const dispatch = createEventDispatcher();


	let tangle: Konva.Rect;
	function getData(e: any) {
		let rect: Konva.Rect = e.detail.rect;
		let isClick: boolean = (rect.width() == 0 && rect.height() == 0);
		let clickRoute: string = isClick ? "/click" : "/draw";
		if (isClick) {
			clickRoute = "/click";
		} else {
			clickRoute = "/draw";
		}

		axios.post(clickRoute, {
			x: rect.x(),
			y: rect.y(),
			width: rect.width(),
			height: rect.height(),
			frameWidth: ifWidth,
			frameHeight: ifHeight
		}).then(function (response) {
			commandText = response.data.command;
			if (isClick) {
				zoom = 100;
			}
			console.log(response);
		}).catch(function (error) {
			console.log(error);
		});
	}

	function makeSwaps(e: any) {
		commandText = `!swap ${e.detail.swaps[0]} ${e.detail.swaps[1]}`
	}

	function doubleClick(e: any) {
		dispatch('doubleclick', e.detail);
	}

	function handleClickedEntry(e: any) {
		commandText = `!swap ${e.detail.cam} ${e.detail.target}`
	}

	let mainLayerConfig = {id: "mainlayer", x: 0, y: 0, height: 0, width: 0};
	var zones: Box[];
	let clickTimeout: number | undefined;

	let winWidth: number, winHeight: number;
	export let commandHeight: number;

	export let ifWidth: number;
	export let ifHeight: number;

	function resizeIframeRaw() {
		winWidth = window.innerWidth;
		winHeight = window.innerHeight;

		let fullWidth: number = winWidth * .85;
		let maxHeight: number = winHeight - 4;

		let fullHeight: number = fullWidth / (16/9) ;

		if (fullHeight <= maxHeight) {
			ifWidth = fullWidth;
			ifHeight = fullHeight;
		} else {
			ifHeight = maxHeight;
			ifWidth = ifHeight * (16/9);
		}

		commandHeight = ifHeight * .06;

		let trailingHeight: number = maxHeight - commandHeight;

		if (ifHeight > trailingHeight) {
			ifHeight = trailingHeight;
			ifWidth = ifHeight * (16/9);
		}
		selector.cleanUp();
		selector.resizeStage(winWidth, winHeight)
		initializeZones(ifHeight, ifWidth);

		let overlayBox = jQuery('#overlay')[0].getBoundingClientRect();
		console.log(overlayBox)
		mainLayerConfig = {id: "mainlayer", x: overlayBox.x, y: overlayBox.y, height: overlayBox.height, width: overlayBox.width}

	}

	function initializeZones(height: number, width: number) {
		const origin: number = 0;

		let smallBoxHeight: number = height / 3;
		let smallBoxWidth: number = width / 3;

		let bigBoxHeight: number = height / 1.5;
		let bigBoxWidth: number = width / 1.5;

		zones = [
			{x: smallBoxWidth, y: origin, height: bigBoxHeight, width: bigBoxWidth, zone: 1},
			{x: origin, y: origin, height: smallBoxHeight, width: smallBoxWidth, zone: 2},
			{x: origin, y: smallBoxHeight, height: smallBoxHeight, width: smallBoxWidth, zone: 3},
			{x: origin, y: bigBoxHeight, height: smallBoxHeight, width: smallBoxWidth, zone: 4},
			{x: smallBoxWidth, y: bigBoxHeight, height: smallBoxHeight, width: smallBoxWidth, zone: 5},
			{x: bigBoxWidth, y: bigBoxHeight, height: smallBoxHeight, width: smallBoxWidth, zone: 6},
		];
		// zones = [{x: origin, y: origin, height: height, width: width, zone: 1}];
	}

	var resizeIframe = _.throttle(resizeIframeRaw, 50, { 'leading': true, 'trailing': false });

	let rightClickCoords: Coordinates = { x: 0, y: 0 };
	let menuOpen: boolean = false;
	let coordinatesRegistered: boolean = false;
	function registerMenuClick(e: any) {
		menuOpen = true;
		if (menuOpen && coordinatesRegistered) {
			openMenu(rightClickCoords);
		}
	}

	function registerCanvasClick(e: any) {
		coordinatesRegistered = true;
		rightClickCoords = {x: e.detail.x, y: e.detail.y}
		console.log(rightClickCoords)
		if (menuOpen && coordinatesRegistered) {
			openMenu(rightClickCoords);
		}
	}

	let isOpen: boolean;
	let isRendered: boolean = true;

	let swaps: SwapResponse = {found: false, cam: "", position: 0, swaps: null}
	function openMenu(coords: Coordinates) {
		isRendered = true;
		axios.post('/getSwapMenu', {
			x: coords.x,
			y: coords.y,
			frameWidth: ifWidth,
			frameHeight: ifHeight
		}).then(function (response) {
			swaps = response.data;
			console.log(response);
		}).catch(function (error) {
			console.log(error);
		});

		selector.cleanUp();
	}

	function closeMenu(e: any) {
		console.log("closing menu")
		menuOpen = false;
		coordinatesRegistered = false;
		rightClickCoords = {x: 0, y: 0};
		swaps = {found: false, cam: "", position: 0, swaps: null}
		isOpen = false;
	}

	export let zoom: number = 100;
	function handleWheel(e: WheelEvent) {
		if (commandText.startsWith("!ptzclick")) {
			let forceResize: boolean = false;
			if (e.deltaY < 0) {
				zoom += 10;
				if (zoom > 420) {
					zoom = 10000;
					forceResize = true;
				}
			} else {
				if (zoom > 0) {
					zoom -= 10;
				}
				if (zoom < 0) {
					zoom = 0;
				}
			}
			commandText = `${commandText.split(" ").slice(0, -1).join(" ")} ${zoom}`;
			if (forceResize) {
				dispatch('resizecommand');
			}
		}
	}


	const radialActions: string[] = ["send", "swap", "move", "load", "reset", "focus", "pan", "tilt", "zoom"]
	let radialMenu: Radial;
	function pressHandler(event: PressCustomEvent) {
		console.log("Press registered")
		if (!stagePressed || panning) {
			return;
		}
		console.log("remove handlers")
		selector.removeHandlers();

		radialMenu.addHandlers();

		if (clickTimeout) {
			clearTimeout(clickTimeout);
		}

		let submenu: RadialMenu = {partsCount: 4, color: "#212529", rotationOffset: 45, functionBindings: ["pan", "tilt", "back"], location: {x: 0, y: 0}, previousMenu: null, subMenus: {}}

		let rect = overlay.getBoundingClientRect()

		radialMenu.redefine({partsCount: 5, color: "#212529", rotationOffset: -90, functionBindings: radialActions, location: {x: event.detail.x - rect.left, y: event.detail.y - rect.top}, previousMenu: null, subMenus: {"move": submenu}});
		console.log("completed")
	}

	let overlay: any;
	let stageOverlay: any;
	let stagePressed: boolean = true;
	function pressHandler2(event: PressCustomEvent) {
		if (!stagePressed || panning) {
			return;
		}
		console.log("Press registered")

		if (clickTimeout) {
			clearTimeout(clickTimeout);
		}
		console.log("doing math")
		let target: any = event.detail.target;
		let rect = target.getBoundingClientRect();
		let simulateRightClickX = event.detail.x + rect.left;
		let simulateRightClickY = event.detail.y + rect.top;

		console.log("creating events")
		const pointerDownEvent = new PointerEvent('pointerdown', {bubbles: true, cancelable: true, view: window, clientX: simulateRightClickX, clientY: simulateRightClickY, button: 2, buttons: 2, pointerId: 1, isPrimary: true});
		const pointerUpEvent = new PointerEvent('pointerup', {bubbles: true, cancelable: true, view: window, clientX: simulateRightClickX, clientY: simulateRightClickY, button: 2, buttons: 0, pointerId: 1, pointerType: 'mouse', isPrimary: true});
		const leftPointerUpEvent = new PointerEvent('pointerup', {bubbles: true, cancelable: true, view: window, clientX: simulateRightClickX, clientY: simulateRightClickY, button: 0, buttons: 0, pointerId: 1, pointerType: 'mouse', isPrimary: true});

		console.log("remove handlers")
		selector.removeHandlers();

		console.log("dispatching left up")
		overlay.dispatchEvent(leftPointerUpEvent);

		console.log("dispatching right down")
		overlay.dispatchEvent(pointerDownEvent);
		console.log("dispatching right up")
		overlay.dispatchEvent(pointerUpEvent);
		console.log("opening menu")
		openMenu({x: event.detail.x, y: event.detail.y});
		console.log("completed")
	}




	let notchSizeUp: number, notchSizeDown: number;
	let panning: boolean = false;
	function panDown(gestureEvent: GestureCustomEvent) {
		if (gestureEvent.detail.pointersCount < 2) {
			return
		}
		selector.removeHandlers();
		if (!commandText.startsWith("!ptzclick")) {
			return;
		}
		notchSizeUp = Math.round(ifHeight * .01);
		notchSizeDown =  Math.round(ifHeight * .017);
		lastY = gestureEvent.detail.y;
		lastX = null;
		lastNotch = gestureEvent.detail.y;
		lastTime = gestureEvent.timeStamp;
		panning = true;
	}

	let lastNotch: number, lastTime: number, lastY: number;
	let lastX: number | null;
	function panMove(gestureEvent: GestureCustomEvent) {
		if (!panning || gestureEvent.detail.pointersCount < 2 || lastY == gestureEvent.detail.y || gestureEvent.timeStamp == lastTime) {
			return;
		}
		if (lastX && (Math.abs(lastX - gestureEvent.detail.x) > 5)) {
			return;
		}
		let forceResize: boolean = false;
		let panDirection = lastY - gestureEvent.detail.y;
		let notchDelta = lastNotch - gestureEvent.detail.y;
		if ((panDirection > 0) && (Math.abs(notchDelta) >= notchSizeUp)) {
			zoom += 10;
			if (zoom > 420) {
				zoom = 10000;
				forceResize = true;
			}
			commandText = `${commandText.split(" ").slice(0, -1).join(" ")} ${zoom}`;
			if (forceResize) {
				dispatch('resizecommand');
			}
			lastNotch = gestureEvent.detail.y;
			console.log(`move up`)
		} else if ((panDirection < 0) && (Math.abs(notchDelta) >= notchSizeDown)) {
			if (zoom > 0) {
				zoom -= 10;
			}
			if (zoom < 0) {
				zoom = 0;
			}
			commandText = `${commandText.split(" ").slice(0, -1).join(" ")} ${zoom}`;
			lastNotch = gestureEvent.detail.y;
			console.log(`move down`)
		}

		lastTime = gestureEvent.timeStamp;
		lastX = gestureEvent.detail.x;
		lastY = gestureEvent.detail.y;
	}

	function panUp(gestureEvent: GestureCustomEvent) {
		panning = false;
	}

	function bubbleSend(e: any) {
		dispatch("sendcmd");
	}

	let doit: number;
	var player: any;
	onMount(() => {
		// player = new Twitch.Player("cams", {width: "100%", height: "100%", channel: "alveussanctuary", parent: ["not"]});
		// console.log(player.getQualities());
		winWidth = window.innerWidth;
		winHeight = window.innerHeight;
		resizeIframeRaw();
		// initializeZones(ifHeight, ifWidth);
		window.onresize = function() {
			clearTimeout(doit);
			doit = setTimeout(resizeIframe, 50);
		};
		window.addEventListener('resize', resizeIframe);
		return () => {
			window.removeEventListener('resize', resizeIframe);
		};

	});
</script>

<svelte:head>
	<script src="https://player.twitch.tv/js/embed/v1.js"></script>
</svelte:head>

<div id="stage" class="unselectable z-20" bind:this={stageOverlay} on:wheel={handleWheel} use:pan on:pandown={panDown} on:panmove={panMove} on:panup={panUp} use:press={{ timeframe: 300, triggerBeforeFinished: true, spread: 16 }} on:press={pressHandler}/>
<div class="vstack gap-1" id="wrapper">
	<Motion whileFocus={{ scale: 1.3 }} let:motion>
		<div style={parent_style}height:{commandHeight}px;>
			<div use:fit={{min_size: 1}} use:motion class="text-center border border-primary rounded command z-30 movedown" id="command" style="width:{ifWidth - 2.5}px; max-width:{ifWidth}px; white-space: pre;" bind:innerHTML={commandText} contenteditable="true" autocorrect="off" autocapitalize="off" spellcheck="false">
				{commandText}
			</div>
		</div>
	</Motion>
	<div id="vid" class="ms-auto" style="width:{ifWidth}px; height:{ifHeight}px;">
		<div class="ratio ratio-16x9">

				<ContextMenu bind:isRendered bind:isOpen bind:entry={swaps} on:openmenu={registerMenuClick} on:closemenu={closeMenu} on:clickentry={handleClickedEntry} >
					<div id="overlay" class="unselectable z-10" style="background-color: rgba(255, 255, 223, 0);" bind:this={overlay} />
				</ContextMenu>

			<Tangle bind:this={selector} bind:stagePressed bind:stageWidth={winWidth} bind:stageHeight={ifHeight} bind:mainLayerConfig bind:zones bind:tangle bind:clickTimeout bind:radialMenu on:finishdrawing={getData} on:finishdrawingline={makeSwaps} on:doubleclick={doubleClick} on:rightclick={registerCanvasClick} on:sendcmd={bubbleSend} on:forceiframeresize={resizeIframe}/>

			<!-- <div id="cams" class="unselectable" style="height: {ifHeight}px; width: {ifWidth}px;"/> -->
			<iframe
				title="da cameras"
				id="cams"
				src="http://merger:Merger!23@74.208.238.87:8889/ptz-alv?controls=0"
				class="unselectable"
				allow="autoplay; fullscreen"
				allowfullscreen
			></iframe>
		</div>
	</div>
</div>

<style>
	[contenteditable="true"]:focus {
		outline: none;
	}
	.command {
		font-family: "consolas", sans-serif;
		font-weight: 600;
	}
	#command {
		position: relative;
		color: rgb(204, 212, 219);
	}
	#vid {
		width: 100%;
		height: 100%;
		position: relative;
	}
	#wrapper {
		flex-grow: 0;
	}
	#overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: transparent;
	}
	.unselectable {
		-webkit-touch-callout: none;
		-webkit-user-select: none;
		-khtml-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
		-o-user-select: none;
		user-select: none;
	}
	#stage {
		position: fixed; /* Ensure the div stays in place while scrolling */
		top: 0;          /* Aligns the div with the top of the viewport */
		left: 0;         /* Aligns the div with the left of the viewport */
		width: 100vw;    /* 100% of the viewport width */
		height: 100vh;   /* 100% of the viewport height */
		background-color: rgba(255, 12, 223, 0); /* Optional: a semi-transparent background */
	}
</style>