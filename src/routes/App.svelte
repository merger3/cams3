<script lang="ts">
  import svelteLogo from './assets/svelte.svg'
  import viteLogo from '/vite.svg'
  import Counter from './Counter.svelte'
  import Video from './Video.svelte';
  import Tangle from './Tangle2.svelte';

  import axios from 'axios';
	let footprintjs
	async function getData() {
    try {
			const res = await axios.get(`127.0.0.1:1323/hello`, {
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
