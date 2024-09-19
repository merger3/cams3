<script lang="ts">
	import * as Drawer from "$lib/components/ui/drawer/index.js";
	import * as Tabs from "$lib/components/ui/tabs/index.js";
	import { createEventDispatcher, onMount } from 'svelte';
	import type { Entry, SwapResponse } from '$types';
	const dispatch = createEventDispatcher();

	export let ifHeight: number;
  </script>
   
   <!-- let swaps: SwapResponse = {found: false, cam: "", position: 0, swaps: null} -->


   <Drawer.Root direction="right">
	<Drawer.Trigger class="z-50 fixed right-0 transform -translate-y-1/2" style="bottom: {ifHeight - (ifHeight / 15)}px">Open</Drawer.Trigger>
	<Drawer.Content>
	  
		<!-- <Drawer.Title>Are you sure absolutely sure?</Drawer.Title> -->
	  <Tabs.Root value="both" class="w-100 h-100">
		<Drawer.Header class="p-2">
			<Tabs.List class="grid w-full grid-cols-3 w-75">
				<Tabs.Trigger value="both">Chat</Tabs.Trigger>
				<Tabs.Trigger value="alveus">Alveus</Tabs.Trigger>
				<Tabs.Trigger value="agg">AGG</Tabs.Trigger>
			</Tabs.List>
		</Drawer.Header>
		<Tabs.Content value="alveus" class="h-100 m-0">
			<iframe src="https://www.twitch.tv/embed/alveussanctuary/chat?darkpopout&parent=localhost&parent=alvsanc-cams.app:8443"
			title="chat"
			class="ml-auto"
			height=100%
			width=95%
			/>
		</Tabs.Content>
		<Tabs.Content value="agg" class="h-100 m-0">
			<iframe src="https://www.twitch.tv/embed/alveusgg/chat?darkpopout&parent=localhost&parent=alvsanc-cams.app:8443"
			title="chat"
			class="ml-auto"
			height=100%
			width=95%
			/>
			
		</Tabs.Content>
		<Tabs.Content value="both" class="h-100 m-0">
			<iframe src="https://www.twitch.tv/embed/alveusgg/chat?darkpopout&parent=localhost&parent=alvsanc-cams.app:8443"
			title="chat"
			class="ml-auto"
			height=50%
			width=95%
			/>
			<iframe src="https://www.twitch.tv/embed/alveussanctuary/chat?darkpopout&parent=localhost&parent=alvsanc-cams.app:8443"
			title="chat"
			class="ml-auto"
			height=50%
			width=95%
			/>
		</Tabs.Content>
	  </Tabs.Root>

		
	  <Drawer.Footer>
		<Drawer.Close>Cancel</Drawer.Close>
	  </Drawer.Footer>
	</Drawer.Content>
  </Drawer.Root>

  