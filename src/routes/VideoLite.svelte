<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import { commandText, ifDimensions, multiTouchPan, ClearStage, stage } from '$lib/stores';
	import { fit, parent_style } from '@leveluptuts/svelte-fit'
	import type { Box } from '$types';
	import { Motion } from 'svelte-motion'
	import { press } from 'svelte-gestures';
	import _ from 'lodash';
	import Konva from "konva";
	import TangleLite from './TangleLite.svelte';
	import Zoomable from '$lib/actions/Zoomable.svelte';
	import ContextMenu from '$lib/actions/ContextMenu.svelte';
	
	export let selector: TangleLite;

	const dispatch = createEventDispatcher();

	
	var zoneDefinitions: Box[];

	let winWidth: number, winHeight: number;
	export let commandHeight: number;


	function resizeIframeRaw() {
		winWidth = window.innerWidth;
		winHeight = window.innerHeight;

		let fullWidth: number = winWidth * .85;
		let maxHeight: number = winHeight - 4;

		let fullHeight: number = fullWidth / (16/9) ;

		if (fullHeight <= maxHeight) {
			$ifDimensions.width = fullWidth;
			$ifDimensions.height = fullHeight;
		} else {
			$ifDimensions.height = maxHeight;
			$ifDimensions.width = $ifDimensions.height * (16/9);
		}

		commandHeight = $ifDimensions.height * .06;

		let trailingHeight: number = maxHeight - commandHeight;

		if ($ifDimensions.height > trailingHeight) {
			$ifDimensions.height = trailingHeight;
			$ifDimensions.width = $ifDimensions.height * (16/9);
		}
		initializeZones($ifDimensions.height, $ifDimensions.width);
		
		clearStageDebounced($stage);
	}

	function initializeZones(height: number, width: number) {
		const origin: number = 0;

		let smallBoxHeight: number = height / 3;
		let smallBoxWidth: number = width / 3;

		let bigBoxHeight: number = height / 1.5;
		let bigBoxWidth: number = width / 1.5;

		zoneDefinitions = [
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
	var clearStageDebounced = _.debounce(ClearStage, 50, { 'leading': true, 'trailing': false })


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
		winWidth = window.innerWidth;
		winHeight = window.innerHeight;
		resizeIframeRaw();
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
	<!-- <script src="https://player.twitch.tv/js/embed/v1.js"></script> -->
</svelte:head>
<div class="vstack gap-1" id="wrapper">
	<div class="hstack gap-1">
		<Motion whileFocus={{ scale: 1.3 }} let:motion>
			<div style={parent_style}height:{commandHeight}px;>
				<!-- svelte-ignore a11y-no-static-element-interactions -->
				<div use:fit={{min_size: 1}} use:motion class="text-center border border-primary rounded command z-40 movedown" id="command" style="max-width:{$ifDimensions.width}px; white-space: pre;" bind:innerHTML={$commandText} contenteditable="true" autocorrect="off" autocapitalize="off" spellcheck="false" on:keydown={submitCommand} >
					{$commandText}
				</div>
			</div>
		</Motion>
		<button on:click={(e) => {dispatch("sendcmd");}} class="btn btn-outline-primary btn-lg text-center command p-0 m-0 z-50 movedown" style="height: {commandHeight}px; width: {$ifDimensions.width / 5}px;"> Send </button>
	</div>
	<div id="stage" class="unselectable" />
	<Zoomable>
		<div id="vid" class="ratio ratio-16x9 ms-auto" style="width:{$ifDimensions.width}px;">
			
			<ContextMenu>
				<div id="menutrigger" class="overlay unselectable z-100" />
			</ContextMenu>

			<div id="overlay" class="overlay unselectable z-10" use:multiTouchPan={{notchSize: Math.round(window.innerHeight / 2 * .05)}} use:press={{ timeframe: 300, triggerBeforeFinished: true, spread: 16 }} />

			<TangleLite bind:this={selector} bind:stageWidth={winWidth} bind:stageHeight={winHeight} bind:zoneDefinitions on:forceiframeresize={resizeIframeRaw} />
			
			<!-- <div id="cams" class="unselectable" style="height: {$ifDimensions.height}px; width: {$ifDimensions.width}px;"/> -->
			
			<!-- <iframe
			title="da cameras"
			id="cams"
			src="https://helenkellersimulator.org/"
			class="unselectable"
			allow="autoplay; fullscreen"
			allowfullscreen
			></iframe> -->
		</div>
	</Zoomable>
</div>

<style>
	/* #cams {
		pointer-events: none;
	} */
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
	#wrapper {
		flex-grow: 0;
	}
	.overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(255, 255, 100, 0);
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
		position: fixed; 
		top: 0;          
		left: 0;      
		width: 100vw; 
		height: 100vh;
		z-index: 0;
		background-color: rgba(190, 51, 172, .5);
	}
</style>