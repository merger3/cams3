<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import { zones, am, commandText, ClearStage, stage, menuIsOpen, GetCam, swapsCache, presetHotkeyCache, SyncCache, server, ifDimensions, camPresets, Reset, clickFocus, clickZoom, GetZone, GetSwaps, sendCommand } from '$lib/stores';
	import type { HotkeyPreset, CamPresets, SwapResponse, MenuItem } from '$types';
	import { States, type Action } from '$lib/actions';
	import { Selector, GetSelectedRect, AddSelection, RemoveSelection } from '$lib/zones';
	import Konva from "konva";
	import { customAlphabet } from 'nanoid';

	export let selected: string;
	export let controls: number;

	const dispatch = createEventDispatcher();
	const tangleID = customAlphabet('0123456789abcdef', 5);
	const defaultCMD: string = "​";

	let spinFast = 15;
	let spinSlow = 5;
	
	enum LayerType {
		Default,
		GeneralBase,
		GeneralSub,
		PresetsBase,
		PresetsSub
	}

	interface Actions {
		action: string;
		args: any[];
	}

	interface uncompiledLayer {
		[key: string]: string;
	}

	interface Layer {
		type: LayerType;
		hotkeys: {
			[key: string]: Actions[];
		}
	}

	let compiledHotkeys: Layer = {"type": LayerType.GeneralBase, "hotkeys": {}};
	let layers:  Layer[] = [compiledHotkeys];

	const presetBaseKeys: uncompiledLayer = {
		"Escape Tab": "resetlayers",
		"Backspace ArrowLeft": "previouslayer",
		'Space Enter NumpadEnter': "send"
	}

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
		"send": triggerSend,

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

		"swapto1": () => swapPosition(1, true),
		"swapto2": () => swapPosition(2, true),
		"swapto3": () => swapPosition(3, true),
		"swapto4": () => swapPosition(4, true),
		"swapto5": () => swapPosition(5, true),
		"swapto6": () => swapPosition(6, true),

		"resetcam": () => buildCommand("resetcam", autosend),
		"focuscam": focusCam,
		"zoomcam": zoomCam,

		"irauto": () => buildCommand("ptzir", autosend, "auto"),
		"iron": () => buildCommand("ptzir", autosend, "on"),
		"iroff": () => buildCommand("ptzir", autosend, "off"),

		"clear": clear,
		"toggleplayercontrols": togglePlayerControls,

		"selectbelowzone": selectBelowZone,
		"selectabovezone": selectAboveZone,
		"selectleftzone" : selectLeftZone,
		"selectrightzone": selectRightZone,

		"increasevalue": increaseValue,
		"decreasevalue": decreaseValue,
		"resetvalue": resetValue,

		"spintiltup": () => spin(tilt, spinFast),
		"spintiltdown": () => spin(tilt, -spinFast),
		"spinpanright": () => spin(pan, spinFast),
		"spinpanleft": () => spin(pan, -spinFast),
		"spinzoomin": () => spin(zoom, spinFast),
		"spinzoomout": () => spin(zoom, -spinFast),

		"spintiltupsmall": () => spin(tilt, spinSlow),
		"spintiltdownsmall": () => spin(tilt, -spinSlow),
		"spinpanrightsmall": () => spin(pan, spinSlow),
		"spinpanleftsmall": () => spin(pan, -spinSlow),
		"spinzoominsmall": () => spin(zoom, spinSlow),
		"spinzoomoutsmall": () => spin(zoom, -spinSlow),

		"resetspin": resetSpin,

		"loadpreset": loadPreset,
		"selectpreset": (p: string, s=true) => loadAndTestPreset(p, s),

		"movedownleft": () => buildCommand("ptzmove", autosend, "downleft"),
		"movedown": () => buildCommand("ptzmove", autosend, "down"),
		"movedownright": () => buildCommand("ptzmove", autosend, "downright"),
		"moveleft": () => buildCommand("ptzmove", autosend, "left"),
		"moveright": () => buildCommand("ptzmove", autosend, "right"),
		"moveupleft": () => buildCommand("ptzmove", autosend, "upleft"),
		"moveup": () => buildCommand("ptzmove", autosend, "up"),
		"moveupright": () => buildCommand("ptzmove", autosend, "upright"),

		"cancelpresets": cancelPresetSelection,
		"previouslayer": previousLayer,
		"resetlayers": cancelPresetSelection,
		"loadlayer": addLayer,

		"openchat": openChat,
		"closechat": closeChat
	}

	let hotkeys: uncompiledLayer = {
		// Optional type identifier
		'type': 'GeneralBase',

		'Space Enter NumpadEnter': "send",

		'Escape Backspace': "clear closechat",

		'!c Slash': "openchat closechat",

		'Digit1': "swapto1",
		'Digit2': "swapto2",
		'Digit3': "swapto3",
		'Digit4': "swapto4",
		'Digit5': "swapto5",
		'Digit6': "swapto6",

		'^Numpad7': "select2",
		'^Numpad4': "select3",
		'^Numpad1': "select4",
		'^Numpad2': "select5",
		'^Numpad3': "select6",

		'^Numpad8': "select1",
		'^Numpad9': "select1",
		'^Numpad5': "select1",
		'^Numpad6': "select1",

		'q': "select2",
		'a': "select3",
		'z': "select4",
		'x': "select5",
		'c': "select6",

		'w': "select1",
		'e': "select1",
		's': "select1",
		'd': "select1",

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

		"p": "openpresetsmenu",
		'v Period': "openswapmenu",
		'l': "loadnext",
		'n': "swapnext",

		'r': "resetcam",
		'f': 'focuscam',
		'!z g': "zoomcam",

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
		'^ArrowRight': "spinpanright",
		'^ArrowLeft': "spinpanleft",
		"^Equal": "spinzoomin",
		"^Minus": "spinzoomout",

		'+ArrowUp': "spintiltupsmall",
		'+ArrowDown': "spintiltdownsmall",
		'+ArrowRight': "spinpanrightsmall",
		'+ArrowLeft': "spinpanleftsmall",
		"+Equal": "spinzoominsmall",
		"+Minus": "spinzoomoutsmall",

		"^Slash +Slash !Slash": "resetspin",

		"Tab": "loadpreset",

		'Numpad1': "movedownleft",
		'Numpad2': "movedown",
		'Numpad3': "movedownright",
		'Numpad4': "moveleft",
		'Numpad6': "moveright",
		'Numpad7': "moveupleft",
		'Numpad8': "moveup",
		'Numpad9': "moveupright",
	}


	export function cancelPresetSelection() {
		if (presetTimer) {
			clearTimeout(presetTimer);
		}
		layers = [compiledHotkeys];
		RemoveSelection(Selector.SubSelectingPreset);
		RemoveSelection(Selector.SelectingPreset);
	}


	function previousLayer() {
		if (layers.length > 1) {
			layers.pop();
		}
		if (layers[layers.length-1].type != LayerType.PresetsBase) {
			RemoveSelection(Selector.SelectingPreset);
		}
		if (layers[layers.length-1].type != LayerType.PresetsSub) {
			RemoveSelection(Selector.SubSelectingPreset);
		}
	}

	function unpackPresets(presets: HotkeyPreset[], presetHotkeys: Layer = undefined): Layer {
		if (!presetHotkeys) {
			presetHotkeys = compileHotkeys(presetBaseKeys, LayerType.PresetsSub);
		}
		presets.forEach((p) => {
			let actionSet: Actions[] = [{"action": "selectpreset", "args": [p.value]}];
			if (p.sublayer && p.sublayer.length != 0) {
				let sublayer = unpackPresets(p.sublayer);
				actionSet[0].args.push(false);
				actionSet.push({"action": "loadlayer", "args": [sublayer]});
			}
	
			p.hotkeys?.trim().split(" ").forEach((v) => {
				presetHotkeys.hotkeys[hotkeyFromString(v).hotkey()] = actionSet;
			});
			
		});
		return presetHotkeys;
	}



	let presetTimer: number;
	async function loadPreset() {
		if (GetSelectedRect(Selector.SelectingPreset)) {
			cancelPresetSelection();
			return;
		}

		if (!$camPresets || $camPresets.items.length == 0) {
			return;
		}

		let zone = GetSelectedRect(Selector.Presets);
		if (!zone) {
			return;
		}

		let cam = $camPresets.value;

		let presets: CamPresets = {value: "", items: []};
		let cachedPresets = $presetHotkeyCache[cam];
		if (!cachedPresets) {
			let response = await $server.post('/camera/presets/hotkeys', {camera: cam})
			if (response.data.found) {
				presets = response.data.camPresets;
				$presetHotkeyCache[cam] = response.data.camPresets;
			} else {
				$presetHotkeyCache[cam] = {value: cam, items: []}
			}
		} else {
			presets = cachedPresets;
		}

		console.log(presets)
		let newLayer = unpackPresets(presets.items, compileHotkeys(presetBaseKeys, LayerType.PresetsBase));
		addLayer(newLayer);

		presetTimer = setTimeout(() => {
			cancelPresetSelection();
		}, 5000);
	}

	function addLayer(newLayer: Layer) {
		layers.push(newLayer);
		let zone = GetSelectedRect(Selector.Presets);
		if (!zone) {
			return;
		}
		if (newLayer.type == LayerType.PresetsBase) {
			AddSelection(zone, Selector.SelectingPreset);
		} else if (newLayer.type == LayerType.PresetsSub) {
			AddSelection(zone, Selector.SubSelectingPreset);
		}
	}

	const pan = 0;
	const tilt = 1;
	const zoom = 2
	let spinningCam: string;
	let spinValues = [0, 0, 0];
	async function spin(target: number, amount: number) {
		if (!spinningCam) {
			let name: string;
			if ($camPresets && $camPresets.value != "") {
				name = $camPresets.value;
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

		sendCommand({cmd: `!ptzspin ${spinningCam} ${spinValues[pan]} ${spinValues[tilt]} ${spinValues[zoom]}`, reset: false});
		if (spinValues[pan] == 0 && spinValues[tilt] == 0 && spinValues[zoom] == 0) {
			spinningCam = undefined;
		}
	}

	async function resetSpin() {
		if (!spinningCam) {
			let name: string;
			if ($camPresets && $camPresets.value != "") {
				name = $camPresets.value;
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

		sendCommand({cmd: `!ptzspin ${spinningCam} 0 0 0`, reset: false});
		spinValues = [0, 0, 0];
		spinningCam = undefined;
	}

	async function loadAndTestPreset(p: string, send: boolean = true) {
		if (presetTimer) {
			clearTimeout(presetTimer);
		}
		let lastCMD = $commandText;
		await buildCommand("ptzload", false, p);
		if (send && lastCMD == $commandText) {
			sendCommand({cmd: $commandText});
		}
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
				$clickZoom += 5;
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
					$clickZoom -= 5;
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
			enableZone("1");
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
			enableZone("1");
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
			enableZone("1");
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
			enableZone("1");
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

	function openChat(): boolean {
		let offcanvasEl = jQuery("#offcanvas");
		let offcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl[0])
		if (!offcanvas) {
			offcanvas = new bootstrap.Offcanvas('#offcanvas')
		}
		if (!offcanvasEl.hasClass("show")) {
			offcanvas.show();
			return true;
		}
		return false;
	}

	function closeChat(): boolean {
		let offcanvasEl = jQuery("#offcanvas");
		let offcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl[0])
		if (offcanvas && offcanvasEl.hasClass("show")) {
			offcanvas.hide();
			return true;
		}
		return false;
	}

	function clear() {
		if (jQuery("#offcanvas").hasClass("show")) {
			return;
		}
		
		if (GetSelectedRect(Selector.SelectingPreset)) {
			cancelPresetSelection();
			return;
		}
		if ($menuIsOpen) {
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
		if ($camPresets && $camPresets.value != "") {
			name = $camPresets.value;
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
		if ($camPresets && $camPresets.value != "") {
			name = $camPresets.value;
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


	let autosend = true;
	async function buildCommand(command: string, autosend: boolean, ...values: string[]): Promise<string> {
		let name: string;
		if ($camPresets && $camPresets.value != "") {
			name = $camPresets.value;
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

		let cmd = `!${command} ${name} ${values.join(" ")}`
		$commandText = cmd;
		if (autosend) {
			sendCommand({cmd: $commandText});
		}
		ClearStage($stage, [Selector.SelectingPreset, Selector.SubSelectingPreset]);
		return cmd;
	}

	async function loadNextCam(action: string) {
		let name: string;
		if ($camPresets && $camPresets.value != "") {
			name = $camPresets.value;
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

		let swaps: MenuItem = await GetSwaps(name);
		if (!swaps) {
			return;
		}

		if (!swaps.items[0] || swaps.items[0].items) {
			return;
		}

		if (action == "swap") {
			sendCommand({cmd: `!swap ${name} ${swaps.items[0].value}`, reset: false});
			SyncCache(swaps.items[0].value);
		} else if (action == "load") {
			presetsMenu(swaps.items[0].value);
		}
	}


	function swapPosition(target: number, autosend: boolean = false) {
		let sourceZone = GetSelectedRect(Selector.Presets);
		if (!sourceZone) {
			return;
		}
		let targetZone = $zones.findOne(`.${target}`) as Konva.Rect;
		if (!targetZone) {
			return;
		}
		let swaps: number[] = [Number(sourceZone.name()), target]
		
		if (swaps[0] != swaps[1]) {
			swaps.sort(function(a, b){return a - b});
			let cmd = `!swap ${swaps[0]} ${swaps[1]}`;

			if (autosend) {
				sendCommand({cmd: cmd, reset: false})
				return;
			}

			AddSelection(sourceZone, Selector.SwapSource);
			AddSelection(targetZone, Selector.SwapTarget);

			ClearStage($stage, [Selector.SwapSource, Selector.SwapTarget]);
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
			$commandText = cmd;
		}
	}

	function presetsMenu(cam: string = undefined) {
		if ($menuIsOpen) {
			$am.Actions["presetsmenu"].Cancel();
			return;
		}
		let zone = GetSelectedRect(Selector.Presets);
		if (!zone) {
			return;
		}

		// @ts-ignore: presetsmenu can take an extra argument
		$am.Actions["presetsmenu"].Enable({x: zone.x() + (zone.width() / 2), y: zone.y() + (zone.height() / 2)}, cam)
		const pointerUpEvent = new PointerEvent('pointerup', {bubbles: true, cancelable: true, clientX: 0, clientY: 0, button: 2, buttons: 2, pointerId: 1, pointerType: 'mouse', isPrimary: true});
		jQuery('#overlay')[0].dispatchEvent(pointerUpEvent);
	}

	function swapMenu() {
		if ($menuIsOpen) {
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

	function triggerSend() {
		if ($commandText == defaultCMD) {
			loadPreset()
		} else {
			sendCommand({cmd: $commandText});
		}
	}

	function enableZone(slot: string) {
		let z = $zones.findOne(`.${slot}`) as Konva.Rect;
		if (z) {
			$am.Actions["click"].Enable({x: z.x() + (z.width() / 2), y: z.y() + (z.height() / 2)})
		}
	}

	function handleKeyboard(e: KeyboardEvent) {
		if (e.repeat && !(scrollable() && (e.code == "Equal" || e.code == "Minus"))) {
			return;
		}
		let actions = layers[layers.length-1].hotkeys[newHotkey(e).hotkey()];
		if (actions) {
			actions.forEach((action) => {
				let outcome = functions[action.action];
				if (outcome && !(($menuIsOpen && (outcome != swapMenu || outcome != presetsMenu)))) {
					e.preventDefault()
					Promise.resolve().then(() => outcome(...action.args));
				}
			})
		}
	}

	function compileHotkeys(uncompiled: uncompiledLayer, type: LayerType = undefined): Layer {
		if (type == undefined) {
			if (uncompiled.type) {
				type = LayerType[uncompiled.type as keyof typeof LayerType];
				delete uncompiled.type;
			}
		}
		if (type == undefined) {
			type = LayerType.Default;
		}
		let compiled: Layer = {"type": type , "hotkeys": {}};

		Object.entries(uncompiled).forEach(([key, value]) => {
			let values: Actions[] = [];
			value.trim().split(" ").forEach((v) => {
				values.push({"action": v, "args": []})
			})
			key.trim().split(" ").forEach((v) => {
				compiled.hotkeys[hotkeyFromString(v).hotkey()] = values;
			})
		});
		return compiled;
	}

	onMount(() => {
		compiledHotkeys = compileHotkeys(hotkeys);
		layers = [compiledHotkeys]
		window.addEventListener('keydown', handleKeyboard);
	});
</script>

