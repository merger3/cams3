<script lang="ts">
    import { Stage, Layer, Rect, Transformer } from "svelte-konva";
    import Konva from "konva";
	import { onMount } from 'svelte';

    const rectangles = [
        {
            rotation: 0,
            x: 10,
            y: 10,
            width: 100,
            height: 100,
            scaleX: 1,
            scaleY: 1,
            fill: "red",
            name: "rect1",
            draggable: true,
        },
        {
            rotation: 0,
            x: 150,
            y: 150,
            width: 100,
            height: 100,
            scaleX: 1,
            scaleY: 1,
            fill: "green",
            name: "rect2",
            draggable: true,
        },
    ];

    let transformer: any;
    let selectedShapeName = "";

    function handleStageMouseDown(e: any) {
        const konvaEvent = e.detail;
        // clicked on stage - clear selection
        if (konvaEvent.target === konvaEvent.target.getStage()) {
            selectedShapeName = "";
            updateTransformer();
            return;
        }

        // clicked on transformer - do nothing
        const clickedOnTransformer =
            konvaEvent.target.getParent().className === "Transformer";
        if (clickedOnTransformer) {
            return;
        }

        // find clicked rect by its name
        const name = konvaEvent.target.name();
        const rect = rectangles.find((r) => r.name === name);
        if (rect) {
            selectedShapeName = name;
        } else {
            selectedShapeName = "";
        }

        updateTransformer();
    }

    function handleTransformEnd() {
        // find element in our state
        const rect = rectangles.find((r) => r.name === selectedShapeName);
        if (rect) {
            rect.fill = Konva.Util.getRandomColor();
        }
        // change fill
    }

    $: anchorSize = Math.max(Math.min((transformer?.width() / 4), 20), 6.5)

    function updateTransformer() {
        if (!transformer) return;

        // here we need to manually attach or detach Transformer node
        const stage = transformer.getStage();

        const selectedNode = stage.findOne("." + selectedShapeName);

        // do nothing if selected node is already attached
        console.log(transformer.width())
        if (selectedNode === transformer.node()) {
            return;
        }

        if (selectedNode) {
            // attach to another node
            transformer.nodes([selectedNode]);
        } else {
            // remove transformer
            transformer.nodes([]);
        }

        // transformer.anchorSize(Math.max(Math.min((transformer.width() / 4), 20), 6.5))
    }

    let innerHeight: number;
    let innerWidth: number;

    onMount(() => {
		innerHeight = window.innerHeight;
        innerWidth = window.innerWidth;
    });
    let num = false
</script>

<Stage
    config={{ width: innerWidth, height: innerHeight }}
    on:mousedown={handleStageMouseDown}
    on:touchstart={handleStageMouseDown}
>
    <Layer>
        {#each rectangles as rectangle}
            <Rect config={rectangle} on:transformend={handleTransformEnd} />
        {/each}
        <Transformer bind:handle={transformer} config={{
            keepRatio: false,
            anchorSize: anchorSize,
            rotateEnabled: false,
            anchorStyleFunc: function (anchor) {
                anchor.fill('rgba(138, 219, 207, .5)');
                anchor.cornerRadius(anchor.width() / 2);
            }}} />
    </Layer>
</Stage>
