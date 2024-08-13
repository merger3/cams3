<script lang="ts">
	import Tangle from './Tangle.svelte';
	import { onMount } from 'svelte';
	import Presets from './Presets.svelte';

	import CamSelector from "./CamSelector.svelte";
	import axios from 'axios';
	import Video from "./Video.svelte";
	import { fit, parent_style } from '@leveluptuts/svelte-fit'
	import type { Config } from '$types';

	export let config: Config;
	let selector: Tangle;
	let commandText: string = " ";

	let commandHeight: number;
	let ifHeight: number;

	let spacerHeight: number;
	let spacerWidth: number;

	let resize: HTMLElement;

	async function sendCommand() {
		axios.post('/send', {
			command: commandText
		}).then(function (response) {
			console.log(response);
			commandText = " "
		}).catch(function (error) {
			console.log(error);
		});
		selector.cleanUp();
		fixText();
	}
	function resizeText() {
		fit(resize, {min_size: 8});
	}

	let doit: number;
	function fixText() {
		clearTimeout(doit);
		doit = setTimeout(resizeText, 5);
	}

	// $: commandText && fit(resize, {min_size: 8});
</script>


<div class="container-fluid" id="video-container">
	<div class="row justify-content-between flex-nowrap ">
		<div class="col-1 text-center d-flex flex-column justify-content-between p-0 mx-1" id="camselector">
			<div style="min-height: {commandHeight}px;max-height: {commandHeight}px;">
				<CamSelector bind:spacerHeight bind:spacerWidth bind:commandHeight bind:camList={config.camlist} />
			</div>
			<div id="spacer" bind:clientHeight={spacerHeight} bind:clientWidth={spacerWidth}>
				<Presets bind:spacerHeight bind:spacerWidth bind:commandText on:triggerResize={fixText}/>
			</div>
			<div id="sendcontainer" style="{parent_style}max-height: {ifHeight * .15}px;">
				<button bind:this={resize}  use:fit={{min_size: 8}} id="sendbutton" on:click={sendCommand} class="btn btn-outline-primary btn-lg w-100 text-center command p-0 m-0"> {commandText == ' ' ? " Send " : " " + commandText + " "} </button>
			</div>
		</div>
		<div class="col-auto g-0" id="wrapper">
			<Video bind:commandText bind:selector bind:commandHeight bind:ifHeight on:triggerResize={fixText} />
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