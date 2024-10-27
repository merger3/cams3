import { writable } from 'svelte/store';
import axios, { Axios, type AxiosInstance } from 'axios';
import type { CamRequest, CamResponse, Coordinates, Dimensions } from '$types';
import {type PanzoomObject} from '@panzoom/panzoom'
import { pinch, press, composedGesture, type PressCustomEvent, pan, type PinchCustomEvent , type GestureCustomEvent, type RegisterGestureType, type GestureCallback, type BaseParams, type GestureReturnType} from 'svelte-gestures';
import { setPointerControls, getCenterOfTwoPoints } from 'svelte-gestures';
import { type States, type Action, type ActionsManager } from '$lib/actions';
import Konva from "konva";
import { tick } from 'svelte';

export let commandText = writable<string>();
export let ifDimensions = writable<Dimensions>({width: 0, height: 0});
export let token = writable<string>();
export let server = writable<AxiosInstance>();
export let clickZoom = writable<number>(100);
export let clickFocus = writable<number>(0);
export let drawing = writable<boolean>();
export let gesturing = writable<boolean>();
export let panzoom = writable<PanzoomObject>();
export let clickTimer = writable<number>();

export let am = writable<ActionsManager>();

export function InitializeAM() {
	let newAM: ActionsManager = {
		Actions: {}, 
		ActiveAction: null, 
		ActiveStates: new Set(),
		IsAvailable: function (actionName: string): boolean {
			let action = this.Actions[actionName];
			if (action == undefined) {
				return false;
			}
			return (action.ActiveConditions.isSubsetOf(this.ActiveStates) && (action.InactiveConditions.intersection(this.ActiveStates).size == 0));
		},
		CallAction: function (actionName: string, origin: Coordinates): void {
			let action = this.Actions[actionName];
			if (action == undefined) {
				return;
			}
			if (this.IsAvailable(actionName) && !action.IsActive) {
				action.Enable({x: origin.x, y: origin.y})
			} else if (!this.IsAvailable(actionName) && action.IsActive) {
				action.Cancel();
			}
		},
		CheckActions: function (origin: Coordinates): void {
			for (let [name, action] of Object.entries(this.Actions)) {
				if (this.IsAvailable(name) && !action.IsActive) {
					action.Enable({x: origin.x, y: origin.y})
				} else if (!this.IsAvailable(name) && action.IsActive) {
					// action.Cancel();
				}
			}
		}
 	};
	am.set(newAM);
}


export function GetZone(origin: Coordinates, stage: Konva.Stage, layer: Konva.Layer | undefined = undefined, children: any | undefined = undefined): number | null {
	// Draw and Swap could pull layer or children in enable and then avoid having to call them on move
	let listening: Konva.Node[] = [];
	
	if (!layer) {
		layer = stage.findOne('#mainlayer') as Konva.Layer;
	}

	if (!children) {
		children = layer.getChildren(function(node){
			return node.id() != "zones" && node.listening();
		});
	}
	
	children.forEach(function (node: Konva.Node) {
		listening.push(node);
		node.listening(false);
	});
	layer.draw();

	let zone = stage.getIntersection(origin);
	if (!zone || zone.name() == "") {
		console.log("No zone clicked")
		return null;
	}

	listening.forEach(function (node) {
		node.listening(true);
	});
	layer.draw();

	return Number(zone.name());
}

export function GrowZone(stage: Konva.Stage, zone: number) {
	let targetZone = stage.findOne(`.${zone}`) as Konva.Rect;
	if (targetZone) {
		targetZone.hitFunc(function(context: any) {
			let xMargin = stage.width() * .06
			let yMargin = stage.height() * .07
			context.beginPath();
			context.rect(-xMargin / 2, -yMargin / 2, targetZone.width() + xMargin, targetZone.height() + yMargin);
			context.closePath();
			
			context.fillStrokeShape(targetZone);
		});
		targetZone.moveToTop();
	}
}

export function ResetZones(stage: Konva.Stage) {
	let zoneGroup = stage.findOne('#zones') as Konva.Group;
	let zones = zoneGroup.getChildren() as Konva.Rect[];
	zones.forEach(function (node: Konva.Rect) {
		node.hitFunc(function(context: any) {
			context.beginPath();
			context.rect(0, 0, node.width(), node.height());
			context.closePath();
			context.fillStrokeShape(node);
		});
		node.fill("rgba(0, 0, 0, 0)");
		node.moveToBottom();
	});
}

