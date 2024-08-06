<script lang="ts">
    import { Stage, Layer, Transformer } from "svelte-konva";
    import Konva from "konva";

    export let stageWidth;
    export let stageHeight;
    export let tangle: Konva.Rect;

    let dot: Konva.Circle;

    let transformer: Konva.Transformer;
    let stage: Konva.Stage;
    var layer: Konva.Layer = new Konva.Layer();

    
    let startX = 0;
    let startY = 0;

    function handleStageMouseDown(e: any) {
        const konvaEvent = e.detail;
        // clicked on stage - clear selection
        if (konvaEvent.target === konvaEvent.target.getStage()) {
            transformer.nodes([]);

            let mousePos = stage.getPointerPosition();

            if (mousePos) {
                startX = mousePos.x;
                startY = mousePos.y;
            }
            
            tangle?.destroy();
            dot?.destroy();
            tangle = new Konva.Rect({
                x: startX,
                y: startY,
                width: 0,
                height: 0,
                fill: 'rgba(245, 106, 106, 0.35)',
                stroke: 'red',
                strokeWidth: 2,
                strokeScaleEnabled: false,
                draggable: true
            });
            dot = new Konva.Circle({
                x: (tangle.x() + (tangle.width() / 2)),
                y: (tangle.y() + (tangle.height() / 2)),
                radius: 3,
                strokeScaleEnabled: false,
                fill: 'black'
            });

            layer.add(tangle);
            layer.add(dot)

            stage.on("pointermove", drawRectangle)
            stage.on("pointerup", endDrawing)
            return;
        }

        const clickedOnTransformer =
            konvaEvent.target.getParent().className === "Transformer";
        if (clickedOnTransformer) {
            return;
        }
    }


    function drawRectangle(event: any) {
        // event.preventDefault();
        // event.stopPropagation();
        let mousePos = stage.getPointerPosition();
        
        if (mousePos) {
            tangle.size({
                width: (mousePos.x - tangle.x()),
                height: (mousePos.y - tangle.y())
            });
            dot.position({
                x: (tangle.x() + (tangle.width() / 2)),
                y: (tangle.y() + (tangle.height() / 2)),
            })
        }
     };

    function endDrawing(event: any) {
        transformer.nodes([tangle]);
        stage.off('pointermove');
        stage.off('pointerup');
    };

    function handleTransformEnd() {
        // find element in our state
        tangle.strokeWidth(2);
    }
    // anchorSize = Math.max(Math.min((transformer?.width() / 4), 20), 6.5)
    // rect1.on('transform', () => {
    //     rect1.setAttrs({
    //       width: Math.max(rect1.width() * rect1.scaleX(), 5),
    //       height: Math.max(rect1.height() * rect1.scaleY(), 5),
    //       scaleX: 1,
    //       scaleY: 1,
    //     });
</script>

<Stage
    bind:handle={stage}
    config={{
        container: 'overlay',
        x: 0, 
        y: 0,
        width: stageWidth,
        height: stageHeight
    }}
    on:mousedown={handleStageMouseDown}
    on:touchstart={handleStageMouseDown}
>
    <Layer bind:handle={layer}>
        <Transformer bind:handle={transformer} on:transformend={handleTransformEnd} config={{
            keepRatio: false,
            anchorSize: 20,
            rotateEnabled: false,
            borderEnabled: false,
            ignoreStroke: true,
            shouldOverdrawWholeArea: true,
            anchorStyleFunc: function (anchor) {
                anchor.fill('rgba(138, 219, 207, .5)');
                anchor.cornerRadius(anchor.width() / 2);
            }}} />
    </Layer>
</Stage>
