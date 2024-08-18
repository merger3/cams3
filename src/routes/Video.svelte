<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import Konva from "konva";
	import Tangle from './Tangle.svelte';
	import axios from 'axios';
	import { fit, parent_style } from '@leveluptuts/svelte-fit'
	import ContextMenu from './ContextMenu.svelte';

	export let selector: Tangle;
	export let commandText: string;

	const dispatch = createEventDispatcher();

	let tangle: Konva.Rect;

	function getData(e: any) {
		let clickRoute = (e.detail.rect.width() == 0 && e.detail.rect.height() == 0) ? "/click" : "/draw";  
		axios.post(clickRoute, {
			x: tangle.x(),
			y: tangle.y(),
			width: tangle.width(),
			height: tangle.height(),
			frameWidth: ifWidth,
			frameHeight: ifHeight
		}).then(function (response) {
			commandText = response.data.command;
			console.log(response);
		}).catch(function (error) {
			console.log(error);
		});
		dispatch('triggerResize');
	}

	function doubleClick(e: any) {
		dispatch('doubleclick', e.detail);	
	}


	let winWidth: number, winHeight: number;
	export let commandHeight: number;

	export let ifWidth: number; 
	export let ifHeight: number;

	function resizeIframe() {
		winWidth = window.innerWidth;
		winHeight = window.innerHeight;

		let fullWidth: number = winWidth * .85;
		let maxHeight: number = winHeight - 4;
		
		let fullHeight: number = fullWidth / (16/9) ;

		if (fullHeight <= maxHeight) {
			ifWidth = fullWidth;
			ifHeight = fullHeight;
		} else {
			ifHeight = maxHeight;
			ifWidth = ifHeight * (16/9);
		}

		commandHeight = ifHeight * .06;

		let trailingHeight: number = maxHeight - commandHeight;

		if (ifHeight > trailingHeight) {
			ifHeight = trailingHeight;
			ifWidth = ifHeight * (16/9);
		}
		selector.cleanUp();
	}

	// let lastScrollTop = 0; // Keep track of the last scroll position

	// function scrollDirection(e: Event) {
	
	// 	// Get the current scroll position
	// 	let currentScrollTop = e.target!.scrollTop;

	// 	if (currentScrollTop > lastScrollTop) {
	// 		// Scrolling down
	// 		console.log("Scrolling down");
	// 	} else if (currentScrollTop < lastScrollTop) {
	// 		// Scrolling up
	// 		console.log("Scrolling up");
	// 	}

	// 	// Update lastScrollTop to the current position
	// 	lastScrollTop = currentScrollTop;
	// }
	let isOpen: boolean = true;
	function toggleOpen() {
		isOpen = !isOpen
		console.log(isOpen)
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
	let overlay: any;
</script>


<div class="vstack gap-1" id="wrapper">
	<button on:click={toggleOpen} class="btn btn-outline-primary btn-lg w-100 text-center command p-0 m-0"> CLINK ME </button>
	<div style={parent_style}height:{commandHeight}px;>
		<div use:fit={{min_size: 1}} class="text-center mt-2 border border-primary rounded command" id="command" style="width:{ifWidth - 2.5}px; max-width:{ifWidth}px; height:70%; white-space: pre;" bind:innerHTML={commandText} contenteditable="true" autocorrect="off" autocapitalize="off" spellcheck="false">
			{commandText}
		</div>
	</div>	
	<div id="vid" class="ms-auto" style="width:{ifWidth}px; height:{ifHeight}px;">
		<div class="ratio ratio-16x9">

			<ContextMenu bind:isOpen bind:portal={overlay}>
				<div bind:this={overlay} id="overlay" />
			</ContextMenu>
			<Tangle bind:this={selector} bind:stageWidth={ifWidth} bind:stageHeight={ifHeight} bind:tangle on:finishdrawing={getData} on:doubleclick={doubleClick} />
			<iframe
			title="da cameras"
			id="cams"
			class="http://merger:Merger!23@74.208.238.87:8889/ptz-alv?controls=0"
			src="https://player.twitch.tv/?channel=alveussanctuary&parent=nlocalhost"
			allow="autoplay; fullscreen"
			allowfullscreen
			></iframe>
		</div>
	</div>
</div>

<style>

	[contenteditable="true"]:focus {
		outline: none;
	}
	.command {
		font-family: "consolas", sans-serif;
		font-weight: 600;
	} 
	#command {
		color: rgb(204, 212, 219);
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