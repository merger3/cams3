<script context="module" lang="ts">
   export type Rectangle = {
    x: number;
    y: number;
    width: number;
    height: number;
    frameWidth: number;
    frameHeight: number
    };
    export type RectangleStyle = {
        border: string;
        backgroundColor: string;
    };
</script>

<script lang="ts">
    import { Button, Col, Row, Container } from '@sveltestrap/sveltestrap';
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

        render = isDragging()

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
        const rect = container.getBoundingClientRect();
        const rectangle = {
            x: Math.min(startX, currentX),
            y: Math.min(startY, currentY),
            width: Math.abs(currentX - startX),
            height: Math.abs(currentY - startY),
            frameWidth: rect.width,
            frameHeight: rect.height
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
    
    <div bind:this={container} class="ratio ratio-16x9" style="position: relative;">
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
            >
                <div class="dot"></div>
            </div>
        {/if}
    </div>
    
    <style>
        .rectangle {
            position: absolute;
            pointer-events: none;
        }
        .dot {
            width: 5px;
            height: 5px;
            background-color: black;
            border-radius: 50%;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }
    </style>
    