<script lang="ts">

	import { onMount, createEventDispatcher } from 'svelte';
	import 'simplebar'; // or "import SimpleBar from 'simplebar';" if you want to use it manually.
	import 'simplebar/dist/simplebar.css';
	import type { CamList, CamPresets } from '$types';
	import axios from 'axios';

	import ResizeObserver from 'resize-observer-polyfill';
	
	export let camList: CamList[];

	export let commandHeight: number;

	export let spacerHeight: number;
	export let spacerWidth: number;

	export let camPresets: CamPresets;

	const cars = ["Saab", "Volvo", "BMW", "Hondaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "Toyota", "Nissan", "Ford", "Chevy", "GM", "Kia", "Hyundai", "Cadillac", "Lincoln", "Mini", "Audi", "Lexus", "Acura", "Porsche"];

	function getConfig(cam: string) {
		axios.post("/getConfig", {
			camera: cam
		}).then(function (response) {
			camPresets = response.data.camPresets;
			console.log(response);
		}).catch(function (error) {
			console.log(error);
		});
	}

	onMount(() => {
		window.ResizeObserver = ResizeObserver;
	});
</script>

<div class="dropdown z-40 movedown">
	<button style="position: absolute;min-height: {commandHeight}px;max-height: {commandHeight}px;right: 0;top: 0;" id="dropdown-button" class="btn btn-outline-primary dropdown-toggle w-100 p-0 m-0" type="button" data-bs-toggle="dropdown" aria-expanded="false">
		Dropdown button
	</button>
	<div id="dropdown-menu" class="dropdown-menu w-100 text-center px-2 border border-2 border-danger-subtle shadow " style="max-height: {spacerHeight - 5}px; max-width: {spacerWidth}px;" data-simplebar>
		{#each camList as cam, i}
			{#each cam.cameras as c}
				<button type="button" on:click={() => getConfig(c)} class="btn btn-secondary btn-sm d-block w-100 mb-2 overflow-hidden">{c}</button>
			{/each}
			{#if i != camList.length - 1}
				<hr class="dropdown-divider">
			{/if}
		{/each}
	</div>
</div>


<style>
	#dropdown-menu {
		background-color: coral;
		/* background: transparent; */
		margin-top: -2px!important;
		overflow: scroll;
		-ms-overflow-style: none;  /* IE and Edge */
		scrollbar-width: none; /* Firefox */
		/* padding: 0 8px; Add equal padding on the left and right */
	}
	#dropdown-menu::-webkit-scrollbar { /* Chrome */
		display: none;
	}
	#dropdown-menu button:last-child {
   	 	margin-bottom: 0!important;
	}
	#dropdown-menu .dropdown-divider {
		border-top-width: 3px; /* Adjust this value for the desired thickness */
		border-color: rgba(70, 63, 63, 0.4); 
		/* background-color: #000; /* Optional: Change the color if needed 
		margin: 0.5rem 0; Optional: Adjust the vertical spacing */
	}
</style>