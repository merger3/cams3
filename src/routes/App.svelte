<script lang="ts">
	import { onMount } from 'svelte';
	import TangleLite from './TangleLite.svelte';
	import Presets from './Presets.svelte';
	import Chat from './Chat.svelte';
	import CamSelector from "./CamSelector.svelte";
	import VideoLite from './VideoLite.svelte';
	import axios from 'axios';
	import { fit, parent_style } from '@leveluptuts/svelte-fit'
	import { Selector, RemoveSelection, AddSelection, GetSelectedRect } from '$lib/zones';
	import ResizeObserver from 'resize-observer-polyfill'
	import { commandText, token, server, GetCam, InitializeAM, ifDimensions, am, clickZoom, clickFocus, ClearStage, stage, Reset, zones } from '$lib/stores';
	import _ from 'lodash';
	InitializeAM();

	const defaultCMD: string = "​";
	const swapRegEx = new RegExp('^\!swap ([0-9]) ([0-9])$');

	let selector: TangleLite;
	$commandText = defaultCMD;
	
	let commandHeight: number;
	let resize: HTMLElement;

	async function sendCommand() {
		// Edge case with click delay must be manually cancelled here
		$am.Actions["click"].Cancel();

		let response = await $server.post('/send', {
			command: $commandText
		});
		
		let result = swapRegEx.exec($commandText);
		if (result) {
			let presetSelected = GetSelectedRect(Selector.Presets);
			if (presetSelected?.name()) {
				let presetZone = presetSelected.name();
				let targetZone = presetZone === result[1] ? result[2] : (presetZone === result[2] ? result[1] : null);
				
				if (targetZone) {
					AddSelection($zones.findOne(`.${targetZone}`), Selector.Presets);
				}
			}
		}

		Reset($stage);
		if (document.activeElement) {
			(document.activeElement as HTMLElement).blur();
		}
	}

	function resizeTextRaw() {
		if ($commandText == "<br>") {
			$commandText = defaultCMD;
		}
		fit(resize, {min_size: 8});
	}

	var resizeText = _.throttle(resizeTextRaw, 20, { 'leading': true, 'trailing': true });

	let resizeObserverDefined = false;
	onMount(() => {
		const fragment = window.location.hash.substring(1);
		const params = new URLSearchParams(fragment);
		$token = params.get("access_token");

		$server = axios.create({
			timeout: 10000,
			auth: {
				username: 'merger3',
				password: 'Merger!23'
			},
			baseURL: 'https://alvsanc-cams.dev/api/',
			headers: {'X-Twitch-Token': $token}
		});

		$server.interceptors.response.use(function (response) {
			return response;
		}, function (error) {
			console.log(error.response)
			if (error.status == 401) {
				window.location.replace("/login");
			}
			return Promise.reject(error);
		});


		$server.post('/authorize').then(function (response) {
			if (response.data.authorized) {
				authorized = true;
			} else {
				authorized = false;
			}
		}).catch(function (error) {
			console.log(error);
		});

	
		window.ResizeObserver = ResizeObserver;
		resizeObserverDefined = true;
		window.addEventListener(`contextmenu`, (e) => e.preventDefault());

		// jQuery(".movedown").on('wheel', handleWheel)
		if ($commandText) {
			resizeText();
		}
	});
	$: resizeObserverDefined && $commandText && resizeText();

	let authorized: boolean = false;
</script>

<svelte:head>
	<script lang="ts">

		const fragment = window.location.hash.substring(1);
		const regex = new RegExp('access_token=\\w+&scope=[\\w%+]+&token_type=bearer');
		if (fragment == "" || !regex.test(fragment)) {
			// console.log("redirecting")
			// window.location.replace("/login");
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
			<div class="col-1 text-center d-flex flex-column justify-content-between p-0 mx-1" id="camselector" style="max-height: {commandHeight + $ifDimensions.height}px;">
				<div style="min-height: {commandHeight}px;max-height: {commandHeight}px;">
					<CamSelector bind:commandHeight />
				</div>
				<Presets on:sendcmd={sendCommand} />
				<div class="overflow-hidden justify-content-end" style="{parent_style}max-height: {$ifDimensions.height * .15}px;">
					<button bind:this={resize}  use:fit={{min_size: 16}} id="sendbutton" on:click={sendCommand} class="btn btn-outline-primary btn-lg w-100 text-center command p-0 m-0 z-40 movedown"> {$commandText == defaultCMD ? " Send " : " " + $commandText + " "} </button>
				</div>
			</div>
			<div class="col-auto g-0" id="wrapper">
				<VideoLite bind:selector bind:commandHeight on:sendcmd={sendCommand}/>
			</div>
		</div>
	</div>
	<!-- <Chat /> -->
{/if}
	
<style>
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