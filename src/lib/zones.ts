import Konva from "konva";

// This code sucks but I do not care.
// It's sloppy an inefficient but it works on small enough collections that it should never matter.
// The beauty of modern computers is they're fast enough to mostly ignore my dogshit optimization here.

export enum Selector {
	Presets,
	Radial,
	Keyboard,
	SwapSource,
	SwapTarget,
	ContexMenu,
	Focus,
	Zoom,
	SelectingPreset,
	SubSelectingPreset,
	PresetMenu
}

export interface Selection {
	Name: Selector;
	Config: any;
	Rect: Konva.Rect;
}

export interface Zone {
	Name: string;
	Rect: Konva.Rect;
	Selections: Selection[];
}

export function CreateZones(boxGroup: Konva.Group) {
	Zones = [];
	boxGroup.getChildren(function(node){
		return node.getClassName() == "Rect";
	}).forEach(function (node: Konva.Node) {
		Zones.push({Name: node.name(), Rect: node as Konva.Rect, Selections: []})
	});
}

export let Zones: Zone[] = [];
let configs: {[key in Selector]?: any} = {};

configs[Selector.Presets] = {stroke: 'rgba(202, 148, 24, 1)', strokeWidth: 2.5}; // Bolder golden-brown
configs[Selector.SelectingPreset] = {stroke: 'rgba(220, 53, 69, 1)', strokeWidth: 2.5}; // Rich red
configs[Selector.SubSelectingPreset] = {stroke: 'rgba(230, 113, 124, 1)', strokeWidth: 2.5}; // Pink
configs[Selector.PresetMenu] = {stroke: 'rgba(13, 90, 225, 1)', strokeWidth: 2.5}; // Bold blue
configs[Selector.Focus] = {stroke: 'rgba(25, 100, 230, 1)', strokeWidth: 2.5}; // Stronger blue
configs[Selector.Zoom] = {stroke: 'rgba(185, 110, 35, 1)', strokeWidth: 2.5}; // Muted warm amber
configs[Selector.Keyboard] = {stroke: 'rgba(178, 60, 20, 1)', strokeWidth: 2.5}; // Intense brick red
configs[Selector.SwapSource] = {stroke: 'rgba(96, 153, 95, 1)', strokeWidth: 3}; // Strong green
configs[Selector.SwapTarget] = {stroke: 'rgba(150, 92, 151, 1)', strokeWidth: 3}; // Vibrant purple
configs[Selector.ContexMenu] = {stroke: 'rgba(75, 45, 120, 1)', strokeWidth: 3}; // Rich dark purple
configs[Selector.Radial] = {stroke: 'rgba(80, 120, 200, 1)', strokeWidth: 3}; // Standout blue-grey




export function AddSelection(rect: Konva.Rect, config: Selector) {
	let zone = Zones[Number(rect.name()) - 1];
	if (zone == undefined) {
		return;
	}

	RemoveSelection(config);
	let offset = zone.Selections.reduce((sum, selection) => sum + selection.Rect.strokeWidth() + .5, 0) + 2;
	let newSelector = new Konva.Rect({
		x: zone.Rect.x() + offset,
		y: zone.Rect.y() + offset,
		width: zone.Rect.width() - offset * 2,
		height: zone.Rect.height() - offset * 2,
		fill: 'rgba(0, 0, 0, 0)',
		listening: false,
		draggable: false,
		visible: true
	});
	newSelector.setAttrs(configs[config]);

	zone.Selections.push({Name: config, Config: configs[config], Rect: newSelector});
	zone.Rect.getLayer().add(newSelector);
}

export function RemoveSelection(config: Selector): string {
	let zone: Zone;
	Zones.forEach(function (z: Zone) {
		z.Selections.forEach(function (s: Selection) {
			if (s.Name == config) {
				zone = z;
			}
		});
	});
	if (zone == undefined) {
		return "";
	}

	let found = "";
	let oldSelections: Selection[] = [...zone.Selections];
	zone.Selections = [];
	oldSelections.forEach(function (selection: Selection) {
		if (selection.Name != config) {
			AddSelection(zone.Rect, selection.Name);
		} else {
			found = zone.Name;
		}
		selection.Rect.destroy();
	});

	return found;
}

export function RedrawSelections() {
	Zones.forEach(function (z: Zone) {
		let oldSelections: Selection[] = [...z.Selections];
		z.Selections = [];
		oldSelections.forEach(function (selection: Selection) {
			AddSelection(z.Rect, selection.Name);
			selection.Rect.destroy();
		});
	});
}

export function ResetZones() {
	Zones.forEach(function (z: Zone) {
		z.Selections.forEach(function (s: Selection) {
			s.Rect.destroy();
		});
		z.Selections = []
	});
}

export function GetSelectedRect(zone: Selector): Konva.Rect {
	let foundZone = null;
	Zones.forEach(function (z: Zone) {
		z.Selections.forEach(function (s: Selection) {
			if (s.Name == zone) {
				foundZone = z.Rect;
			}
		});
	});
	return foundZone;
}