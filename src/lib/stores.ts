import { get, writable } from 'svelte/store';
import { type AxiosInstance } from 'axios';
import type { CamRequest, CamResponse, Coordinates, Dimensions, CamPresets, SwapResponse, MenuItem } from '$types';
import {type PanzoomObject} from '@panzoom/panzoom'
import { type BaseParams } from 'svelte-gestures';
import { setPointerControls } from 'svelte-gestures';
import { type ActionsManager } from '$lib/actions';
import { States } from '$lib/actions';
import { RemoveSelection, Selector, AddSelection, GetSelectedRect } from '$lib/zones';
import Keyboard from '../routes/Keyboard.svelte';
import _ from 'lodash';
import Konva from "konva";

export let commandText = writable<string>("​");
export let ifDimensions = writable<Dimensions>({width: 0, height: 0});
export let commandHeight = writable<number>();
export let token = writable<string>();
export let server = writable<AxiosInstance>();
export let stage = writable<Konva.Stage>();
export let zones = writable<Konva.Group>();
export let camPresets = writable<CamPresets>({value: "", items: []});
export let clickZoom = writable<number>(100);
export let clickFocus = writable<number>(0);
export let panzoom = writable<PanzoomObject>();
export let clickTimer = writable<number>();
export let menuIsOpen = writable<boolean>();
export let keyboardHandler = writable<Keyboard>();


export let presetButtonCache = writable<{[key: string]: CamPresets}>({})
export let presetMenuCache = writable<{[key: string]: CamPresets}>({})
export let presetHotkeyCache = writable<{[key: string]: CamPresets}>({})
export let swapsCache = writable<{[key: string]: MenuItem}>({})

export let am = writable<ActionsManager>();

interface SendOptions {
    cmd: string;
    reset: boolean;
} 

const defaultCMD: string = "​";
const swapRegEx = new RegExp('^\!swap ([0-9]) ([0-9])$');
const clickRegEx = new RegExp('^\!ptzclick ([0-9])+ ([0-9])+ 100 ?$');
export async function sendCommand(userOpts: any) {
	let defaults: SendOptions = {
		cmd: defaultCMD, 
		reset: true
	};
	let opts: SendOptions = {...defaults, ...userOpts};

	if (opts.cmd == defaultCMD) {
		return;
	}
	
	get(server).post('/send', {
		command: opts.cmd
	}).then(function (response) {
		if (opts.cmd.startsWith("!swap")) {
			let result = swapRegEx.exec(opts.cmd);
			if (result) {
				let presetSelected = GetSelectedRect(Selector.Presets);
				if (presetSelected?.name()) {
					let presetZone = presetSelected.name();
					let targetZone = presetZone === result[1] ? result[2] : (presetZone === result[2] ? result[1] : null);
					
					if (targetZone) {
						AddSelection(get(zones).findOne(`.${targetZone}`), Selector.Presets);
					}
				}
			} else {
				_.delay(function() {
					let z = GetSelectedRect(Selector.Presets);
					if (z) {
						get(am).Actions["click"].Enable({x: z.x() + (z.width() / 2), y: z.y() + (z.height() / 2)})
					}
				}, 10);
			}
		}
	}).catch(function (error) {
		console.log(error);
	});
	
	// if (opts.reset && !(clickRegEx.exec(opts.cmd) && !userOpts.reset)) {
	if (opts.reset) {
		get(keyboardHandler).cancelPresetSelection();
		Reset(get(stage));
		if (document.activeElement) {
			(document.activeElement as HTMLElement).blur();
		}
	}
}

