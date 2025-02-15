<script lang="ts">
	import { onMount } from 'svelte';
	import Presets from './Presets.svelte';
	import Chat from './Chat.svelte';
	import CamSelector from "./CamSelector.svelte";
	import VideoLite from './VideoLite.svelte';
	import Keyboard from './Keyboard.svelte';
	import axios from 'axios';
	import { fit, parent_style } from '@leveluptuts/svelte-fit'
	import { Motion } from 'svelte-motion'
	import ResizeObserver from 'resize-observer-polyfill'
	import { commandText, GetScreenSize, token, server, InitializeAM, ifDimensions, am, stage, Reset, zones, commandHeight, keyboardHandler, sendCommand, resizeText } from '$lib/stores';
	import _ from 'lodash';
	
	InitializeAM();

	const defaultCMD: string = "​";
	export let videosource: number;

	$commandText = defaultCMD;

	let resize: HTMLElement;

	function resizeTextRaw() {
		if ($commandText == "<br>") {
			$commandText = defaultCMD;
		}
		fit(resize, {min_size: 8});
	}
	$resizeText = _.debounce(resizeTextRaw, 20, { 'leading': true, 'trailing': true });

	function setTheme(): boolean {
		const timeout = 50;
		if ($commandText == defaultCMD) {
			jQuery(".themed").removeClass("btn-outline-primary-alt").addClass("btn-outline-primary");
			jQuery("#command").css("pointer-events", "none");
			setTimeout(() => {
				jQuery("#command").removeClass("border-primary-alt").addClass("border-primary").text("​");
				jQuery("#sendbutton").text(" Send ");
				resizeTextRaw();
			}, timeout);
		} else {
			jQuery(".themed").removeClass("btn-outline-primary").addClass("btn-outline-primary-alt");
			jQuery("#command").css("pointer-events", "all");

			setTimeout(() => {
				jQuery("#command").removeClass("border-primary").addClass("border-primary-alt").text($commandText);
				jQuery("#sendbutton").text(` ${$commandText} `);
				resizeTextRaw();
			}, timeout);
		}
		return true;
	}

	let animationScale: number = 1;
	let scaleMod: number = 0;
	function setScale() {
		switch (GetScreenSize()) {
			case "small":
				scaleMod = .2
				break;
			case "medium":
				scaleMod = .15
				break;
			case "large":
				scaleMod = .15
				break;
		}
		animationScale = 1 + scaleMod;
	}


	let authorized: boolean = false;
	function checkAuth() {
		$server.post('/authorize').then(function (response) {
			if (response.data.authorized) {
				authorized = true;
			} else {
				authorized = false;
			}
		}).catch(function (error) {
			console.log(error);
		});
	}

	let resizeObserverDefined = false;
	onMount(async () => {
		const fragment = window.location.hash.substring(1);
		const params = new URLSearchParams(fragment);
		$token = params.get("access_token");

		$server = axios.create({
			timeout: 10000,
			baseURL: '/api/',
			headers: {'X-Twitch-Token': $token}
		});

		$server.interceptors.response.use(function (response) {
			return response;
		}, function (error) {
			if (error.status == 401) {
				window.location.replace("/login");
			}
			return error;
		});

		checkAuth();
		setInterval(() => {
			checkAuth();
		}, 600000);
	
		window.ResizeObserver = ResizeObserver;
		resizeObserverDefined = true;
		window.addEventListener(`contextmenu`, (e) => e.preventDefault());
		// jQuery(".movedown").on('wheel', handleWheel)
		if ($commandText) {
			$resizeText();
		}

		switch (GetScreenSize()) {
			case "small":
				scaleMod = .35
				break;
			case "medium":
				scaleMod = .2
				break;
			case "large":
				scaleMod = .15
				break;
		}
		console.log(scaleMod)
	});

	$: resizeObserverDefined && $commandText && setTheme() && $resizeText();

	


	// These are temporary pending settings implementation, as well as everywhere they are bound
	let selected = "btn-outline-secondary"
	let quicksendSelected = "btn-outline-secondary"
	let controls = 0;
</script>

<svelte:head>
	<script lang="ts">
		const fragment = window.location.hash.substring(1);
		const regex = new RegExp('access_token=\\w+&scope=[\\w%+]+&token_type=bearer');
		if (fragment == "" || !regex.test(fragment)) {
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
			<div class="col-1 text-center d-flex flex-column justify-content-between p-0 mx-1" id="camselector" style="max-height: {$commandHeight + $ifDimensions.height}px;">
				<div style="min-height: {$commandHeight}px;max-height: {$commandHeight}px;">
					<CamSelector bind:controls bind:selected bind:quicksendSelected/>
				</div>
				<Presets bind:quicksendSelected />
				<Motion animate={{ scale: animationScale }} transition={{ duration: .12 }} onAnimationComplete={(definition) => {animationScale = 1}} let:motion>
					<div class="justify-content-end overflow-visible z-50" use:motion style="{parent_style}max-height: {$ifDimensions.height * .15}px;">
						<button bind:this={resize}  use:fit={{min_size: 16}} id="sendbutton" on:click={() => {setScale(); sendCommand({cmd: $commandText})}} class="btn btn-outline-primary btn-lg w-100 text-center command p-0 m-0 z-50 movedown themed" > Send </button>
					</div>
				</Motion>
			</div>
			<div class="col-auto g-0" id="wrapper">
				<VideoLite bind:controls bind:videosource on:sendcmd={sendCommand}/>
			</div>
		</div>
	</div>
	<Keyboard bind:this={$keyboardHandler} bind:controls bind:selected on:sendcmd={sendCommand}/>
	<Chat />
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