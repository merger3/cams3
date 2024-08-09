<script lang="ts">
	import {
	Dropdown,
	DropdownItem,
	DropdownMenu,
	DropdownToggle
	} from '@sveltestrap/sveltestrap';

	export let spacerHeight: number;
</script>

<div class="dropdown">
	<button id="dropdown" class="btn btn-outline-primary dropdown-toggle w-100 p-0 m-0" type="button" data-bs-toggle="dropdown" aria-expanded="false">
		Dropdown button
	</button>
	<!-- svelte-ignore a11y-invalid-attribute -->
	<div id="dropdown-menu" class="dropdown-menu w-100" style="height: {spacerHeight - 1}px;">
		<div>item 1</div>
		<div>item 2</div>
		<div>item 3</div>
	</div>
</div>

<style>
	#dropdown-menu {
		background-color: coral;
		margin-top: -2px!important;
		overflow: scroll;
		-ms-overflow-style: none;  /* IE and Edge */
  		/* scrollbar-width: none; */
	}
	#dropdown-menu::-webkit-scrollbar {
		display: none;
	}
</style>