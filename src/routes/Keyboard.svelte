<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import { zones, am, commandText, ClearStage, stage, isOpen, GetCam, swapsCache, presetCache, server, ifDimensions, camPresets, Reset, clickFocus } from '$lib/stores';
	import type { Coordinates, CamPresets } from '$types';
	import { States, type Action } from '$lib/actions';
	import { Selector, GetSelectedRect, AddSelection, RemoveSelection } from '$lib/zones';
	import Konva from "konva";
	import { customAlphabet } from 'nanoid';

	export let selected: string;
	export let controls: number;

	const dispatch = createEventDispatcher();
	const tangleID = customAlphabet('0123456789abcdef', 5);

	let compiledHotkeys: {[key: string]: any} = {};

	const Mod = 0;
	const Alt = 1;
	const Ctrl = 3;
	const Shift = 4;

	interface Hotkey {
		modifiers: Set<number>;
		key: string;
		hotkey(): string;
	}

	function hotkeyToString(this: Hotkey): string {
		let hotString = "";
		this.modifiers.forEach((modifier) => {
			switch (modifier) {
			case Mod:
				hotString += '#';
				break;
			case Alt:
				hotString += '!';
				break;
			case Ctrl:
				hotString += '^';
				break;
			case Shift:
				hotString += '+';
				break;
			}
		})
		hotString += this.key;
		return hotString;
	} 

	function hotkeyFromString(s: string): Hotkey {
		let newHotkey: Hotkey = {modifiers: new Set(), key: "", hotkey: hotkeyToString}
		for (const char of s) {
			switch (char) {
			case '#':
				newHotkey.modifiers.add(Mod);
				break;
			case '!':
				newHotkey.modifiers.add(Alt);
				break;
			case '^':
				newHotkey.modifiers.add(Ctrl);
				break;
			case '+':
				newHotkey.modifiers.add(Shift);
				break;
			default:
				newHotkey.key += char;
			}
		};
		newHotkey.key = newHotkey.key.toLowerCase();
		return newHotkey;
	}

	function newHotkey(e: KeyboardEvent): Hotkey {
		let newHotkey: Hotkey = {modifiers: new Set(), key: e.code.replace('Key','').toLowerCase(), hotkey: hotkeyToString}
		if (e.metaKey) {
			newHotkey.modifiers.add(Mod);
		}
		if (e.altKey) {
			newHotkey.modifiers.add(Alt);
		}
		if (e.ctrlKey) {
			newHotkey.modifiers.add(Ctrl);
		}
		if (e.shiftKey) {
			newHotkey.modifiers.add(Shift);
		}
		return newHotkey;
	}

	let functions: {[key: string]: any} = {
		"send": sendCommand,
		"openswapmenu": swapMenu,
		"loadnext": () => loadNextCam("load"),
		"swapnext": () => loadNextCam("swap"), 

		"select1": () => enableZone('1'),
		"select2": () => enableZone('2'),
		"select3": () => enableZone('3'),
		"select4": () => enableZone('4'),
		"select5": () => enableZone('5'),
		"select6": () => enableZone('6'),

		"swapto1": () => swapPosition(1),
		"swapto2": () => swapPosition(2),
		"swapto3": () => swapPosition(3),
		"swapto4": () => swapPosition(4),
		"swapto5": () => swapPosition(5),
		"swapto6": () => swapPosition(6),

		"resetcam": () => buildCommand("resetcam"),
		"focuscam": focusCam,

		"irauto": () => buildCommand("ptzir", ["auto"]),
		"iron": () => buildCommand("ptzir", ["on"]),
		"iroff": () => buildCommand("ptzir", ["off"]),

		"clear": clear,
		"toggleplayercontrols": togglePlayerControls,
	} 

	let hotkeys: {[key: string]: string} = {
		'Space Enter NumpadEnter': "send",

		'Escape': "clear",

		'Digit1': "select1",
		'Digit2': "select2",
		'Digit3': "select3",
		'Digit4': "select4",
		'Digit5': "select5",
		'Digit6': "select6",

		'Numpad7': "select2",
		'Numpad4': "select3",
		'Numpad1': "select4",
		'Numpad2': "select5",
		'Numpad3': "select6",

		'Numpad8': "select1",
		'Numpad9': "select1",
		'Numpad5': "select1",
		'Numpad6': "select1",

		'q': "select2",
		'a': "select3",
		'z': "select4",
		'x': "select5",
		'c': "select6",

		'w': "select1",
		'e': "select1",
		's': "select1",
		'd': "select1",

		'+Digit1': "swapto1",
		'+Digit2': "swapto2",
		'+Digit3': "swapto3",
		'+Digit4': "swapto4",
		'+Digit5': "swapto5",
		'+Digit6': "swapto6",

		'+Numpad7': "swapto2",
		'+Numpad4': "swapto3",
		'+Numpad1': "swapto4",
		'+Numpad2': "swapto5",
		'+Numpad3': "swapto6",

		'+Numpad8': "swapto1",
		'+Numpad9': "swapto1",
		'+Numpad5': "swapto1",
		'+Numpad6': "swapto1",

		'+q': "swapto2",
		'+a': "swapto3",
		'+z': "swapto4",
		'+x': "swapto5",
		'+c': "swapto6",

		'+w': "swapto1",
		'+e': "swapto1",
		'+s': "swapto1",
		'+d': "swapto1",

		'v Period': "openswapmenu",
		'l': "loadnext",
		'n': "swapnext",

		'r': "resetcam",
		'f': 'focuscam',

		'i': "iron",
		'o': "iroff",
		'p': "irauto",

		't': "toggleplayercontrols",
	}

	function togglePlayerControls() {
		if (selected == "btn-outline-secondary") {
			selected = "btn-secondary";
			jQuery('#cams').css('z-index', '100');
			jQuery('#cams').css('pointer-events', 'all');
			jQuery('#chat').css('visibility', 'hidden');
			controls = 1;
		} else {
			selected = "btn-outline-secondary";
			jQuery('#cams').css('z-index', '');
			jQuery('#cams').css('pointer-events', '');
			jQuery('#chat').css('visibility', '');
		}
	}

	function clear() {
		Reset($stage);
	}

	async function focusCam() {
		let zone = GetSelectedRect(Selector.Presets);
		if (!zone) {
			return;
		}

		let cam = await GetCam({coordinates: {x: zone.x() + (zone.width() / 2), y: zone.y() + (zone.height() / 2)}, frameWidth: $ifDimensions.width, frameHeight: $ifDimensions.height, position: Number(zone.name())}, $server)
		if (!cam.found) {
			return;
		}

		$commandText = `!ptzfocusr ${cam.cam} 0`
		$clickFocus = 0;
		AddSelection(zone, Selector.Focus);
	}

	async function buildCommand(command: string, values: string[] = []) {
		let zone = GetSelectedRect(Selector.Presets);
		if (!zone) {
			return;
		}

		let cam = await GetCam({coordinates: {x: zone.x() + (zone.width() / 2), y: zone.y() + (zone.height() / 2)}, frameWidth: $ifDimensions.width, frameHeight: $ifDimensions.height, position: Number(zone.name())}, $server)
		if (!cam.found) {
			return;
		}
		ClearStage($stage);
		$commandText = `!${command} ${cam.cam} ${values.join(" ")}`
		// dispatch('sendcmd');
	}

	async function loadNextCam(action: string) {
		let zone = GetSelectedRect(Selector.Presets);
		if (!zone) {
			return;
		}

		let cam = await GetCam({coordinates: {x: zone.x() + (zone.width() / 2), y: zone.y() + (zone.height() / 2)}, frameWidth: $ifDimensions.width, frameHeight: $ifDimensions.height, position: Number(zone.name())}, $server)
		if (!cam.found) {
			return;
		}

		let swaps = $swapsCache[cam.cam]
		if (!swaps) {
			console.log("cache miss")
			let response = await $server.post('/camera/swaps', {camera: cam.cam});
			swaps = response.data;
			if (!swaps.found) {
				return;
			} else {
				$swapsCache[cam.cam] = swaps;
			}
		}

		if (!swaps.swaps.subentries[0] || swaps.swaps.subentries[0].subentries) {
			return;
		}

		if (action == "swap") {
			$commandText = `!swap ${swaps.cam} ${swaps.swaps.subentries[0].label}`
			// dispatch('sendcmd');
		} else if (action == "load") {
			let presets = $presetCache[swaps.swaps.subentries[0].label];
			if (!presets) {
				let presetResponse = await $server.post('/camera/presets', {camera: swaps.swaps.subentries[0].label});
				if (!presetResponse.data.found) {
					return;
				} else {
					$presetCache[swaps.swaps.subentries[0].label] = presetResponse.data.camPresets;
					presets = presetResponse.data.camPresets;
				}
			}
			$camPresets = presets;
		}
	}


	function swapPosition(target: number) {
		let sourceZone = GetSelectedRect(Selector.Presets);
		if (!sourceZone) {
			return;
		}
		let targetZone = $zones.findOne(`.${target}`) as Konva.Rect;
		if (!targetZone) {
			return;
		}
		AddSelection(sourceZone, Selector.SwapSource);
		AddSelection(targetZone, Selector.SwapTarget);
		let swaps: number[] = [Number(sourceZone.name()), target]
		if (swaps[0] == swaps[1]) {
			return;
		} else {
			swaps.sort(function(a, b){return a - b});
			ClearStage($stage, false);
			let newArrow = new Konva.Arrow({
				x: 0,
				y: 0,
				name: "arrow",
				id: tangleID(),
				points: [
					sourceZone.x() + (sourceZone.width() / 2), sourceZone.y() + (sourceZone.height() / 2), 
					targetZone.x() + (targetZone.width() / 2), targetZone.y() + (targetZone.height() / 2)
				],
				stroke: "rgba(121, 173, 120, 0.7)",
				pointerLength: 18,
				pointerWidth: 22,
				strokeWidth: 8,
				lineCap: "round",
				listening: false,
				draggable: false
			});
			
			$zones.getLayer().add(newArrow);
			$commandText = `!swap ${swaps[0]} ${swaps[1]}`
		}
	}

	function swapMenu() {
		if ($isOpen) {
			$am.Actions["swaps"].Cancel();
			return;
		}

		let zone = GetSelectedRect(Selector.Presets);
		if (!zone) {
			return;
		}
		$am.Actions["swaps"].Enable({x: zone.x() + (zone.width() / 2), y: zone.y() + (zone.height() / 2)})
		const pointerUpEvent = new PointerEvent('pointerup', {bubbles: true, cancelable: true, clientX: 0, clientY: 0, button: 2, buttons: 2, pointerId: 1, pointerType: 'mouse', isPrimary: true});
		jQuery('#overlay')[0].dispatchEvent(pointerUpEvent);
	}

	function sendCommand() {
		dispatch("sendcmd");
	}

	function enableZone(slot: string) {
		let z = $zones.findOne(`.${slot}`) as Konva.Rect;
		if (z) {
			$am.Actions["doubleclick"].Enable({x: z.x() + (z.width() / 2), y: z.y() + (z.height() / 2)})
		}
	}

	function handleKeyboard(e: KeyboardEvent) {
		
		if (e.repeat) {
			return;
		}
		console.log("keyabord event registerd")
		console.log(e)
		let pressedHotkey = compiledHotkeys[newHotkey(e).hotkey()];
		console.log(newHotkey(e).hotkey())
		if (pressedHotkey) {
			let outcome = functions[pressedHotkey];
			if (outcome && !($isOpen && outcome != swapMenu)) {
				e.preventDefault()
				outcome();
			}
		}
	}

	onMount(() => {
		Object.entries(hotkeys).forEach(([key, value]) => {
			key.trim().split(" ").forEach((v) => {
				compiledHotkeys[hotkeyFromString(v).hotkey()] = value;
			})
		});
		window.addEventListener('keydown', handleKeyboard);
	});
</script>