<script lang="ts">
	import {type Rectangle, type RectangleStyle } from  "./RectangleSelector.svelte";
	import RectangleSelector from "./RectangleSelector.svelte";
	import axios from 'axios';
	import { onMount } from 'svelte';

    let drawn = false
	let modified = false
	let rectangle: Rectangle | undefined;
	const rectangleStyle: RectangleStyle = {
		border: '2px solid red',
		backgroundColor: 'rgba(245, 106, 106, 0.35)',
	};

	function updateRectangle(newRectangle: Rectangle) {
		rectangle = newRectangle;
		if (commandText != " ") {
			modified = true
		}
	}
	
	let commandText: string = " ";
	async function getData() {
		if (commandText != " " && !modified) {
			axios.post('/send', {
				command: commandText
			}).then(function (response) {
				console.log(response);
				rectangle = undefined
				commandText = " "
				drawn = false
			}).catch(function (error) {
				console.log(error);
			});
			console.log(drawn)
		} else if (rectangle) {
			let route: string = drawn ? '/draw' : '/click'
			axios.post(route, {
				x: rectangle.x,
				y: rectangle.y,
				width: rectangle.width,
				height: rectangle.height,
				frameWidth: rectangle.frameWidth,
    			frameHeight: rectangle.frameHeight
			}).then(function (response) {
				if (rectangle) {
					rectangle.x = Number(response.data.x)
					rectangle.y = Number(response.data.y)
				}
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
			{rectangle?.x == undefined ? 0 : Math.round(rectangle.x)} x {rectangle?.y == undefined ? 0 : Math.round(rectangle.y)}
			<div>
				<button on:click={getData} id="sendbutton" class="btn btn-outline-primary btn-lg">{commandText == ' ' ? "Get Data" : commandText}</button>
			</div>
		</div>

		<div class="col-auto vstack gx-2" id="wrapper">
			<div class="text-center ms-auto" id="command" style="width:{width}px; white-space: pre;" bind:clientHeight={commandHeight}>
				{commandText}
			</div>
			<div id="vid" class="ms-auto" style="width:{width}px; height:{height}px;" bind:clientWidth={ifWidth} bind:clientHeight={ifHeight}>
				<RectangleSelector onUpdateRectangle={updateRectangle} rectangleStyle={rectangleStyle} bind:drawn>
					<iframe
						title="da cameras"
						id="cams"
						class="http://74.208.238.87:8889/ptz-alv?controls=0"
						src="https://www.twitch.tv"
						allow="autoplay; fullscreen"
						allowfullscreen
					></iframe>
				</RectangleSelector>
			</div>
		</div>
	</div>
</div>

<style>
	#vid {
		width: 100%;
		height: 100%;
	}
	#cams {
		pointer-events: none;
	}
	#wrapper {
		flex-grow: 0;
	}
	#sendbutton {
		width: 100%;
	}
</style>