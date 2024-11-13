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

configs[Selector.Presets] = {stroke: 'rgba(186, 137, 14, 1)', strokeWidth: 2.5};
configs[Selector.SelectingPreset] = {stroke: 'rgba(172, 0, 0, 1)', strokeWidth: 2.5};
configs[Selector.PresetMenu] = {stroke: 'rgba(10, 112, 82, 1)', strokeWidth: 2.5};
configs[Selector.Focus] = {stroke: 'rgba(13, 150, 252, 1)', strokeWidth: 2.5};
configs[Selector.Zoom] = {stroke: 'rgba(253, 117, 13, 1)', strokeWidth: 2.5};
configs[Selector.Keyboard] = {stroke: 'rgba(136, 48, 10, 1)', strokeWidth: 2.5};
configs[Selector.SwapSource] = {stroke: 'rgba(121, 173, 120, 1)', strokeWidth: 3};
configs[Selector.SwapTarget] = {stroke: 'rgba(171, 119, 172, 1)', strokeWidth: 3};
configs[Selector.ContexMenu] = {stroke: 'rgba(99, 60, 154, 1)', strokeWidth: 3};
configs[Selector.Radial] = {stroke: 'rgba(153, 153, 153, 1)', strokeWidth: 3};

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