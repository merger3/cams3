<script lang="ts">
	import { onMount } from 'svelte';
	import Tangle from './Tangle.svelte';
	import Presets from './Presets.svelte';

	import CamSelector from "./CamSelector.svelte";
	import axios from 'axios';
	import Video from "./Video.svelte";
	import { fit, parent_style } from '@leveluptuts/svelte-fit'
	import type { CamPresets, Config } from '$types';
	import ResizeObserver from 'resize-observer-polyfill'
	
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
			commandText = defaultCMD;
		}).catch(function (error) {
			console.log(error);
		});
		selector.cleanUp();
		fixText();
	}

	async function handleDoubleClick(e: any) {
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

	function resizeText() {
		if (commandText == "<br>") {
			commandText = defaultCMD;
		}
		fit(resize, {min_size: 8});
	}

	let doit: number;
	function fixText() {
		clearTimeout(doit);
		doit = setTimeout(resizeText, 10);
	}

	let resizeObserverDefined = false;

	onMount(() => {
		window.ResizeObserver = ResizeObserver;
		resizeObserverDefined = true;

		if (commandText) {
			resizeText();
		}
	});
	$: resizeObserverDefined && commandText && resizeText();

</script>


<div class="container-fluid" id="video-container">
	<div class="row justify-content-between flex-nowrap ">
		<div class="col-1 text-center d-flex flex-column justify-content-between p-0 mx-1" id="camselector">
			<div style="min-height: {commandHeight}px;max-height: {commandHeight}px;">
				<CamSelector bind:spacerHeight bind:spacerWidth bind:commandHeight bind:camPresets bind:camList={config.camlist} />
			</div>
			<div id="spacer" bind:clientHeight={spacerHeight} bind:clientWidth={spacerWidth}>
				{#if camPresets}
					<Presets bind:spacerHeight bind:spacerWidth bind:commandText bind:camPresets on:triggerResize={fixText} />
				{/if}

			</div>
			<div id="sendcontainer" style="{parent_style}max-height: {ifHeight * .15}px;">
				<button bind:this={resize}  use:fit={{min_size: 8}} id="sendbutton" on:click={sendCommand} class="btn btn-outline-primary btn-lg w-100 text-center command p-0 m-0"> {commandText == defaultCMD ? " Send " : " " + commandText + " "} </button>
			</div>
		</div>
		<div class="col-auto g-0" id="wrapper">
			<Video bind:commandText bind:selector bind:commandHeight bind:ifHeight bind:ifWidth on:triggerResize={fixText} on:doubleclick={handleDoubleClick} />
		</div>
	</div>
</div>

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
	}

</style>