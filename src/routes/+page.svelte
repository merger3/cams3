<script lang="ts">
	  import App from './App.svelte';
      import type { Config } from '$types';

    let config: Config = {
        camlist: []
    };
  </script>
  


  <main class="bg-dark">
	  <App bind:config />
  </main>