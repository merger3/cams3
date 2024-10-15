import { writable } from 'svelte/store';
import axios, { Axios, type AxiosInstance } from 'axios';
import type { CamRequest, CamResponse, Coordinates } from '$types';
import {type PanzoomObject} from '@panzoom/panzoom'
import { pinch, press, composedGesture, type PressCustomEvent, pan, type PinchCustomEvent , type GestureCustomEvent, type RegisterGestureType, type GestureCallback, type BaseParams, type GestureReturnType} from 'svelte-gestures';
import { setPointerControls, getCenterOfTwoPoints } from 'svelte-gestures';


export let token = writable<string>();
export let server = writable<AxiosInstance>();
export let drawing = writable<boolean>();
export let panzoom = writable<PanzoomObject>();


export async function GetCam(r: CamRequest, a: AxiosInstance): Promise<CamResponse> {
	let response = await a.post("/camera", {x: r.coordinates.x, y: r.coordinates.y, width: 0, height: 0, frameWidth: r.frameWidth, frameHeight: r.frameHeight, position: Number(r.position)});
	if (response.status == 404) {
		console.log("Could not get camera");
	}
	return response.data;
}

function getPointersDistance(activeEvents: PointerEvent[]) {
	return Math.hypot(
		activeEvents[0].clientX - activeEvents[1].clientX,
		activeEvents[0].clientY - activeEvents[1].clientY
	);
}

export function multiTouch(node: HTMLElement, params: BaseParams = {composed: false, touchAction: "none"}) {
	const gestureName = 'multiTouch';
	const touchCount = 2;
	let origin: Coordinates;
	let initDistance = 0;
	let prevDistance: number | undefined;
	let scale = 1;
	let prevScale = 1;

	function onUp(activeEvents: PointerEvent[], event: PointerEvent) {
		if (activeEvents.length === 1) {
			prevDistance = undefined;
		}
		node.dispatchEvent(
			new CustomEvent(`${gestureName}Up`, {
				detail: { target: event.target },
			})
		);	
	}
	
		

	function onDown(activeEvents: PointerEvent[], event: PointerEvent) {
		if (activeEvents.length == touchCount) {
			let midX = (activeEvents[0].clientX + activeEvents[1].clientX) / 2;
			let midY = (activeEvents[0].clientY + activeEvents[1].clientY) / 2;
			initDistance = getPointersDistance(activeEvents);

			origin = {x: midX, y: midY};

			node.dispatchEvent(
				new CustomEvent(`${gestureName}Down`, {
				detail: { center: origin, target: event.target },
				})
			);	
		}
	}

	function onMove(activeEvents: PointerEvent[], event: PointerEvent) {
		if (activeEvents.length == touchCount) {
			let midX = (activeEvents[0].clientX + activeEvents[1].clientX) / 2;
			let midY = (activeEvents[0].clientY + activeEvents[1].clientY) / 2;

			const curDistance = getPointersDistance(activeEvents);

			if (prevDistance !== undefined && curDistance !== prevDistance) {
				scale = curDistance / initDistance;
			} else {
				scale = prevScale;
			}
			prevScale = scale;
			prevDistance = curDistance;

			node.dispatchEvent(
				new CustomEvent(`${gestureName}Move`, {
				detail: { center: {x: midX, y: midY}, delta: {x: midX - origin.x, y: midY - origin.y}, scale: scale, target: event.target },
				})
			);	
		}
		return false;
	}

	if (params.composed) {
		return { onMove, onDown, onUp};
	}

	return setPointerControls(gestureName, node, onMove, onDown, onUp);
}
