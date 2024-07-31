<script lang="ts">
	import Counter from './Counter.svelte'
	  import Video from './Video.svelte';
	import Tangle from './Tangle.svelte';
	import axios from 'axios';
	let footprintjs
	async function getData() {
    try {
			const res = await axios.get(`/hello`, {
				headers: {},
				params: {},
			});
      console.log(res.data)
		} catch (err) {
			console.log(err);
		}
	}
  </script>
  
  <main>
	<div>
	  <button on:click={getData}>Get Data</button>
	</div>
	<Video />
  
	
  </main>
  
  