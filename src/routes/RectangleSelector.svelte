<script context="module" lang="ts">
   export type Rectangle = {
    x: number;
    y: number;
    width: number;
    height: number;
    };
    export type RectangleStyle = {
        border: string;
        backgroundColor: string;
    };
</script>

<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    export let onUpdateRectangle;
    export let rectangleStyle;
 

    let drawing = false;
    export let drawn = false;
    let render = false;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let container: any;

    function isDragging() {
        let a = startX - currentX;
        let b = startY - currentY;
        if (Math.hypot(a,b) < 5) {
            return false;
        } 
        return true;
    }

    const startDrawing = (event: MouseEvent) => {
        const { clientX, clientY } = event;
        if (!container)
            return;
        drawing = true;
        drawn = false;
        render = false;
        const rect = container.getBoundingClientRect();
        startX = clientX - rect.left;
        startY = clientY - rect.top;
        currentX = startX;
        currentY = startY;
    };
    const drawRectangle = (event: MouseEvent) => {
        const { clientX, clientY } = event;
        if ((!drawing || !container) && drawn)
            return;
        if (!isDragging()) {
            render = false;
        } else {
            render = true;
        }
        const rect = container.getBoundingClientRect();
        currentX = clientX - rect.left;
        currentY = clientY - rect.top;
    };
    const endDrawing = () => {
        if (!drawing)
            return;
        drawing = false;
        if (!isDragging()) {
            drawn = false;
            render = false;
        } else {
            drawn = true;
        }
        const rectangle = {
            x: Math.min(startX, currentX),
            y: Math.min(startY, currentY),
            width: Math.abs(currentX - startX),
            height: Math.abs(currentY - startY)
        };
        onUpdateRectangle(rectangle);
    };
    onMount(() => {
        if (container) {
            container.addEventListener('mousedown', startDrawing);
            container.addEventListener('mousemove', drawRectangle);
            container.addEventListener('mouseup', endDrawing);
        }
    });
    onDestroy(() => {
        if (container) {
            container.removeEventListener('mousedown', startDrawing);
            container.removeEventListener('mousemove', drawRectangle);
            container.removeEventListener('mouseup', endDrawing);
        }
    });
    </script>
    
    <div bind:this={container} style="position: relative;">
        <slot></slot>
        {#if (drawing || drawn) && render}
            <div
                class="rectangle"
                style="left: {Math.min(startX, currentX)}px; top: {Math.min(
                    startY,
                    currentY
                )}px; width: {Math.abs(currentX - startX)}px; height: {Math.abs(
                    currentY - startY
                )}px; border: {rectangleStyle.border}; background-color: {rectangleStyle.backgroundColor};"
            ></div>
        {/if}
    </div>
    
    <style>
        .rectangle {
            position: absolute;
            pointer-events: none;
        }
    </style>
    