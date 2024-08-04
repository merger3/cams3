<script lang="ts">
	import {type Rectangle, type RectangleStyle } from  "./RectangleSelector.svelte";
	import RectangleSelector from "./RectangleSelector.svelte";
	import axios from 'axios';
	import { Button, Col, Row, Container } from '@sveltestrap/sveltestrap';
	import { browser } from '$app/environment';

	let video: any;
    let drawn = false
	let rectangle: Rectangle | undefined;
	const rectangleStyle: RectangleStyle = {
		border: '2px solid red',
		backgroundColor: 'rgba(245, 106, 106, 0.35)',
	};

	function updateRectangle(newRectangle: Rectangle) {
		rectangle = newRectangle;
	}
	
	async function getData() {
		if (rectangle) {
			axios.post('/draw', {
				x: rectangle.x,
				y: rectangle.y,
				width: rectangle.width,
				height: rectangle.height,
				frameWidth: rectangle.frameWidth,
    			frameHeight: rectangle.frameHeight
			}).then(function (response) {
				if (rectangle) {
					rectangle.x = response.data.x
					rectangle.y = response.data.y
				}
				console.log(response);
			}).catch(function (error) {
				console.log(error);
			});
		}
	}
	var width: number
	var height: number
	var fwidth: number
	var fheight: number
	if (browser) {
		window.addEventListener('resize', function(event){
			let bounds = video.getBoundingClientRect();
			width = window.innerWidth;
			height = window.innerHeight;
			fwidth = Math.round(bounds.width);
			fheight = Math.round(bounds.height)	;
		});
  }
</script>



<div class="container-fluid" id="video-container">
	<div class="row justify-content-start">
		<div class="col-1 vstack align-self-center text-center" id="coordinates">
			<!-- {rectangle?.x == undefined ? 0 : Math.round(rectangle.x)} x {rectangle?.y == undefined ? 0 : Math.round(rectangle.y)} -->
			{width} x {height} <br>
			{fwidth} x {fheight}
			<div>
				<button on:click={getData} class="btn btn-outline-primary btn-lg">Get Data</button>
			</div>
		</div>

		<div class="col-1 vstack ms-auto" id="wrapper">
			<div class="text-center" id="command">
				!ptzload pasture barn
			</div>
			<div id="vid" class="ratio ratio-16x9 ms-auto" bind:this={video}>
				<iframe
					title="da cameras"
					id="cams"
					src="https://www.twitch.tv"
					allow="autoplay; fullscreen"
					allowfullscreen
				></iframe>
			</div>
		</div>
	</div>
</div>

<style>
	#wrapper {
		width: 100%;
	}
	#vid {
		width: 80%;
	}
	#cams {
		pointer-events: none;
	}
</style>