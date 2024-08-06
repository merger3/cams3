<script lang="ts">
	import {type Rectangle, type RectangleStyle } from  "./RectangleSelector.svelte";
	import Konva from "konva";

	import Tangle from './Tangle.svelte';
	import axios from 'axios';
	import { onMount } from 'svelte';

    let drawn = false
	let modified = false
	let tangle: Konva.Rect;
	


	
	let commandText: string = " ";
	async function getData() {
		if (commandText != " " && !modified) {
			axios.post('/send', {
				command: commandText
			}).then(function (response) {
				console.log(response);
				commandText = " "
				drawn = false
			}).catch(function (error) {
				console.log(error);
			});
			console.log(drawn)
		} else if (tangle) {
			let route: string = drawn ? '/draw' : '/click'
			axios.post(route, {
				x: tangle.x(),
				y: tangle.y(),
				width: tangle.width(),
				height: tangle.height(),
			}).then(function (response) {
				// if (rectangle) {
				// 	rectangle.x = Number(response.data.x)
				// 	rectangle.y = Number(response.data.y)
				// }
				modified = false
				commandText = response.data.command

				console.log(response);
			}).catch(function (error) {
				console.log(error);
			});
		}
	}
	let winWidth: number, winHeight: number;
	let ifWidth: number, ifHeight: number;
	let commandHeight: number;

	let width: number, height: number;

	function resizeIframe() {
		winWidth = window.innerWidth;
		winHeight = window.innerHeight;
		console.log(winWidth)
		let trailingHeight: number = winHeight - commandHeight - 4;
		let trailingWidth: number = winWidth * .8;
		
		let fullHeight: number = trailingWidth / (16/9) ;

		if (fullHeight <= trailingHeight) {
			width = trailingWidth;
			height = fullHeight;
		} else {
			height = trailingHeight;
			width = height * (16/9);
		}

		drawn = false
	}

	onMount(() => {
		resizeIframe();
		window.addEventListener('resize', resizeIframe);
		return () => {
			window.removeEventListener('resize', resizeIframe);
		};
    });
</script>


<div class="container-fluid" id="video-container">
	<div class="row justify-content-between">
		<div class="col-1 vstack text-center align-self-end gx-3" id="coordinates">
			{tangle?.x() == undefined ? 0 : Math.round(tangle.x())} x {tangle?.y() == undefined ? 0 : Math.round(tangle.y())}
			<div>
				<button on:click={getData} id="sendbutton" class="btn btn-outline-primary btn-lg">{commandText == ' ' ? "Get Data" : commandText}</button>
			</div>
		</div>

		<div class="col-auto vstack gx-2" id="wrapper">
			<div class="text-center ms-auto" id="command" style="width:{width}px; white-space: pre;" bind:clientHeight={commandHeight}>
				{commandText}
			</div>
			<div id="vid" class="ms-auto" style="width:{width}px; height:{height}px;" bind:clientWidth={ifWidth} bind:clientHeight={ifHeight}>
				<div class="ratio ratio-16x9">
					<div id="overlay" />
					<Tangle bind:stageWidth={width} bind:stageHeight={height} bind:tangle />
					<iframe
					title="da cameras"
					id="cams"
					src="http://74.208.238.87:8889/ptz-alv?controls=0"
					class="https://www.twitch.tv"
					allow="autoplay; fullscreen"
					allowfullscreen
				></iframe>
			</div>
			</div>
		</div>
	</div>
</div>

<style>
	#vid {
		width: 100%;
		height: 100%;
		position: relative;
		z-index: 1;
	}
	#cams {
		pointer-events: none;
		z-index: 0;
	}
	#wrapper {
		flex-grow: 0;
	}
	#sendbutton {
		width: 100%;
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
</style>