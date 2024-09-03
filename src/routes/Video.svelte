<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import Konva from "konva";
	import Tangle from './Tangle.svelte';
	import axios, { spread } from 'axios';
	import { fit, parent_style } from '@leveluptuts/svelte-fit'
	import ContextMenu from './ContextMenu.svelte';
	import type { SwapResponse, Coordinates } from '$types';
	import { M, Motion } from 'svelte-motion'
	import { press, type PressCustomEvent } from 'svelte-gestures';

	export let selector: Tangle;
	export let commandText: string;

	const dispatch = createEventDispatcher();

	let tangle: Konva.Rect;
	function getData(e: any) {
		let isClick: boolean = (e.detail.rect.width() == 0 && e.detail.rect.height() == 0);
		let clickRoute: string = isClick ? "/click" : "/draw";
		if (e.detail.rect.width() == 0 && e.detail.rect.height() == 0) {
			clickRoute = "/click";
		} else {
			clickRoute = "/draw";
		}
		axios.post(clickRoute, {
			x: tangle.x(),
			y: tangle.y(),
			width: tangle.width(),
			height: tangle.height(),
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
		dispatch('triggerResize');
	}

	function doubleClick(e: any) {
		dispatch('doubleclick', e.detail);	
	}

	function handleClickedEntry(e: any) {
		commandText = `!swap ${e.detail.cam} ${e.detail.target}`
	}

	let clickTimeout: number | undefined;

	let winWidth: number, winHeight: number;
	export let commandHeight: number;

	export let ifWidth: number; 
	export let ifHeight: number;

	function resizeIframe() {
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
	}


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
		isRendered = true;
	}

	function closeMenu(e: any) {
		menuOpen = false;
		coordinatesRegistered = false;
		rightClickCoords = {x: 0, y: 0};
		swaps = {found: false, cam: "", position: 0, swaps: null}
		isOpen = false;
		pressRegistered = false;
	}

	let zoom: number = 100;
	function handleWheel(e: WheelEvent) {
		if (commandText.startsWith("!ptzclick")) {
			if (e.deltaY < 0) {
				zoom += 10;
			} else {
				if (zoom > 0) {
					zoom -= 10;
				}
				if (zoom < 0) {
					zoom = 0;
				}
			}
			commandText = `${commandText.split(" ").slice(0, -1).join(" ")} ${zoom}`;
		}
	}



	let overlay: any;
	let pressRegistered: boolean = false;
	function pressHandler(event: PressCustomEvent) {
		console.log("Press registered")
		if (pressRegistered) {
			return;
		}

		if (clickTimeout) {
			clearTimeout(clickTimeout);
		}
		pressRegistered = true;
		let target: any = event.detail.target;
		let rect = target.getBoundingClientRect();
		let simulateRightClickX = event.detail.x + rect.left; 
		let simulateRightClickY = event.detail.y + rect.top;  

		const pointerDownEvent = new PointerEvent('pointerdown', {bubbles: true, cancelable: true, view: window, clientX: simulateRightClickX, clientY: simulateRightClickY, button: 2, buttons: 2, pointerId: 1, isPrimary: true});
		const pointerUpEvent = new PointerEvent('pointerup', {bubbles: true, cancelable: true, view: window, clientX: simulateRightClickX, clientY: simulateRightClickY, button: 2, buttons: 0, pointerId: 1, pointerType: 'mouse', isPrimary: true});
		const leftPointerUpEvent = new PointerEvent('pointerup', {bubbles: true, cancelable: true, view: window, clientX: simulateRightClickX, clientY: simulateRightClickY, button: 0, buttons: 0, pointerId: 1, pointerType: 'mouse', isPrimary: true});

		selector.removeHandlers();
		overlay.dispatchEvent(leftPointerUpEvent);
		openMenu({x: event.detail.x, y: event.detail.y});
		
		overlay.dispatchEvent(pointerDownEvent);
		overlay.dispatchEvent(pointerUpEvent);
	}


	let doit: number;
	var player: any;
	onMount(() => {
		player = new Twitch.Player("cams", {width: "100%", height: "100%", channel: "alveussanctuary"});
		// console.log(player.getQualities());
		resizeIframe();
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
	<Motion whileFocus={{ scale: 1.3 }} let:motion>
		<div style={parent_style}height:{commandHeight}px;>
			<div use:fit={{min_size: 1}} use:motion class="text-center border border-primary rounded command" id="command" style="width:{ifWidth - 2.5}px; max-width:{ifWidth}px; white-space: pre;" bind:innerHTML={commandText} contenteditable="true" autocorrect="off" autocapitalize="off" spellcheck="false">
				{commandText}
			</div>
		</div>	
	</Motion>
	<div id="vid" class="ms-auto" style="width:{ifWidth}px; height:{ifHeight}px;">
		<div class="ratio ratio-16x9">

				<ContextMenu bind:isRendered bind:isOpen bind:entry={swaps} on:openmenu={registerMenuClick} on:closemenu={closeMenu} on:clickentry={handleClickedEntry} >
					<div id="overlay" class="unselectable" bind:this={overlay} on:wheel={handleWheel} use:press={{ timeframe: 400, triggerBeforeFinished: true, spread: 4 }} on:press={pressHandler}/>
				</ContextMenu>

			<Tangle bind:this={selector} bind:stageWidth={ifWidth} bind:stageHeight={ifHeight} bind:tangle bind:clickTimeout on:finishdrawing={getData} on:doubleclick={doubleClick} on:rightclick={registerCanvasClick} />
			
			<div id="cams" class="unselectable" style="height: {ifHeight}px; width: {ifWidth}px;"/>
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
		z-index: 5;
	}
	#vid {
		width: 100%;
		height: 100%;
		position: relative;
		z-index: 1;
	}
	/* #cams {
		pointer-events: none;
		z-index: 0;
	} */
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
		z-index: 2;
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
</style>