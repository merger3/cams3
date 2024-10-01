<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import type { Entry, SwapResponse } from '$types';
	const dispatch = createEventDispatcher();

    let link = "https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=s4ouxddi9skb11jriwyzl0ronh1m92&redirect_uri=http://localhost:1323/&scope=user%3Aread%3Achat%20user%3Awrite%3Achat%20user%3Aread%3Awhispers%20user%3Amanage%3Awhispers%20chat%3Aedit%20chat%3Aread"
</script>

<div>
    <button class="btn btn-outline-primary center">    
        <a href={link}> Log in </a>
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