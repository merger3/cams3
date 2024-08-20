<script lang="ts">
	import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();
	
	let showBookmarks = false;
	let showFullURLs = true;
	
	let value = "pedro";
	
	export let isRendered: boolean;
	export let isOpen: boolean;

	export let test: string = "Default value"

	function opc(open: boolean) {
		if (open) {
			dispatch("openmenu");
		} else {
			dispatch("closemenu");
		}
	}
  </script>
   
  <ContextMenu.Root bind:open={isOpen} onOpenChange={opc}>
	<ContextMenu.Trigger>
		<slot></slot>
	</ContextMenu.Trigger>
	{#if isRendered}
	<ContextMenu.Content class="w-64 dark:bg-slate-800">
	  <ContextMenu.Item class="dark:bg-slate-800" inset>
		{test}
		<ContextMenu.Shortcut>⌘[</ContextMenu.Shortcut>
	  </ContextMenu.Item>
	  <ContextMenu.Item inset>
		Forward
		<ContextMenu.Shortcut>⌘]</ContextMenu.Shortcut>
	  </ContextMenu.Item>
	  <ContextMenu.Item inset>
		Reload
		<ContextMenu.Shortcut>⌘R</ContextMenu.Shortcut>
	  </ContextMenu.Item>
	  <ContextMenu.Sub>
		<ContextMenu.SubTrigger inset>More Tools</ContextMenu.SubTrigger>
		<ContextMenu.SubContent class="w-48">
		  <ContextMenu.Item>
			Save Page As...
			<ContextMenu.Shortcut>⇧⌘S</ContextMenu.Shortcut>
		  </ContextMenu.Item>
		  <ContextMenu.Item>Create Shortcut...</ContextMenu.Item>
		  <ContextMenu.Item>Name Window...</ContextMenu.Item>
		  <ContextMenu.Separator />
		  <ContextMenu.Item>Developer Tools</ContextMenu.Item>
		</ContextMenu.SubContent>
	  </ContextMenu.Sub>
	  <ContextMenu.Separator />
	  <ContextMenu.CheckboxItem bind:checked={showBookmarks}>
		Show Bookmarks Bar
		<ContextMenu.Shortcut>⌘⇧B</ContextMenu.Shortcut>
	  </ContextMenu.CheckboxItem>
	  <ContextMenu.CheckboxItem bind:checked={showFullURLs}>
		Show Full URLs
	  </ContextMenu.CheckboxItem>
	  <ContextMenu.Separator />
	  <ContextMenu.RadioGroup bind:value>
		<ContextMenu.Label inset>People</ContextMenu.Label>
		<ContextMenu.Separator />
		<ContextMenu.RadioItem value="pedro">Pedro Duarte</ContextMenu.RadioItem>
		<ContextMenu.RadioItem value="colm">Colm Tuite</ContextMenu.RadioItem>
	</ContextMenu.RadioGroup>
</ContextMenu.Content>
{/if}
</ContextMenu.Root>
