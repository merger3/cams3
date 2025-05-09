import { io } from "socket.io-client";
import { get } from 'svelte/store';
import { camLayout, am, stage } from '$lib/stores';
import { RemoveSelection, Selector, AddSelection, GetSelectedRect } from '$lib/zones';
import { type AxiosInstance } from 'axios';
import type Konva from "konva";


export function watchLayout(server: AxiosInstance) {
	const socket = io("https://alvsanc-cams.app/", { 
        transports: ['websocket'],
        reconnection: true // Optional: ensures it reconnects if disconnected
    });

    socket.on("connect", () => {
        console.log("Connected with ID:", socket.id);
    });

    socket.on('message', (message) => {
        // console.log('Message received:', message);

		// camLayout.set(["wolf", "pasture", "wolfmulti", "wolfmulti2", "wolfmulti5", "crowin"]);
		camLayout.set(message.data.fullArgs.replaceAll("fullcam", "").split(' '));
		console.log(get(camLayout));

		let z = GetSelectedRect(Selector.Presets);
		console.log(z);
		if (z) {
			get(am).Actions["click"].Enable({x: z.x() + (z.width() / 2), y: z.y() + (z.height() / 2)})
			const pointerUpEvent = new PointerEvent('pointerup', {bubbles: true, cancelable: true, clientX: z.x() + (z.width() / 2), clientY: z.y() + (z.height() / 2), button: 2, buttons: 2, pointerId: 1, pointerType: 'mouse', isPrimary: true});
			jQuery((get(stage).findOne('#mainlayer') as Konva.Layer).getCanvas()._canvas)[0].dispatchEvent(pointerUpEvent);	
		}
    });

    socket.on('disconnect', (reason) => {
        console.log('Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
        console.error('Connection error:', error.message);
    });

	server.get('/layout').then(function (response) {
		console.log(response)
		camLayout.set(response.data)
	}).catch(function (error) {
		console.log(error);
	});
	console.log(get(camLayout));
}