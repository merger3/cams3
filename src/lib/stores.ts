import { writable } from 'svelte/store';
import axios, { Axios, type AxiosInstance } from 'axios';
import type { CamRequest } from '$types';
export let user = writable<string>();
export let token = writable<string>();
export let server = writable<AxiosInstance>();

export function GetCam(r: CamRequest): string {


    return ""
}