export function InitializeAM() {
	let newAM: ActionsManager = {
		Actions: {},  
		ActiveStates: new Set([States.PositiveSentinel]),
		IsAvailable: function (actionName: string): boolean {
			let action = this.Actions[actionName];
			if (action == undefined) {
				return false;
			}
			return (action.TriggerConditions.Active.isSubsetOf(this.ActiveStates) && (action.TriggerConditions.Inactive.intersection(this.ActiveStates).size == 0));
		},
		ShouldCancel: function (actionName: string): boolean {
			let action = this.Actions[actionName];
			if (action == undefined) {
				return false;
			}
			return (action.CancelConditions.Active.intersection(this.ActiveStates).size != 0 || action.CancelConditions.Inactive.difference(this.ActiveStates).size != 0);
		},
		CheckActions: function (origin: Coordinates): void {
			for (let [name, action] of Object.entries(this.Actions)) {
				if (!action.IsActive && this.IsAvailable(name)) {
					action.Enable({x: origin.x, y: origin.y})
				} else if (action.IsActive && this.ShouldCancel(name)) {
					action.Cancel();
				}
			}
		},
		CancelAll: function (): void {
			Object.values(this.Actions).forEach((action) => {
				action.Cancel();
			});
		}
 	};
	am.set(newAM);
}


export function GetZone(zones: Konva.Group, origin: Coordinates): Konva.Rect | undefined {
	let zone: Konva.Rect | undefined = undefined;
	zones.getChildren(function(node){
		return node.getClassName() == "Rect";
	}).forEach(function (node: Konva.Node) {
		let nodeGeometry = node.getClientRect();
		// if ((origin.x >= nodeGeometry.x && origin.x <= nodeGeometry.x + nodeGeometry.width) && (origin.y >= nodeGeometry.y && origin.y <= nodeGeometry.y + nodeGeometry.height)) {
		if (origin.x >= nodeGeometry.x) {
			if (origin.x <= nodeGeometry.x + nodeGeometry.width) {
				if (origin.y >= nodeGeometry.y) {
					if (origin.y <= nodeGeometry.y + nodeGeometry.height) {
						zone = node as Konva.Rect;
					}
				}
			}
		}
	});	

	return zone;
}



export async function SyncCache(cam: string) {
	let response = await get(server).post('/alias', {cam: cam});
	let target: string = response.data.result;
	if (!get(swapsCache)[target]) {
		response = await get(server).post('/camera/swaps', {camera: target});
		let swapData: SwapResponse = response.data;
		console.log(`Updating swaps cache for ${cam}`)
		if (swapData.found) {
			get(swapsCache)[target] = swapData.items;
		}
	}

	if (!get(presetButtonCache)[target]) {
		response = await get(server).post('/camera/presets/buttons', {camera: target})
		console.log(`Updating button cache for ${cam}`)
		if (response.data.found) {
			get(presetButtonCache)[target] = response.data.camPresets;
		} else {
			get(presetButtonCache)[target] = {value: target, items: []}
		}
	}

	if (!get(presetMenuCache)[target]) {
		response = await get(server).post('/camera/presets/menus', {camera: target})
		console.log(`Updating menus cache for ${cam}`)
		if (response.data.found) {
			get(presetMenuCache)[target] = response.data.camPresets;
		} else {
			get(presetMenuCache)[target] = {value: target, items: []}
		}
	}

	if (!get(presetHotkeyCache)[target]) {
		response = await get(server).post('/camera/presets/hotkeys', {camera: target})
		console.log(`Updating hotkeys cache for ${cam}`)
		if (response.data.found) {
			get(presetHotkeyCache)[target] = response.data.camPresets;
		} else {
			get(presetHotkeyCache)[target] = {value: target, items: []}
		}
	}
}

export async function GetSwaps(name: string): Promise<MenuItem> {
	let swaps: MenuItem = get(swapsCache)[name]
	if (!swaps) {
		let response = await get(server).post('/camera/swaps', {camera: name});
		let swapResponse: SwapResponse = response.data;
		if (!swapResponse.found) {
			return;
		} else {
			swaps = swapResponse.items;
			get(swapsCache)[name] = swaps;
		}
	}
	return swaps;
}

