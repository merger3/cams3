import { writable } from 'svelte/store';
import axios, { Axios, type AxiosInstance } from 'axios';
import type { CamRequest } from '$types';
export let user = writable<string>();
export let token = writable<string>();
export let server = writable<AxiosInstance>();

export async function GetCam(r: CamRequest, a: AxiosInstance): Promise<string> {
	let response = await a.post("/camera", {x: r.coordinates.x, y: r.coordinates.y, width: 0, height: 0, frameWidth: r.frameWidth, frameHeight: r.frameHeight, position: Number(r.position)});
	if (response.status == 404) {
		console.log("Could not get camera");
	}
	return response.data.cam as string;
}