<script lang="ts">
	import App from '../App.svelte';
	let twitch = 1;
</script>


<main class="bg-dark">
	<App bind:videosource={twitch} />
</main>