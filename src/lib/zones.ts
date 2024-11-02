import Konva from "konva";

// This code sucks but I do not care.
// It's sloppy an inefficient but it works on small enough collections that it should never matter.
// The beauty of modern computers is they're fast enough to mostly ignore my dogshit optimization here.

export enum Zones {
	Presets,
	Radial,
	Keyboard,
	SwapSource,
	SwapTarget
}

export interface Selection {
	Name: Zones;
	Config: any;
	Rect: Konva.Rect;
}

export interface Zone {
	Name: string;
	Rect: Konva.Rect;
	Selections: Selection[];
}

export function CreateZones(boxGroup: Konva.Group) {
	zones = [];
	boxGroup.getChildren(function(node){
		return node.getClassName() == "Rect";
	}).forEach(function (node: Konva.Node) {
		zones.push({Name: node.name(), Rect: node as Konva.Rect, Selections: []})
	});
}

let zones: Zone[] = [];
let configs: {[key in Zones]?: any} = {};

configs[Zones.Presets] = {stroke: 'rgba(186, 137, 14, 1)', strokeWidth: 2.5};
configs[Zones.Radial] = {stroke: 'rgba(13, 110, 253, 1)', strokeWidth: 2.5};
configs[Zones.Keyboard] = {stroke: 'rgba(136, 48, 10, 1)', strokeWidth: 2.5};
configs[Zones.SwapSource] = {stroke: 'rgba(171, 119, 172, 1)', strokeWidth: 2.5};
configs[Zones.SwapTarget] = {stroke: 'rgba(121, 173, 120, 1)', strokeWidth: 2.5};

export function AddSelection(rect: Konva.Rect, config: Zones) {
	let zone = zones[Number(rect.name()) - 1];
	if (zone == undefined) {
		return;
	}
	RemoveSelection(config);
	let offset = zone.Selections.reduce((sum, selection) => sum + selection.Rect.strokeWidth() + 1, 0);
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
	newSelector.setAttrs(configs[config].Attributes);

	zone.Selections.push({Name: config, Config: configs[config], Rect: newSelector});
	zone.Rect.getLayer().add(newSelector);
}

export function RemoveSelection(config: Zones): string {
	let zone: Zone;
	zones.forEach(function (z: Zone) {
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
	zones.forEach(function (z: Zone) {
		let oldSelections: Selection[] = [...z.Selections];
		z.Selections = [];
		oldSelections.forEach(function (selection: Selection) {
			AddSelection(z.Rect, selection.Name);
			selection.Rect.destroy();
		});
	});
}

export function ResetZones() {
	zones.forEach(function (z: Zone) {
		z.Selections.forEach(function (s: Selection) {
			s.Rect.destroy();
		});
		z.Selections = []
	});
}