export function GrowZone(stage: Konva.Stage, zone: Konva.Rect) {
	zone.hitFunc(function(context: any) {
		let xMargin = stage.width() * .06
		let yMargin = stage.height() * .07
		context.beginPath();
		context.rect(-xMargin / 2, -yMargin / 2, zone.width() + xMargin, zone.height() + yMargin);
		context.closePath();
		
		context.fillStrokeShape(zone);
	});
	zone.moveToTop();
}

export function ResetZone(zone: Konva.Rect | undefined) {
	if (!zone) {
		return;
	}

	zone.hitFunc(function(context: any) {
		context.beginPath();
		context.rect(0, 0, zone.width(), zone.height());
		context.closePath();
		context.fillStrokeShape(zone);
	});
	zone.fill("rgba(0, 0, 0, 0)");
	zone.getLayer()?.draw();
}


export function ClearTangles(stage: Konva.Stage) {
	stage.find(".tangle").forEach(function (tangle: any) {
		tangle.destroyChildren();
		tangle.destroy();
	});
}

export function ClearClicks(stage: Konva.Stage) {
	stage.find(".click").forEach(function (click: any) {
		click.destroy();
	});
}

export function ClearArrows(stage: Konva.Stage) {
	stage.find(".arrow").forEach(function (arrow: any) {
		arrow.destroy();
	});
}

export function ClearStage(stage: Konva.Stage, extraExcludes: Selector[] = []) {
	let exclude = new Set([Selector.Presets, Selector.Radial, Selector.Keyboard]);
	extraExcludes.forEach(exclude.add, exclude)
	Object.entries(Selector).forEach((key, value) => {
		if (!exclude.has(value)) {
			RemoveSelection(value);
		}
	});
	
	ClearTangles(stage);
	ClearClicks(stage);
	ClearArrows(stage);
}

export function ResetValues() {
	commandText.set("​");
	clickZoom.set(100);
	clickFocus.set(0);
}

export function Reset(stage: Konva.Stage) {
	get(am).CancelAll();
	ClearStage(stage);
	ResetValues();
}

export async function GetCam(r: CamRequest, a: AxiosInstance): Promise<CamResponse> {
	// return {found: true, name: "fox", position: 3, cacheHit: true};
	let response = await a.post("/camera", {x: r.coordinates.x, y: r.coordinates.y, width: 0, height: 0, frameWidth: r.frameWidth, frameHeight: r.frameHeight, position: Number(r.position)});
	
	if (response.status >= 300) {
		console.log("Could not get camera");
		return {found: false, cam: "", position: 0, cacheHit: false}
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
	let prevScale: number;

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
		if (activeEvents.length == touchCount) {
			let midX = (activeEvents[0].clientX + activeEvents[1].clientX) / 2;
			let midY = (activeEvents[0].clientY + activeEvents[1].clientY) / 2;

			const curDistance = getPointersDistance(activeEvents);

			if (prevDistance !== undefined) {
				if (curDistance == prevDistance) {
					return false;
				}
				scale = curDistance / initDistance;
			} 
	
			prevScale = scale;
			prevDistance = curDistance;

			let rawDeltaX: number, rawDeltaY: number;
			if (prevPosition == undefined) {
				rawDeltaX = midX - origin.x;
				rawDeltaY = midY - origin.y;
			} else {
				if (midX == prevPosition.x && midY == prevPosition.y) {
					return false;
				}
				rawDeltaX = midX - prevPosition.x;
				rawDeltaY = midY - prevPosition.y;
			}

			rawDeltaX *= 1.6;
			rawDeltaY *= 1.6;

			prevPosition = {x: midX, y: midY}

			node.dispatchEvent(
				new CustomEvent(`${gestureName}Move`, {
				detail: { center: {x: midX, y: midY}, delta: {x: midX - origin.x, y: midY - origin.y}, rawDelta: {x: rawDeltaX, y: rawDeltaY}, scale: scale, target: event.target },
				})
			);	
			return true;
			
			
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
			event.preventDefault();

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
			event.preventDefault();
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
