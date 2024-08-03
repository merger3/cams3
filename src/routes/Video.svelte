<script lang="ts">
	import {type Rectangle, type RectangleStyle } from  "./RectangleSelector.svelte";
	import RectangleSelector from "./RectangleSelector.svelte";
	import axios from 'axios';
	import { Button, Col, Row, Container } from '@sveltestrap/sveltestrap';
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
</script>



<div class="container-fluid" id="video-container">
	<div class="row justify-content-start">
		<div class="col-1 vstack text-center" id="coordinates">
			{rectangle?.x == undefined ? 0 : Math.round(rectangle.x)} x {rectangle?.y == undefined ? 0 : Math.round(rectangle.y)}
			<div>
				<button on:click={getData} class="btn btn-outline-primary btn-lg">Get Data</button>
			</div>
		</div>

		<div class="col-1 vstack ms-auto" id="wrapper">
			<div class="text-center" id="command">
				!ptzload pasture barn
			</div>
			<RectangleSelector onUpdateRectangle={updateRectangle} rectangleStyle={rectangleStyle} drawn={drawn}>
					<iframe
							title="da cameras"
							id="cams"
							class="http://74.208.238.87:8889/ptz-alv/?controls=0"
							src="https://www.twitch.tv"
							frameborder="0"
							allow="autoplay; fullscreen"
							allowfullscreen
					></iframe>
			</RectangleSelector>
		</div>
	</div>
</div>

<style>
	#command {
		width: 80%;
	}
	#video-container {
		position: relative;
	}
	#wrapper {
		width: 80%;
	}
	#cams {
		pointer-events: none;
	}
</style>