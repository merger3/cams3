<script lang="ts">
	import { Drawer as DrawerPrimitive } from "vaul-svelte";
	import DrawerOverlay from "./drawer-overlay.svelte";
	import { cn } from "$lib/utils.js";

	type $$Props = DrawerPrimitive.ContentProps;

	let className: $$Props["class"] = undefined;
	export { className as class };
</script>

<DrawerPrimitive.Portal>
	<DrawerOverlay />
	<DrawerPrimitive.Content
		class={cn(
			"bg-background fixed inset-y-0 right-0 z-50 flex w-[20vw] h-full flex-col border-l rounded-l-[10px]",
			className
		)}
		{...$$restProps}
	>
		<!-- <div class="bg-muted my-auto ml-4 h-[1000px] w-2 rounded-full"></div> -->
		<slot />
	</DrawerPrimitive.Content>
</DrawerPrimitive.Portal>
