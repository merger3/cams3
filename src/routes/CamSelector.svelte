<script lang="ts">
	import {
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownToggle
  } from '@sveltestrap/sveltestrap';

</script>

<div class="dropdown">
  <button id="dropdown" class="btn btn-outline-primary dropdown-toggle w-100 p-0 m-0" type="button" data-bs-toggle="dropdown" aria-expanded="false">
    Dropdown button
  </button>
	<!-- svelte-ignore a11y-invalid-attribute -->
  <ul class="dropdown-menu">
    <li><a class="dropdown-item" href="#">Action</a></li>
    <li><a class="dropdown-item" href="#">Another action</a></li>
    <li><a class="dropdown-item" href="#">Something else here</a></li>
  </ul>
</div>

<style>
	/* #dropdown {
		font-size: 3.5vh;
	} */
</style>