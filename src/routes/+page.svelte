<script lang="ts">
	  import App from './App.svelte';
      import type { Config } from '$types';

    let config: Config = {
        camlist: [
            {
                name: "pasture",
                cameras: ["pasture"]
            },
            {
                name: "crows",
                cameras: [
                    "crowout",
                    "crowin",
                    "crowmulti",
                    "crowmulti2"
                ]
            },
            {
                name: "wolves",
                cameras: [
                    "wolf",
                    "wolfcorner",
                    "wolfinside",
                    "wolfden",
                    "wolfden2",
                    "wolfmulti",
                    "wolfmulti2",
                    "wolfdenmulti",
                    "wolfdenmulti2"
                ]
            }
        ]
    };
  </script>
  


  <main class="bg-dark">
	  <App bind:config />
  </main>