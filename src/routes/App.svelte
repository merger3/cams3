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
	import { token, server, GetCam } from '$lib/stores';
	import _ from 'lodash';

	// import { userRole } from './stores';
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
		$server.post('/send', {
			command: commandText
		}).then(function (response) {
			console.log(response);
			zoom = 100;
		}).catch(function (error) {
			console.log(error);
		});
		commandText = defaultCMD;
		selector.cleanUp();
	}


	async function handleDoubleClick(e: any) {
		console.log("double click registered highest level")
		console.log(e)
		console.log(`ifWidth: ${ifWidth}, ifHeight: ${ifHeight}`)

		// Verify that e.detail.position is actually an integer before passing it
		// Or verify that its in the zone group  
		let cam = await GetCam({coordinates: {x: e.detail.x, y: e.detail.y}, frameWidth: ifWidth, frameHeight: ifHeight, position: e.detail.position}, $server)
		
		$server.post('/camera/presets', {
			camera: cam.name
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

	var resizeText = _.throttle(resizeTextRaw, 20, { 'leading': true, 'trailing': true });

	let resizeObserverDefined = false;
	onMount(() => {
		 // Parse the fragment from the URL
		const fragment = window.location.hash.substring(1);
		const params = new URLSearchParams(fragment);

		// Extract access_token
		const accessToken = params.get("access_token");
		// const state = params.get("state");
		// const scope = params.get("scope");
		$token = `${accessToken}`

		console.log($token)
		//$token = `oauth:51esxuzacga63qijrpwczxq95m8ejc`

		$server = axios.create({
			timeout: 0,
			auth: {
				username: 'merger3',
				password: 'Merger!23'
			},
			headers: {'X-Twitch-Token': $token}
		});

		$server.post('/authorize').then(function (response) {
			console.log(response);
			if (response.data.authorized) {
				authorized = true;
			} else {
				window.location.replace("/login");
			}
		}).catch(function (error) {
			console.log(error);
		});

		window.ResizeObserver = ResizeObserver;
		resizeObserverDefined = true;
		jQuery(".movedown").on('wheel', handleWheel)
		if (commandText) {
			resizeText();
		}
	});
	$: resizeObserverDefined && commandText && resizeText();

	let authorized: boolean = false;
</script>

<svelte:head>
	<script lang="ts">
		const fragmentCheck = window.location.hash.substring(1);
		const regex = new RegExp('access_token=\\w+&scope=[\\w%+]+&token_type=bearer');
		if (fragmentCheck == "" || !regex.test(fragmentCheck)) {
			console.log("redirecting")
			window.location.replace("/login");
		}
	</script>
</svelte:head>

{#if !authorized}
	<div id="cover" class="d-flex justify-content-center align-items-center">
		<div id="spinner" class="spinner-grow text-info" style="width: 7rem; height: 7rem;"  role="status">
			<span class="visually-hidden">Loading...</span>
		</div>	  
	</div>
{:else}
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
{/if}
	
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
	#cover {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(77, 76, 76, 0.5); /* Translucent grey */
		z-index: 9999; /* Ensures it sits above all other elements */
	}
</style>