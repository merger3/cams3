<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import type { Entry, SwapResponse } from '$types';
	const dispatch = createEventDispatcher();

	// let path = "http://localhost:5173";
	// let path = "https://alvsanc-cams.dev";
	let path = "https://alvsanc-cams.app";

	let lolaLink = `https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=s4ouxddi9skb11jriwyzl0ronh1m92&redirect_uri=${path}/lola&scope=user%3Aread%3Achat%20user%3Awrite%3Achat%20user%3Aread%3Awhispers%20user%3Amanage%3Awhispers%20chat%3Aedit%20chat%3Aread`
	let twitchLink = `https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=s4ouxddi9skb11jriwyzl0ronh1m92&redirect_uri=${path}/twitch&scope=user%3Aread%3Achat%20user%3Awrite%3Achat%20user%3Aread%3Awhispers%20user%3Amanage%3Awhispers%20chat%3Aedit%20chat%3Aread`
</script>

<div class="hstack gap-3 center">
	<button class="btn btn-outline-primary btn-lg">
		<a href={lolaLink}> Log in to <br> Lola </a>
	</button>
	<button class="btn btn-outline-twitch btn-lg">
		<a href={twitchLink}> Log in to <br> Twitch </a>
	</button>
</div>

<style>
    .center {
      margin: 0;
      position: absolute;
      top: 50%;
      left: 50%;
      -ms-transform: translate(-50%, -50%);
      transform: translate(-50%, -50%);
    }
</style>