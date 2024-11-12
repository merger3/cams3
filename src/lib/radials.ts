import type { RadialPart, RadialMenu, Coordinates } from '$types';

export const Transparency = .75;
export const DefaultColor = `rgba(21, 21, 21, ${Transparency})`;
export let RadialMenus: {
	[key: string]: RadialMenu;
} = {};

function setRotations(menu: RadialMenu) {
	const totalSize = menu.parts.reduce((sum, part) => sum + part.size, 0);
	const segmentSize = (360 / totalSize);
	let segments = 0, i = 0;

	while (segments < totalSize && i < menu.parts.length) {
		let part = menu.parts[i];
		if (part.size > 0) {
			part.color = !part.color ? menu.color : part.color;
			part.rotation = (segments * segmentSize) + menu.rotation;
			part.size = Math.min(part.size, totalSize - segments);
			part.angle = part.size * segmentSize;
			segments += part.size;
		}
		i++;
	}
}

RadialMenus["misc"] =  {
	rotation: 102, 
	parts:  [
		{size: 1, action: "submenu", label: "IR", icon: "lightbulb", submenu: "ptzir"},
		{size: 1, action: "back", label: "back", icon: "arrow-bar-left"},
		{size: 1, action: "submenu", label: "move", icon: "arrows-move", submenu: "ptzmove"},
		{size: 2, action: "presets", label: "presets", icon: "bullseye"},
		{size: 2, action: "select", label: "select", icon: "square"},
	]
}

RadialMenus["ptzmove"] = {
	color: `rgba(149, 91, 157, ${Transparency})`, 
	rotation: -112.5, 
	parts: [
		{size: 1, action: "up", label: "up", icon: "arrow-up"},
		{size: 1, action: "upright", label: "upright", icon: "arrow-up-right"},
		{size: 1, action: "right", label: "right", icon: "arrow-right"},
		{size: 1, action: "downright", label: "downright", icon: "arrow-down-right"},
		{size: 1, action: "down", label: "down", icon: "arrow-down"},
		{size: 1, action: "downleft", label: "downleft", icon: "arrow-down-left"},
		{size: 1, action: "left", label: "left", icon: "arrow-left"},
		{size: 1, action: "upleft", label: "upleft", icon: "arrow-up-left"},
	]
}

RadialMenus["ptzir"] =  {
	rotation: 45, 
	parts:  [
		{size: 90, action: "iroff", label: "off", icon: "lightbulb-off"},
		{size: 90, action: "back", label: "back", icon: "arrow-bar-left"},
		{size: 90, action: "iron", label: "on", icon: "lightbulb-fill"},
		{size: 90, action: "irauto", label: "auto", icon: "sunrise"},
	]
}

RadialMenus["swap"] = {
	rotation: 30,
	parts: [
		{size: 2, action: "nextswap", label: "swap", icon: "box-arrow-up-right"},
		{size: 1, action: "back", label: "back", icon: "arrow-bar-left"},
		{size: 2, action: "nextload", label: "load", icon: "download"},
		{size: 1, action: "swap", label: "swap", icon: "menu-button-wide"},
	]
}

RadialMenus["main"] = {
	rotation: -38.5,
	parts: [
		{size: 1.5, action: "send", label: "send", icon: "arrow-return-left"},
		{size: 1, action: "submenu", label: "next", icon: "arrow-left-right", submenu: "swap"},
		{size: 1, action: "reset", label: "reset", icon: "arrow-repeat"},
		{size: 1.5, action: "clear", label: "clear", icon: "recycle"},
		{size: 1, action: "submenu", label: "misc", icon: "list", submenu: "misc"},
		{size: 1, action: "focus", label: "focus", icon: "eye"},
	]
}


Object.entries(RadialMenus).forEach(([name, menu]) => {
	menu.name = name;
	menu.color = !menu.color ? DefaultColor : menu.color;
	menu.rotation = !menu.rotation ? 0 : menu.rotation;
	setRotations(menu);
});