export function ResetZone(stage: Konva.Stage, zone: number) {
	let node = stage.findOne(`.${zone}`) as Konva.Rect;
	if (node) {
		console.log(node)
		node.hitFunc(function(context: any) {
			context.beginPath();
			context.rect(0, 0, node.width(), node.height());
			context.closePath();
			context.fillStrokeShape(node);
		});
		node.fill("rgba(0, 0, 0, 0)");
		node.moveToBottom();
	}
}


export async function GetCam(r: CamRequest, a: AxiosInstance): Promise<CamResponse> {
	return {found: true, name: "fox", position: 3, cacheHit: true};
	
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
	let prevPosition: Coordinates;
	let initDistance = 0;
	let prevDistance: number | undefined;
	let scale = 1;
	let prevScale = 1;

	function onUp(activeEvents: PointerEvent[], event: PointerEvent) {
		if (activeEvents.length == 0) {
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
		// console.log(event)
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

			let rawDeltaX: number, rawDeltaY: number;
			if (prevPosition == undefined) {
				rawDeltaX = midX - origin.x;
				rawDeltaY = midY - origin.y;
			} else {
				rawDeltaX = midX - prevPosition.x;
				rawDeltaY = midY - prevPosition.y;
			}

			prevPosition = {x: midX, y: midY}
			node.dispatchEvent(
				new CustomEvent(`${gestureName}Move`, {
				detail: { center: {x: midX, y: midY}, delta: {x: midX - origin.x, y: midY - origin.y}, rawDelta: {x: rawDeltaX, y: rawDeltaY}, scale: scale, target: event.target },
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


export function tripleTouch(node: HTMLElement, params: BaseParams = {composed: false, touchAction: "none"}) {
	const gestureName = 'tripleTouch';
	const touchCount = 3;
	let origin: Coordinates;
	let prevDistance: number | undefined;

	function onUp(activeEvents: PointerEvent[], event: PointerEvent) {
		// fix this cleanup
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


			let midX = (activeEvents[0].clientX + activeEvents[activeEvents.length - 1].clientX) / 2;
			let midY = (activeEvents[0].clientY + activeEvents[activeEvents.length - 1].clientY) / 2;
			
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
			let midX = (activeEvents[0].clientX + activeEvents[activeEvents.length - 1].clientX) / 2;
			let midY = (activeEvents[0].clientY + activeEvents[activeEvents.length - 1].clientY) / 2;
			
			node.dispatchEvent(
				new CustomEvent(`${gestureName}Move`, {
				detail: { center: {x: midX, y: midY}, delta: {x: midX - origin.x, y: midY - origin.y}, target: event.target },
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


export function multiTouchPan(node: HTMLElement, params = {notchSize: 0}) {
	const gestureName = 'multiTouch';
	const touchCount = 2;
	let origin: Coordinates;
	let prevPosition: Coordinates;
	let prevDeltaY: number = 0;
	let toggle: boolean = true;

	function onUp(activeEvents: PointerEvent[], event: PointerEvent) {
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
			toggle = !toggle;
			if (toggle) {
				return false;
			} 
			let midX = (activeEvents[0].clientX + activeEvents[1].clientX) / 2;
			let midY = (activeEvents[0].clientY + activeEvents[1].clientY) / 2;

			
			let rawDeltaX: number, rawDeltaY: number;
			if (prevPosition == undefined) {
				rawDeltaX = midX - origin.x;
				rawDeltaY = midY - origin.y;
			} else {
				rawDeltaX = midX - prevPosition.x;
				rawDeltaY = midY - prevPosition.y;
			}

			if ((prevDeltaY < 0 && rawDeltaY > 0) || (prevDeltaY > 0 && rawDeltaY < 0)) {
				origin = {x: midX, y: midY};
			} 

			let deltaX = midX - origin.x;
			let deltaY = midY - origin.y;

			let notch = 0;
			if (Math.abs(deltaY) >= params.notchSize) {
				if (deltaY >= 0) {
					notch = -1;
				} else {
					notch = 1;
				}
				origin = {x: midX, y: midY};
			}

			if (rawDeltaY != 0) {
				prevDeltaY = rawDeltaY;
			}
			prevPosition = {x: midX, y: midY}
			node.dispatchEvent(
				new CustomEvent(`${gestureName}Move`, {
				detail: { center: {x: midX, y: midY}, delta: {x: deltaX, y: deltaY}, rawDelta: {x: rawDeltaX, y: rawDeltaY}, notch: notch, target: event.target },
				})
			);	
		}
		return true;
	}

	return setPointerControls(gestureName, node, onMove, onDown, onUp);
}
