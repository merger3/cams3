<script lang="ts">
	import * as Drawer from "$lib/components/ui/drawer/index.js";
	import * as Tabs from "$lib/components/ui/tabs/index.js";
	import { createEventDispatcher, onMount } from 'svelte';
	import type { Entry, SwapResponse } from '$types';
	const dispatch = createEventDispatcher();

	export let ifHeight: number;

  </script>
   
   <!-- let swaps: SwapResponse = {found: false, cam: "", position: 0, swaps: null} -->


   <button class="btn btn-outline-primary z-50 fixed right-0 transform -translate-y-1/2" style="bottom: {ifHeight - (ifHeight / 15)}px" type="button" data-bs-toggle="offcanvas" data-bs-target="#offcanvasExample" aria-controls="offcanvasExample">
	Button with data-bs-target
  </button>
<!-- <Chat bind:ifHeight /> -->

<div class="offcanvas offcanvas-end" tabindex="-1" id="offcanvasExample" aria-labelledby="offcanvasExampleLabel">
	<Tabs.Root value="both" class="w-100 h-100">
	<div class="offcanvas-header p-2">
	 
		<button type="button" class="btn-close m-0 me-auto " data-bs-dismiss="offcanvas" aria-label="Close"></button>
		<Tabs.List class="grid w-full grid-cols-3 w-100 ms-1 me-0">
			<Tabs.Trigger value="both">Chat</Tabs.Trigger>
			<Tabs.Trigger value="alveus">Alveus</Tabs.Trigger>
			<Tabs.Trigger value="agg">AGG</Tabs.Trigger>
		</Tabs.List>
	</div>
	<div class="offcanvas-body h-100 p-0">
			<Tabs.Content value="alveus" class="h-100 m-0">
				<iframe src="https://www.twitch.tv/embed/alveussanctuary/chat?darkpopout&parent=localhost&parent=alvsanc-cams.app&parent=www.alvsanc-cams.app"
				title="chat"
				class="ml-auto"
				height=94%
				width=95%
				/>
			</Tabs.Content>
			<Tabs.Content value="agg" class="h-100 m-0">
				<iframe src="https://www.twitch.tv/embed/alveusgg/chat?darkpopout&parent=localhost&parent=alvsanc-cams.app&parent=www.alvsanc-cams.app"
				title="chat"
				class="ml-auto"
				height=94%
				width=95%
				/>
				
			</Tabs.Content>
			<Tabs.Content value="both" class="h-100 m-0">
				<iframe src="https://www.twitch.tv/embed/alveusgg/chat?darkpopout&parent=localhost&parent=alvsanc-cams.app&parent=www.alvsanc-cams.app"
				title="chat"
				class="ml-auto"
				height=47%
				width=95%
				/>
				<iframe src="https://www.twitch.tv/embed/alveussanctuary/chat?darkpopout&parent=localhost&parent=alvsanc-cams.app&parent=www.alvsanc-cams.app"
				title="chat"
				class="ml-auto"
				height=47%
				width=95%
				/>
			</Tabs.Content>
		</div>
	</Tabs.Root>
  </div>
