<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import Konva from "konva";
	import Tangle from './Tangle.svelte';
	import Zoomable from './Zoomable.svelte';
	import { fit, parent_style } from '@leveluptuts/svelte-fit'
	import ContextMenu from './ContextMenu.svelte';
	import type { SwapResponse, Coordinates, Box, RadialPart, RadialMenu, CamPresets } from '$types';
	import { Motion } from 'svelte-motion'
	import { pinch, press, type PressCustomEvent, pan, type PinchCustomEvent , type GestureCustomEvent } from 'svelte-gestures';
	import Radial from "./Radial.svelte";
	import _ from 'lodash';
	import { server, panzoom, gesturing, GetCam, multiTouchPan } from '$lib/stores';
	import { ClickTangle, DrawTangle } from '$lib/rect';
	import TangleLite from './TangleLite.svelte';


	export let selector: Tangle;
	export let commandText: string;
	export let camPresets: CamPresets;

	let panAndZoomInitialized: boolean;

	const dispatch = createEventDispatcher();


	// let tangle: Konva.Rect;
	// function getData(e: any) {
	// 	let rect: Konva.Rect = e.detail.rect;
	// 	let isClick: boolean = (rect.width() == 0 && rect.height() == 0);
	// 	let clickRoute: string = isClick ? "/click" : "/draw";
	// 	if (isClick) {
	// 		clickRoute = "/click";
	// 	} else {
	// 		clickRoute = "/draw";
	// 	}
	// 	console.log("getting data")
	// 	console.log(`ifWidth: ${ifWidth}, ifHeight: ${ifHeight}`)
		
	// 	$server.post(clickRoute, {
	// 		x: rect.x(),
	// 		y: rect.y(),
	// 		width: rect.width(),
	// 		height: rect.height(),
	// 		frameWidth: ifWidth,
	// 		frameHeight: ifHeight
	// 	}).then(function (response) {
	// 		if (isClick) {
	// 			zoom = 100;
	// 		}
	// 		commandText = response.data.command;
	// 		console.log(response);
	// 	}).catch(function (error) {
	// 		console.log(error);
	// 	});
		
	// }

	let tangle: Konva.Rect;
	function getData(e: any) {
		let rect: Konva.Rect = e.detail.rect;
		let isClick: boolean = (rect.width() == 0 && rect.height() == 0);

		let response: any;
		if (isClick) {
			response = ClickTangle({
				X: rect.x(),
				Y: rect.y(),
				Width: rect.width(),
				Height: rect.height(),
				FrameWidth: ifWidth,
				FrameHeight: ifHeight
			})
			zoom = 100;
		} else {
			response = DrawTangle({
				X: rect.x(),
				Y: rect.y(),
				Width: rect.width(),
				Height: rect.height(),
				FrameWidth: ifWidth,
				FrameHeight: ifHeight
			})
		}
		console.log("getting data")
		console.log(`ifWidth: ${ifWidth}, ifHeight: ${ifHeight}`)
		
		console.log(response);
		
		commandText = response.command;
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

	let mainLayerConfig = {id: "mainlayer", x: 0, y: 0};
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

		
		// let overlayBox = jQuery('#overlay')[0].getBoundingClientRect();
		// mainLayerConfig = {id: "mainlayer", x: overlayBox.x, y: overlayBox.y}
		// mainLayerConfig = {id: "mainlayer", x: overlayBox.x, y: overlayBox.y, height: overlayBox.height, width: overlayBox.width}

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

	var resizeIframe = _.throttle(resizeIframeRaw, 50, { 'leading': true, 'trailing': true });

	let rightClickCoords: Coordinates = { x: 0, y: 0 };
	let menuOpen: boolean = false;
	let coordinatesRegistered: boolean = false;
	function registerMenuClick(e: any) {
		menuOpen = true;
		if (menuOpen && coordinatesRegistered) {
			console.log("opening from registerMenuClick")
			openMenu(rightClickCoords);
		}
	}

	function registerCanvasClick(e: any) {
		coordinatesRegistered = true;
		rightClickCoords = {x: e.detail.x, y: e.detail.y}
		console.log(rightClickCoords)
		if (menuOpen && coordinatesRegistered) {
			console.log("opening from registerCanvasClick")
			openMenu(rightClickCoords);
		}
	}

	let isOpen: boolean;
	let isRendered: boolean = true;

	let swaps: SwapResponse = {found: false, cam: "", position: 0, swaps: null}
	async function openMenu(coords: Coordinates, target: number | null = null) {
		if (!target) {
			let shape = selector.getClickedShape(coords)
			if (!shape || !selector.testZone(shape)) {
				console.log("Shape was not clicked")
				if (shape) {
					console.log(shape)
				}
				console.log(coords)
				return;
			}
			target = Number(shape.name())
		}

		
		let cam = await GetCam({coordinates: {x: coords.x, y: coords.y}, frameWidth: ifWidth, frameHeight: ifHeight, position: target}, $server)
	
		if (!cam.found) {
			return;
		}

		isRendered = true;
		$server.post('/camera/swaps', {
			camera: cam.name
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

	
	// This shouldn't be global, pass it to the places that need it
	let mainMenu: RadialMenu;
	let radial: Radial;
	let rightClick: boolean;
	let middleClick: boolean;
	function pressHandler(event: PressCustomEvent) {
		console.log("Press registered")
		console.log(event)
		if (!stagePressed || panning || rightClick || middleClick || $gesturing) {
			console.log(`Returning early. stagePressed: ${stagePressed}, panning: ${panning}`)
			return;
		}
		let shape = selector.getClickedShape({x: event.detail.x / $panzoom.getScale(), y: event.detail.y / $panzoom.getScale()})
		if (!shape || !selector.testZone(shape)) {
			console.log("Shape was not clicked")
			return;
		}
		console.log("remove handlers")
		selector.removeHandlers();
		selector.stopListening();

		radial.addHandlers();

		if (clickTimeout) {
			clearTimeout(clickTimeout);
		}

		setupRadials(event, shape);
		radial.redefine(mainMenu);
		console.log("completed")
	}

	function setupRadials(event: PressCustomEvent, target: Konva.Shape) {
		let zone = Number(target.name())
		
		let moveParts: RadialPart[] = [
			{angle: 45, action: "up", label: "up", icon: "arrow-up"},
			{angle: 45, action: "upright", label: "upright", icon: "arrow-up-right"},
			{angle: 45, action: "right", label: "right", icon: "arrow-right"},
			{angle: 45, action: "downright", label: "downright", icon: "arrow-down-right"},
			{angle: 45, action: "down", label: "down", icon: "arrow-down"},
			{angle: 45, action: "downleft", label: "downleft", icon: "arrow-down-left"},
			{angle: 45, action: "left", label: "left", icon: "arrow-left"},
			{angle: 45, action: "upleft", label: "upleft", icon: "arrow-up-left"},
		]
		let moveMenu: RadialMenu = {color: "rgba(149, 91, 157, 1)", rotation: 22.5 - 135, location: {x: event.detail.x, y: event.detail.y}, parts: moveParts, target: zone}
		radial.setRotations(moveMenu);

		let irParts: RadialPart[] = [
			{angle: 90, action: "iroff", label: "off", icon: "lightbulb-off"},
			{angle: 90, action: "back", label: "back", icon: "arrow-bar-left"},
			{angle: 90, action: "iron", label: "on", icon: "lightbulb-fill"},
			{angle: 90, action: "irauto", label: "auto", icon: "sunrise"},
		]
		let irMenu: RadialMenu = {color: "#212529", rotation: 45, location: {x: event.detail.x, y: event.detail.y}, parts: irParts, target: zone}
		radial.setRotations(irMenu);

		let swapParts: RadialPart[] = [
			{angle: 120, action: "nextswap", label: "swap", icon: "box-arrow-up-right"},
			{angle: 60, action: "back", label: "back", icon: "arrow-bar-left"},
			{angle: 120, action: "nextload", label: "load", icon: "download"},
			{angle: 60, action: "swap", label: "swap", icon: "menu-button-wide"},
		]
		let swapMenu: RadialMenu = {color: "#212529", rotation: 30, location: {x: event.detail.x, y: event.detail.y}, parts: swapParts, target: zone}
		radial.setRotations(swapMenu);

		let parts: RadialPart[] = [
			{angle: 120, action: "send", label: "send", icon: "arrow-return-left"},
			{angle: 60, action: "submenu", label: "next", icon: "arrow-left-right", submenu: swapMenu},
			{angle: 60, action: "focus", label: "focus", icon: "eye"},
			{angle: 30, action: "submenu", label: "move", icon: "arrows-move", submenu: moveMenu},
			{angle: 30, action: "submenu", label: "ir", icon: "lightbulb", submenu: irMenu},
			{angle: 60, action: "reset", label: "reset", icon: "arrow-repeat"},	
		]
		mainMenu = {color: "#212529", rotation: -90, location: {x: event.detail.x / $panzoom.getScale(), y: event.detail.y / $panzoom.getScale()}, previousMenu: undefined, parts: parts, target: zone}
		radial.setRotations(mainMenu);

		moveMenu.previousMenu = mainMenu;
	}

	let overlay: any;
	let stageOverlay: any;
	let stagePressed: boolean = true;
	function simulateMenu(e: CustomEvent) {
		if (!stagePressed) {
			return;
		}
		console.log("Press registered")
	
		const rightClickEvent = new MouseEvent('contextmenu', {bubbles: true, cancelable: true, view: window, button: 2, buttons: 2, clientX: e.detail.menuPosition.x, clientY: e.detail.menuPosition.y});

		console.log("remove handlers")
		selector.removeHandlers();

		stageOverlay.dispatchEvent(rightClickEvent);
		openMenu(e.detail.camCoordinates, e.detail.zone);
		console.log("completed")
	}


	export let zoom: number = 100;
	let maxZoom: number = 300;
	let maxZoomTouch: number = 300;
	function handleWheel(e: WheelEvent) {
		let forceResize: boolean = false;
		if (commandText.startsWith("!ptzclick")) {
			if (e.deltaY < 0) {
				if (zoom >= 100) {
					zoom += 20;
				} else if (zoom < 10) {
					zoom += 10;
				} else {
					zoom += 10;
				}
				if (zoom > maxZoom) {
					zoom = 10000;
					forceResize = true;
				}
			} else {
				if (zoom >= 10000) {
					zoom = maxZoom;			
				} else if (zoom > 0) {
					if (zoom > 100) {
						zoom -= 20;
					} else if (zoom <= 10) {
						zoom -= 10;
					} else {
						zoom -= 10;
					}
				} 
				if (zoom < 0) {
					zoom = 0;
				}

			}
			commandText = `${commandText.split(" ").slice(0, -1).join(" ")} ${zoom}`;
			if (forceResize) {
				dispatch('resizecommand');
			}
		} else if (commandText.startsWith("!ptzfocusr")) {
			if (e.deltaY < 0) {
				zoom += 25;
			} else {
				zoom -= 25;
			}
			commandText = `${commandText.split(" ").slice(0, -1).join(" ")} ${zoom}`;
		}
	}

	let panning: boolean = false;
	function panDown(event: GestureCustomEvent) {
		console.log("panning true")
		panning = true;
		selector.removeHandlers();
		if (!commandText.startsWith("!ptzclick") && !commandText.startsWith("!ptzfocusr")) {
			panning = false;
			return;
		}
	}

	function panMove(event: any) {
		if (!panning || (!commandText.startsWith("!ptzclick") && !commandText.startsWith("!ptzfocusr"))) {
			return;
		}
		// console.log(event.detail.notch)
		let forceResize: boolean = false;
		if (commandText.startsWith("!ptzclick")) {
			if (event.detail.notch == 1) {
				if (zoom >= 100) {
					zoom += 20;
				} else if (zoom < 10) {
					zoom += 5;
				} else {
					zoom += 10;
				}
				if (zoom > maxZoomTouch) {
					zoom = 10000;
					forceResize = true;
				}
			} else if (event.detail.notch == -1) {
				if (zoom >= 10000) {
					zoom = maxZoomTouch;			
				} else if (zoom > 0) {
					if (zoom > 100) {
						zoom -= 20;
					} else if (zoom <= 10) {
						zoom -= 5;
					} else {
						zoom -= 10;
					}
				} 
				if (zoom < 0) {
					zoom = 0;
				}
			}
		} else {
			if (event.detail.notch == 1) {
				zoom += 25
			} else if (event.detail.notch == -1) {
				zoom -= 25;
			}
		}
		
		commandText = `${commandText.split(" ").slice(0, -1).join(" ")} ${zoom}`;
		if (forceResize) {
			dispatch('resizecommand');
		}
	}
	// var panMoveThrottled = _.throttle(panMove, 1, { 'leading': true, 'trailing': false });



	function panUp(gestureEvent: GestureCustomEvent) {
		panning = false;
		jQuery('.movedown').css('z-index', '');
	}

	function bubbleSend(e: any) {
		dispatch("sendcmd");
	}

	function submitCommand(e: KeyboardEvent) {
		if (e.code == "Enter") {
			e.preventDefault()
			dispatch("sendcmd");
			if (document.activeElement) {
				(document.activeElement as HTMLElement).blur();
			}
		}
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
<div class="vstack gap-1" id="wrapper">
	<div class="hstack gap-1">
		<Motion whileFocus={{ scale: 1.3 }} let:motion>
			<div style={parent_style}height:{commandHeight}px;>
				<!-- svelte-ignore a11y-no-static-element-interactions -->
				<div use:fit={{min_size: 1}} use:motion class="text-center border border-primary rounded command z-30 movedown" id="command" style="max-width:{ifWidth}px; white-space: pre;" bind:innerHTML={commandText} contenteditable="true" autocorrect="off" autocapitalize="off" spellcheck="false" on:keydown={submitCommand} >
					{commandText}
				</div>
			</div>
		</Motion>
		<button on:click={(e) => {dispatch("sendcmd");}} class="btn btn-outline-primary btn-lg text-center command p-0 m-0 z-40 movedown" style="height: {commandHeight}px; width: {ifWidth / 5}px;"> Send </button>
	</div>
	<div id="vid" class="ms-auto" style="width:{ifWidth}px; height:{ifHeight}px; overflow: visible;">
		<Zoomable bind:commandText bind:panAndZoomInitialized bind:middleClick bind:selector>
			<div class="ratio ratio-16x9">
				<ContextMenu bind:isRendered bind:isOpen bind:entry={swaps} on:openmenu={registerMenuClick} on:closemenu={closeMenu} on:clickentry={handleClickedEntry} >
					<div id="stage" class="unselectable z-20" bind:this={stageOverlay} 
						on:wheel={handleWheel} 
						use:multiTouchPan={{notchSize: Math.round(window.innerHeight / 2 * .05)}}
						on:multiTouchDown={panDown} 
						on:multiTouchMove={panMove} 
						on:multiTouchUp={panUp} 
						use:press={{ timeframe: 300, triggerBeforeFinished: true, spread: 16 }} 
						on:press={pressHandler}
					/>
					<div id="overlay" class="unselectable z-10" style="background-color: rgba(255, 255, 100, 0); height: {ifHeight}; width: {ifWidth};" bind:this={overlay} />
				</ContextMenu>
				
				<TangleLite bind:this={selector} bind:commandText bind:stagePressed bind:rightClick bind:ifWidth bind:ifHeight bind:stageWidth={winWidth} bind:stageHeight={winHeight} bind:mainLayerConfig bind:zones bind:tangle bind:clickTimeout bind:radialMenu={radial} bind:camPresets bind:panAndZoomInitialized on:finishdrawing={getData} on:finishdrawingline={makeSwaps} on:doubleclick={doubleClick} on:rightclick={registerCanvasClick} on:sendcmd={bubbleSend} on:forceiframeresize={resizeIframe} on:openmenu={simulateMenu} on:resetfocus={(e) => {zoom = 0;}}/>
					
					<!-- <div id="cams" class="unselectable" style="height: {ifHeight}px; width: {ifWidth}px;"/> -->
					
				<iframe
				title="da cameras"
				id="cams"
				src="https://camops.ptz.app:8889/ptz-alv?controls=0&autoplay=1&mute=0"
				class="unselectable"
				allow="autoplay; fullscreen"
				allowfullscreen
				></iframe>
			</div>
		</Zoomable>
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
	#cams {
		pointer-events: none;
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
		background-color: rgba(190, 51, 172, 0); /* Optional: a semi-transparent background */
	}
</style>