<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import Konva from "konva";
	import Tangle from './Tangle.svelte';
	import { fit, parent_style } from '@leveluptuts/svelte-fit'
	import type { SwapResponse, Coordinates, Box, RadialPart, RadialMenu, CamPresets } from '$types';
	import { Motion } from 'svelte-motion'
	import _ from 'lodash';
	import TangleLite from './TangleLite.svelte';

	export let selector: Tangle;
	export let commandText: string;

	const dispatch = createEventDispatcher();

	
	var zones: Box[];

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

		console.log(ifHeight)
		console.log(ifWidth)
		
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

	let stageOverlay: any;
</script>

<svelte:head>
	<!-- <script src="https://player.twitch.tv/js/embed/v1.js"></script> -->
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
	<div id="vid" class="ratio ratio-16x9 ms-auto" style="width:{ifWidth}px;">


		<div id="stage" class="unselectable z-20" bind:this={stageOverlay} />
		<div id="overlay" class="unselectable z-10" style="background-color: rgba(255, 255, 100, 0); height: {ifHeight}; width: {ifWidth};" />

		<TangleLite bind:stageWidth={winWidth} bind:stageHeight={winHeight} bind:zones/>
			
			<!-- <div id="cams" class="unselectable" style="height: {ifHeight}px; width: {ifWidth}px;"/> -->
			
		<iframe
		title="da cameras"
		id="cams"
		src="https://helenkellersimulator.org/"
		class="unselectable"
		allow="autoplay; fullscreen"
		allowfullscreen
		></iframe>
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