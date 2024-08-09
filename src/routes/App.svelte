<script lang="ts">
	import Konva from "konva";
	import Tangle from './Tangle.svelte';
	import CamSelector from "./CamSelector.svelte";
	import axios from 'axios';
	import Video from "./Video.svelte";

	let selector: Tangle;
	let commandText: string = "!ptzload pasture barn";

	let spacerHeight: number = 0;

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
	}
</script>


<div class="container-fluid" id="video-container">
	<div class="row justify-content-between flex-nowrap ">
		<div class="col-1 text-center gx-3 d-flex flex-column justify-content-between p-0 m-0" id="camselector">
			<CamSelector bind:spacerHeight />
			<div id="spacer" bind:clientHeight={spacerHeight}></div>
			<button on:click={sendCommand} id="sendbutton" class="btn btn-outline-primary btn-lg command">{commandText == ' ' ? "Get Data" : commandText}</button>
		</div>
		<div class="col-auto gx-2" id="wrapper">
			<Video bind:commandText bind:selector />
		</div>
	</div>
</div>

<style>
	#spacer {
		height: 100%;
		background-color: aqua;
	}
	#camselector {
		background-color: rebeccapurple;
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
		width: 100%;
	}
</style>