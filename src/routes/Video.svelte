<script lang="ts">
	import {type Rectangle, type RectangleStyle } from  "./RectangleSelector.svelte";
	import RectangleSelector from "./RectangleSelector.svelte";
	import axios from 'axios';

	let m = { x: 0, y: 0 };

	function handleMove(event: any) {
		var rect = event.target.getBoundingClientRect();
		m.x = Math.round(event.clientX - rect.left); //x position within the element.
		m.y = Math.round(event.clientY - rect.top);  //y position within the element
	}

    let drawn = false
	let rectangle: Rectangle | undefined;
	const rectangleStyle: RectangleStyle = {
		border: '2px solid red',
		backgroundColor: 'rgba(255, 0, 0, 0.5)',
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
				height: rectangle.height
			}).then(function (response) {
				console.log(response);
			}).catch(function (error) {
				console.log(error);
			});
		}
	}
</script>



<div id="video-container">
	<span>{m.x} x {m.y}</span>
	<div>
		<button on:click={getData}>Get Data</button>
	  </div>
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<!-- src="http://74.208.238.87:8889/ptz-alv/?controls=0" -->
		
	<div id="wrapper" on:click={handleMove}>
			<RectangleSelector onUpdateRectangle={updateRectangle} rectangleStyle={rectangleStyle} drawn={drawn}>
					<iframe
							title="da cameras"
							id="cams"
							src="http://74.208.238.87:8889/ptz-alv/?controls=0"
							frameborder="0"
							allow="autoplay; fullscreen"
							allowfullscreen

					></iframe>
				</RectangleSelector>
			</div>
<h1>Vite + Svelte</h1>
</div>

<style>
	#video-container {
		position: relative;
		width: 100vw;
		height: 100vh;
		display: flex;
		flex-direction: row;
	}
	#wrapper {
		width: 100%;
		/* align-self: stretch; */
		aspect-ratio: 16 / 9;
	}
	#cams {
		width: 100%;
		pointer-events: none;
		aspect-ratio: 16 / 9;

	}
	#video-container h1 {
		white-space: nowrap;
	}
	#video-container span {
		white-space: nowrap;
		width: 10%;
	}

</style>