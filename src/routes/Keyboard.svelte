<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import { zones, am, commandText, ClearStage, stage, swapsIsOpen, GetCam, swapsCache, presetCache, server, ifDimensions, camPresets, Reset, clickFocus, clickZoom, presetsIsOpen } from '$lib/stores';
	import type { Coordinates, CamPresets } from '$types';
	import { States, type Action } from '$lib/actions';
	import { Selector, GetSelectedRect, AddSelection, RemoveSelection } from '$lib/zones';
	import Konva from "konva";
	import { customAlphabet } from 'nanoid';

	export let selected: string;
	export let controls: number;

	const dispatch = createEventDispatcher();
	const tangleID = customAlphabet('0123456789abcdef', 5);

	let compiledHotkeys: {[key: string]: string[]} = {};

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

		"openpresetsmenu": presetsMenu,
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
		"zoomcam": zoomCam,

		"irauto": () => buildCommand("ptzir", ["auto"]),
		"iron": () => buildCommand("ptzir", ["on"]),
		"iroff": () => buildCommand("ptzir", ["off"]),

		"clear": clear,
		"toggleplayercontrols": togglePlayerControls,

		"selectbelowzone": selectBelowZone,
		"selectabovezone": selectAboveZone,
		"selectleftzone" : selectLeftZone,
		"selectrightzone": selectRightZone,

		"increasevalue": increaseValue,
		"decreasevalue": decreaseValue,
		"resetvalue": resetValue,

		"spintiltup": () => spin(tilt, 30),
		"spintiltdown": () => spin(tilt, -30),
		"spintiltright": () => spin(pan, 30),
		"spintiltleft": () => spin(pan, -30),
		"spinzoomin": () => spin(zoom, 30),
		"spinzoomout": () => spin(zoom, -30),

		"spintiltupsmall": () => spin(tilt, 15),
		"spintiltdownsmall": () => spin(tilt, -15),
		"spintiltrightsmall": () => spin(pan, 15),
		"spintiltleftsmall": () => spin(pan, -15),
		"spinzoominsmall": () => spin(zoom, 15),
		"spinzoomoutsmall": () => spin(zoom, -15),

		"resetspin": resetSpin,

		"loadpreset": loadPreset,

		"movedownleft": () => buildCommand("ptzmove", ["downleft"]),
		"movedown": () => buildCommand("ptzmove", ["down"]),
		"movedownright": () => buildCommand("ptzmove", ["downright"]),
		"moveleft": () => buildCommand("ptzmove", ["left"]),
		"moveright": () => buildCommand("ptzmove", ["right"]),
		"moveupleft": () => buildCommand("ptzmove", ["upleft"]),
		"moveup": () => buildCommand("ptzmove", ["up"]),
		"moveupright": () => buildCommand("ptzmove", ["upright"])
	} 

	let hotkeys: {[key: string]: string} = {
		'Space Enter NumpadEnter': "send",

		'Escape Backspace': "clear",

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
		
		"b p": "openpresetsmenu",
		'v Period': "openswapmenu",
		'l': "loadnext",
		'n': "swapnext",

		'r': "resetcam",
		'f': 'focuscam',
		'!z': "zoomcam",
		
		'u': "irauto",
		'i': "iron",
		'o': "iroff",

		't': "toggleplayercontrols",

		'ArrowUp': "selectabovezone increasevalue",
		'ArrowDown': "selectbelowzone decreasevalue",
		'ArrowRight': "selectrightzone increasevalue",
		'ArrowLeft': "selectleftzone decreasevalue",

		"Equal": "increasevalue",
		"Minus": "decreasevalue",
		"Digit0": "resetvalue",

		'^ArrowUp': "spintiltup",
		'^ArrowDown': "spintiltdown",
		'^ArrowRight': "spintiltright",
		'^ArrowLeft': "spintiltleft",
		"^Equal": "spinzoomin",
		"^Minus": "spinzoomout",

		'+ArrowUp': "spintiltupsmall",
		'+ArrowDown': "spintiltdownsmall",
		'+ArrowRight': "spintiltrightsmall",
		'+ArrowLeft': "spintiltleftsmall",
		"+Equal": "spinzoominsmall",
		"+Minus": "spinzoomoutsmall",

		"Slash": "resetspin",

		"Tab": "loadpreset",

		'^Numpad1': "movedownleft",
		'^Numpad2': "movedown",
		'^Numpad3': "movedownright",
		'^Numpad4': "moveleft",
		'^Numpad6': "moveright",
		'^Numpad7': "moveupleft",
		'^Numpad8': "moveup",
		'^Numpad9': "moveupright",
	}

	function cancelPresetSelection() {
		window.removeEventListener('keydown', listenForPreset);
		presetHotkeys = {};
		window.addEventListener('keydown', handleKeyboard);
		RemoveSelection(Selector.SelectingPreset);
	}

	let presetHotkeys: {[key: string]: any} = {};
	function listenForPreset(e: KeyboardEvent) {
		if (presetTimer) {
			clearTimeout(presetTimer);
		}

		if (e.repeat) {
			return;
		}

		if (e.code == "Backspace" || e.code == "Tab") {
			e.preventDefault();
			cancelPresetSelection();
			return;
		}

		let action = presetHotkeys[newHotkey(e).hotkey()];
		if (action) {
			e.preventDefault();
			action();
			cancelPresetSelection();
		}
	} 

	let presetTimer: number;
	async function loadPreset() {
		if (!$camPresets || $camPresets.presets.length == 0) {
			return;
		}

		let zone = GetSelectedRect(Selector.Presets);
		if (!zone) {
			return;
		}

		$camPresets.presets.forEach((preset) => {
			preset.hotkeys.forEach((v) => {
				presetHotkeys[hotkeyFromString(v).hotkey()] = () => {
					$commandText = `!ptzload ${$camPresets.name} ${preset.name}`;
					ClearStage($stage)
				};
			})
		});

		window.removeEventListener('keydown', handleKeyboard);
		window.addEventListener('keydown', listenForPreset);
		AddSelection(zone, Selector.SelectingPreset);

		presetTimer = setTimeout(() => {
			cancelPresetSelection();
		}, 5000);
	}

	const pan = 0;
	const tilt = 1;
	const zoom = 2
	let spinningCam: string;
	let spinValues = [0, 0, 0];
	async function spin(target: number, amount: number) {
		if (!spinningCam) {
			let name: string;
			if ($camPresets && $camPresets.name != "") {
				name = $camPresets.name;
			} else {
				let zone = GetSelectedRect(Selector.Presets);
				if (!zone) {
					return;
				}

				let cam = await GetCam({coordinates: {x: zone.x() + (zone.width() / 2), y: zone.y() + (zone.height() / 2)}, frameWidth: $ifDimensions.width, frameHeight: $ifDimensions.height, position: Number(zone.name())}, $server)
				if (!cam.found) {
					return;
				}
				name = cam.cam;
			}

			spinningCam = name;
		}

		spinValues[target] += amount;
		if (spinValues[target] > 90) {
			spinValues[target] = 90;
		} else if (spinValues[target] < -90) {
			spinValues[target] = -90;
		}

		$commandText = `!ptzspin ${spinningCam} ${spinValues[pan]} ${spinValues[tilt]} ${spinValues[zoom]}`
		dispatch('sendcmd');
		if (spinValues[pan] == 0 && spinValues[tilt] == 0 && spinValues[zoom] == 0) {
			spinningCam = undefined;
		}
	}

	async function resetSpin() {
		if (!spinningCam) {
			let name: string;
			if ($camPresets && $camPresets.name != "") {
				name = $camPresets.name;
			} else {
				let zone = GetSelectedRect(Selector.Presets);
				if (!zone) {
					return;
				}

				let cam = await GetCam({coordinates: {x: zone.x() + (zone.width() / 2), y: zone.y() + (zone.height() / 2)}, frameWidth: $ifDimensions.width, frameHeight: $ifDimensions.height, position: Number(zone.name())}, $server)
				if (!cam.found) {
					return;
				}
				name = cam.cam;
			}

			spinningCam = name;
		}

		$commandText = `!ptzspin ${spinningCam} 0 0 0`;
		dispatch('sendcmd');
		spinValues = [0, 0, 0];
		spinningCam = undefined;
	}

	function resetValue() {
		if ($commandText.startsWith("!ptzclick") || $commandText.startsWith("!ptzzoomr")) {
			$clickZoom = 100;
			$commandText = `${$commandText.split(" ").slice(0, -1).join(" ")} ${$clickZoom}`;
		} else if ($commandText.startsWith("!ptzfocusr")) {
			$clickFocus = 0;
			$commandText = `${$commandText.split(" ").slice(0, -1).join(" ")} ${$clickFocus}`;
		}
	}

	const maxZoom: number = 300;
	function increaseValue() {
		if ($commandText.startsWith("!ptzclick") || $commandText.startsWith("!ptzzoomr")) {
			if ($clickZoom >= 100) {
				$clickZoom += 20;
			} else if ($clickZoom < 10) {
				$clickZoom += 10;
			} else {
				$clickZoom += 10;
			}
			if ($clickZoom > maxZoom) {
				$clickZoom = 10000;
			}
			$commandText = `${$commandText.split(" ").slice(0, -1).join(" ")} ${$clickZoom}`;
		} else if ($commandText.startsWith("!ptzfocusr")) {
			$clickFocus += 25;
			$commandText = `${$commandText.split(" ").slice(0, -1).join(" ")} ${$clickFocus}`;
		}
	}

	function decreaseValue() {
		if ($commandText.startsWith("!ptzclick") || $commandText.startsWith("!ptzzoomr")) {
			if ($clickZoom >= 10000) {
				$clickZoom = maxZoom;			
			} else if ($clickZoom > 0) {
				if ($clickZoom > 100) {
					$clickZoom -= 20;
				} else if ($clickZoom <= 10) {
					$clickZoom -= 10;
				} else {
					$clickZoom -= 10;
				}
			} 
			if ($clickZoom < 0) {
				$clickZoom = 0;
			}
			$commandText = `${$commandText.split(" ").slice(0, -1).join(" ")} ${$clickZoom}`;
		} else if ($commandText.startsWith("!ptzfocusr")) {
			$clickFocus -= 25;
			$commandText = `${$commandText.split(" ").slice(0, -1).join(" ")} ${$clickFocus}`;
		}
	}
	
	function scrollable(): boolean {
		if ($commandText.startsWith("!ptzclick") || $commandText.startsWith("!ptzfocusr") || $commandText.startsWith("!ptzzoomr")) {
			return true;
		} else {
			return false;
		}
	}

	function selectBelowZone() {
		if (scrollable()) {
			return;
		}

		let sourceZone = GetSelectedRect(Selector.Presets);
		if (!sourceZone) {
			return;
		}
		let target: string;
		let zone = sourceZone.name();

		switch (zone) {
		case "1":
			target = "5";
			break;
		case "2":
			target = "3";
			break;
		case "3":
			target = "4";
			break;
		default:
			return;
		}

		enableZone(target);
	}

	function selectAboveZone() {
		if (scrollable()) {
			return;
		}
		
		let sourceZone = GetSelectedRect(Selector.Presets);
		if (!sourceZone) {
			return;
		}
		let target: string;
		let zone = sourceZone.name();

		switch (zone) {
		case "3":
			target = "2";
			break;
		case "4":
			target = "3";
			break;
		case "5": case "6":
			target = "1";
			break;
		default:
			return;
		}

		enableZone(target);
	}


	function selectLeftZone() {
		if (scrollable()) {
			return;
		}
		
		let sourceZone = GetSelectedRect(Selector.Presets);
		if (!sourceZone) {
			return;
		}
		let target: string;
		let zone = sourceZone.name();

		switch (zone) {
		case "1":
			target = "3";
			break;
		case "5":
			target = "4";
			break;
		case "6":
			target = "5";
			break;
		default:
			return;
		}

		enableZone(target);
	}

	function selectRightZone() {
		if (scrollable()) {
			return;
		}
		
		let sourceZone = GetSelectedRect(Selector.Presets);
		if (!sourceZone) {
			return;
		}
		let target: string;
		let zone = sourceZone.name();

		switch (zone) {
		case "2": case "3":
			target = "1";
			break;
		case "4":
			target = "5"
			break;
		case "5":
			target = "6"
			break;
		default:
			return;
		}

		enableZone(target);
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
		if ($presetsIsOpen) {
			$am.Actions["presetsmenu"].Cancel();
			return;
		}
		if ($swapsIsOpen) {
			$am.Actions["swaps"].Cancel();
			return;
		}
		Reset($stage);
	}

	async function zoomCam() {
		let zone = GetSelectedRect(Selector.Presets);
		if (!zone) {
			return;
		}

		let name: string;
		if ($camPresets && $camPresets.name != "") {
			name = $camPresets.name;
		} else {
			let cam = await GetCam({coordinates: {x: zone.x() + (zone.width() / 2), y: zone.y() + (zone.height() / 2)}, frameWidth: $ifDimensions.width, frameHeight: $ifDimensions.height, position: Number(zone.name())}, $server)
			if (!cam.found) {
				return;
			}
			name = cam.cam;
		}

		$commandText = `!ptzzoomr ${name} 100`
		$clickZoom = 100;
		ClearStage($stage);
		AddSelection(zone, Selector.Zoom);
	}

	async function focusCam() {
		let zone = GetSelectedRect(Selector.Presets);
		if (!zone) {
			return;
		}

		let name: string;
		if ($camPresets && $camPresets.name != "") {
			name = $camPresets.name;
		} else {
			let cam = await GetCam({coordinates: {x: zone.x() + (zone.width() / 2), y: zone.y() + (zone.height() / 2)}, frameWidth: $ifDimensions.width, frameHeight: $ifDimensions.height, position: Number(zone.name())}, $server)
			if (!cam.found) {
				return;
			}
			name = cam.cam;
		}

		$commandText = `!ptzfocusr ${name} 0`
		$clickFocus = 0;
		ClearStage($stage);
		AddSelection(zone, Selector.Focus);
	}

	async function buildCommand(command: string, values: string[] = []) {
		let name: string;
		if ($camPresets && $camPresets.name != "") {
			name = $camPresets.name;
		} else {
			let zone = GetSelectedRect(Selector.Presets);
			if (!zone) {
				return;
			}

			let cam = await GetCam({coordinates: {x: zone.x() + (zone.width() / 2), y: zone.y() + (zone.height() / 2)}, frameWidth: $ifDimensions.width, frameHeight: $ifDimensions.height, position: Number(zone.name())}, $server)
			if (!cam.found) {
				return;
			}
			name = cam.cam;
		}

		ClearStage($stage);
		$commandText = `!${command} ${name} ${values.join(" ")}`
		// dispatch('sendcmd');
	}

	async function loadNextCam(action: string) {
		let name: string;
		if ($camPresets && $camPresets.name != "") {
			name = $camPresets.name;
		} else {
			let zone = GetSelectedRect(Selector.Presets);
			if (!zone) {
				return;
			}

			let cam = await GetCam({coordinates: {x: zone.x() + (zone.width() / 2), y: zone.y() + (zone.height() / 2)}, frameWidth: $ifDimensions.width, frameHeight: $ifDimensions.height, position: Number(zone.name())}, $server)
			if (!cam.found) {
				return;
			}
			name = cam.cam;
		}

		let swaps = $swapsCache[name]
		if (!swaps) {
			let response = await $server.post('/camera/swaps', {camera: name});
			swaps = response.data;
			if (!swaps.found) {
				return;
			} else {
				$swapsCache[name] = swaps;
			}
		}

		if (!swaps.swaps.subentries[0] || swaps.swaps.subentries[0].subentries) {
			return;
		}

		if (action == "swap") {
			$commandText = `!swap ${swaps.cam} ${swaps.swaps.subentries[0].label}`
			// dispatch('sendcmd');
		} else if (action == "load") {
			presetsMenu();
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

	function presetsMenu() {
		if ($presetsIsOpen) {
			$am.Actions["presetsmenu"].Cancel();
			return;
		}
		let zone = GetSelectedRect(Selector.Presets);
		if (!zone) {
			return;
		}
		$am.Actions["presetsmenu"].Enable({x: zone.x() + (zone.width() / 2), y: zone.y() + (zone.height() / 2)})
		const pointerUpEvent = new PointerEvent('pointerup', {bubbles: true, cancelable: true, clientX: 0, clientY: 0, button: 2, buttons: 2, pointerId: 1, pointerType: 'mouse', isPrimary: true});
		jQuery('#overlay')[0].dispatchEvent(pointerUpEvent);
	}

	function swapMenu() {
		if ($swapsIsOpen) {
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
		if (e.repeat && !(scrollable() && (e.code == "Equal" || e.code == "Minus"))) {
			return;
		}
		let actions = compiledHotkeys[newHotkey(e).hotkey()];
		if (actions) {
			actions.forEach((action) => {
				let outcome = functions[action];
				if (outcome && !(($swapsIsOpen && outcome != swapMenu) || $presetsIsOpen && outcome != presetsMenu)) {
					e.preventDefault()
					Promise.resolve().then(outcome);
				}
			})
		}
	}

	onMount(() => {
		Object.entries(hotkeys).forEach(([key, value]) => {
			key.trim().split(" ").forEach((v) => {
				compiledHotkeys[hotkeyFromString(v).hotkey()] = value.trim().split(" ");
			})
		});
		window.addEventListener('keydown', handleKeyboard);
	});
</script>