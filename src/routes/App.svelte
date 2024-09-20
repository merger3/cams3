<script lang="ts">
	import { onMount } from 'svelte';
	import Tangle from './Tangle.svelte';
	import Presets from './Presets.svelte';
	import Chat from './Chat.svelte';
	import CamSelector from "./CamSelector.svelte";
	import axios from 'axios';
	import Video from "./Video.svelte";
	import { fit, parent_style } from '@leveluptuts/svelte-fit'
	import type { CamPresets, Config } from '$types';
	import ResizeObserver from 'resize-observer-polyfill'
	import * as Tabs from "$lib/components/ui/tabs/index.js";
	
	import _ from 'lodash';

	const defaultCMD: string = "​";

	export let config: Config;
	let selector: Tangle;
	let commandText: string = defaultCMD;
	
	let camPresets: CamPresets;

	let commandHeight: number;
	let ifHeight: number;
	let ifWidth: number;

	let spacerHeight: number;
	let spacerWidth: number;

	let resize: HTMLElement;

	async function sendCommand() {
		axios.post('/send', {
			command: commandText
		}).then(function (response) {
			console.log(response);
		}).catch(function (error) {
			console.log(error);
		});
		commandText = defaultCMD;
		selector.cleanUp();
	}

	async function handleDoubleClick(e: any) {
		console.log("double click registered highest level")
		console.log(`ifWidth: ${ifWidth}, ifHeight: ${ifHeight}`)
		axios.post('/getClickedCam', {
			x: e.detail.x,
			y: e.detail.y,
			frameWidth: ifWidth,
			frameHeight: ifHeight
		}).then(function (response) {
			camPresets = response.data.camPresets;
			console.log(response);
		}).catch(function (error) {
			console.log(error);
		});
	}

	let zoom: number = 100;
	function handleWheel(event: any) {
		let e = event.originalEvent as WheelEvent;
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
				resizeText();
			}
		}
	}

	function resizeTextRaw() {
		if (commandText == "<br>") {
			commandText = defaultCMD;
		}
		fit(resize, {min_size: 8});
	}

	var resizeText = _.throttle(resizeTextRaw, 50, { 'leading': true, 'trailing': false });

	let resizeObserverDefined = false;
	onMount(() => {
		window.ResizeObserver = ResizeObserver;
		resizeObserverDefined = true;
		jQuery(".movedown").on('wheel', handleWheel)
		if (commandText) {
			resizeText();
		}
	});
	$: resizeObserverDefined && commandText && resizeText();


</script>

<div class="container-fluid" id="video-container">
	<div class="row justify-content-between flex-nowrap ">
		<div class="col-1 text-center d-flex flex-column justify-content-between p-0 mx-1 z-30 movedown" id="camselector">
			<div style="min-height: {commandHeight}px;max-height: {commandHeight}px;">
				<CamSelector bind:spacerHeight bind:spacerWidth bind:commandHeight bind:camPresets bind:camList={config.camlist} />
			</div>
			<div id="spacer" bind:clientHeight={spacerHeight} bind:clientWidth={spacerWidth}>
				{#if camPresets}
					<Presets bind:spacerHeight bind:spacerWidth bind:commandText bind:camPresets on:sendcmd={sendCommand} />
				{/if}

			</div>
			<div id="sendcontainer" style="{parent_style}max-height: {ifHeight * .15}px;">
				<button bind:this={resize}  use:fit={{min_size: 16}} id="sendbutton" on:click={sendCommand} class="btn btn-outline-primary btn-lg w-100 text-center command p-0 m-0 z-30 movedown"> {commandText == defaultCMD ? " Send " : " " + commandText + " "} </button>
			</div>
		</div>
		<div class="col-auto g-0" id="wrapper">
			<Video bind:commandText bind:selector bind:commandHeight bind:ifHeight bind:ifWidth bind:zoom bind:camPresets on:doubleclick={handleDoubleClick} on:resizecommand={resizeText} on:sendcmd={sendCommand} />
		</div>
	</div>
</div>
<Chat bind:ifHeight={commandHeight}/>


<style>
	#spacer {
		height: 100%;
		/* background-color: aqua; */
	}
	#camselector {
		/* background-color: rebeccapurple; */
		flex-grow: 1;
	}
	.command {
		font-family: "consolas", sans-serif;
		font-weight: 600;
	}
	#wrapper {
		flex-grow: 0;
	}
	#sendbutton {
		height: 100%;
		white-space: pre;
		position: relative;
	}
	
</style>