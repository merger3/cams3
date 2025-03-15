import { io } from "socket.io-client";
import { get } from 'svelte/store';
import { camLayout } from '$lib/stores';
import { type AxiosInstance } from 'axios';


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
		camLayout.set(message.data.fullArgs.replaceAll("fullcam", "").split(' '));
		console.log(get(camLayout));
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