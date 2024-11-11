<script lang="ts">
	import App from '../App.svelte';
	let lola = 0;
</script>


<main class="bg-dark">
	<App bind:videosource={lola} />
</main>