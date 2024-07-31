<script lang="ts">
	import {type Rectangle, type RectangleStyle } from  "./RectangleSelector.svelte";
    import RectangleSelector from "./RectangleSelector.svelte";
    

    let drawn = false
let rectangle: Rectangle | undefined;
	const rectangleStyle: RectangleStyle = {
		border: '2px solid red',
		backgroundColor: 'rgba(255, 0, 0, 0.5)',
	};

 function updateRectangle(newRectangle: Rectangle) {
		rectangle = newRectangle;
 }
</script>


<RectangleSelector onUpdateRectangle={updateRectangle} rectangleStyle={rectangleStyle} drawn={drawn}>
   <div class="rectangle-display">
    <br>
    <br>
    <br>
    <br>
    <br>
    <br>
    <br>
    <br>
    <br>
    <br>
    <br>
    <br>
    <br>
    <br>
    <br>
    <br>
    <br>
    <br>    
    </div>
</RectangleSelector>

<section>
<h3>Rectangle Data:</h3>
{#if rectangle}
    <ul>
    <li>Position X: {rectangle.x}px</li>
    <li>Position Y: {rectangle.y}px</li>
    <li>Width: {rectangle.width}px</li>
    <li>Height: {rectangle.height}px</li>
    </ul>
{/if}
</section>