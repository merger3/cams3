<script lang="ts">
	import { onMount } from 'svelte';
	import Konva from "konva";
	import Tangle from './Tangle.svelte';
	import axios from 'axios';
	import { fit, parent_style } from '@leveluptuts/svelte-fit'

	export let selector: Tangle;
	export let commandText: string;

	let tangle: Konva.Rect;

	async function getData(e: Event) {
		let clickRoute = (tangle.width() == 0 && tangle.height() == 0) ? "/click" : "/draw";  
		axios.post(clickRoute, {
			x: tangle.x(),
			y: tangle.y(),
			width: tangle.width(),
			height: tangle.height(),
			frameWidth: width,
			frameHeight: height
		}).then(function (response) {
			commandText = response.data.command
			console.log(response);
		}).catch(function (error) {
			console.log(error);
		});
	}


	let winWidth: number, winHeight: number;
	let ifWidth: number, ifHeight: number;
	let commandHeight: number;

	let width: number, height: number;
	let headerHeight: number;

	function resizeIframe() {
		winWidth = window.innerWidth;
		winHeight = window.innerHeight;

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
	}

	let doit: number;
	onMount(() => {

		resizeIframe();
		window.onresize = function() {
			clearTimeout(doit);
			doit = setTimeout(resizeIframe, 50);
		};
		window.addEventListener('resize', resizeIframe);
		return () => {
			window.removeEventListener('resize', resizeIframe);
		};
    });
</script>


<div class="vstack" id="wrapper">
	<div style={parent_style}>
		<div use:fit={{min_size: 1}} class="text-center ms-auto command" id="command" style="width:{width}px; white-space: pre;" bind:clientHeight={commandHeight}>
			{commandText}
		</div>
	</div>	
	<div id="vid" class="ms-auto" style="width:{width}px; height:{height}px;" bind:clientWidth={ifWidth} bind:clientHeight={ifHeight}>
		<div class="ratio ratio-16x9">
			<div id="overlay" />
				<Tangle bind:this={selector} bind:stageWidth={width} bind:stageHeight={height} bind:tangle on:finishdrawing={getData} />
			<iframe
			title="da cameras"
			id="cams"
			class="http://74.208.238.87:8889/ptz-alv?controls=0"
			src="https://player.twitch.tv/?channel=alveussanctuary&parent=localhost"
			allow="autoplay; fullscreen"
			allowfullscreen
			></iframe>
		</div>
	</div>
</div>

<style>
	.command {
		font-family: "consolas", sans-serif;
		font-weight: 600;
	} 
	#command {
		color: rgb(204, 212, 219);
		height: 5vh;
		background-color: rgb(191, 148, 235);
	}
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