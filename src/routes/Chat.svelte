<script lang="ts">
	import { onMount } from 'svelte';
	import * as Tabs from "$lib/components/ui/tabs/index.js";
	import { commandHeight } from '$lib/stores';
	import { portal } from "svelte-portal";
	import _ from 'lodash';

	let headerHeight: number;
	let bodyHeight: number;

	let embedHeight: number;
	let marginTop: number;
	function resizeEmbedRaw() {
		let baseHeight = bodyHeight - headerHeight;
		embedHeight = 1.5 * baseHeight;
		marginTop = embedHeight - baseHeight;
	}
	var resizeEmbedThrottled = _.throttle(resizeEmbedRaw, 50, { 'leading': true, 'trailing': true });
	var resizeEmbedDebounced = _.debounce(resizeEmbedRaw, 50, { 'leading': false, 'trailing': true })

	function resizeEmbed() {
		resizeEmbedThrottled();
		resizeEmbedDebounced();
	}

	let myOffcanvas: HTMLElement;
	onMount(() => {
		resizeEmbedRaw();
		myOffcanvas.addEventListener('show.bs.offcanvas', (event: any) => {
			resizeEmbedRaw();
		});
		myOffcanvas.addEventListener('hidden.bs.offcanvas', (event: any) => {
			resizeEmbedRaw();
		});
		window.addEventListener('resize', resizeEmbed);
		return () => {
			window.removeEventListener('resize', resizeEmbed);
		};
	});
</script>


<button use:portal={"#vid2"} id="chat" class="btn btn-outline-secondary fixed z-50 movedown" style="top: {$commandHeight}px" type="button" data-bs-toggle="offcanvas" data-bs-target="#offcanvas" aria-controls="offcanvas">
Chat
</button>

<div bind:this={myOffcanvas} class="offcanvas offcanvas-end xl:!w-1/4 sm:!w-1/3" tabindex="-1" id="offcanvas" data-bs-keyboard="false" aria-labelledby="offcanvasExampleLabel">
	<Tabs.Root value="agg" class="w-100 h-100">
		<div class="offcanvas-header p-2 pb-1" bind:clientHeight={headerHeight}>
			<Tabs.List class="grid w-full grid-cols-2 w-100 ms-.5 me-0">
				<Tabs.Trigger value="alveus">Alveus</Tabs.Trigger>
				<Tabs.Trigger value="agg">AGG</Tabs.Trigger>
			</Tabs.List>
			<button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
		</div>
		<div class="offcanvas-body h-100 w-100 p-0 " bind:clientHeight={bodyHeight}>
			<Tabs.Content value="alveus" class="h-100 m-0" >
				<iframe src="https://www.twitch.tv/embed/alveussanctuary/chat?darkpopout&parent=alvsanc-cams.app&parent=www.alvsanc-cams.app&parent=alvsanc-cams.dev&parent=www.alvsanc-cams.dev&parent=localhost"
				title="chat"
				class="w-100 px-2 pb-1"
				style="height: {embedHeight}px; margin-top: -{marginTop}px;"
				/>
			</Tabs.Content>
			<Tabs.Content value="agg" class="h-100 m-0" >
				<iframe src="https://www.twitch.tv/embed/alveusgg/chat?darkpopout&parent=alvsanc-cams.app&parent=www.alvsanc-cams.app&parent=alvsanc-cams.dev&parent=www.alvsanc-cams.dev&parent=localhost"
				title="chat"
				class="w-100 px-2 pb-1"
				style="height: {embedHeight}px; margin-top: -{marginTop}px;"
				/>
			</Tabs.Content>
		</div>
	</Tabs.Root>
</div>


<style>
	#chat {
		left: 100%; 
		transform: translate(-105%, 15%); 
		height: 10%; 
		width: 9%; 
	}
</style>