import type { RadialPart, RadialMenu, Coordinates } from '$types';

export const Transparency = .5;

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


RadialMenus["ptzmove"] = {
	color: `rgba(149, 91, 157, ${Transparency})`, 
	rotation: 22.5 - 135, 
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
	color: `rgba(33, 37, 41, ${Transparency})`, 
	rotation: 45, 
	parts:  [
		{size: 90, action: "iroff", label: "off", icon: "lightbulb-off"},
		{size: 90, action: "back", label: "back", icon: "arrow-bar-left"},
		{size: 90, action: "iron", label: "on", icon: "lightbulb-fill"},
		{size: 90, action: "irauto", label: "auto", icon: "sunrise"},
	]
}

RadialMenus["swap"] = {
	color: `rgba(33, 37, 41, ${Transparency})`, 
	rotation: 45,
	parts: [
		{size: 120, action: "nextswap", label: "swap", icon: "box-arrow-up-right"},
		{size: 60, action: "back", label: "back", icon: "arrow-bar-left"},
		{size: 120, action: "nextload", label: "load", icon: "download"},
		{size: 60, action: "swap", label: "swap", icon: "menu-button-wide"},
	]
}

RadialMenus["main"] = {
	color: `rgba(33, 37, 41, ${Transparency})`, 
	rotation: -90,
	parts:  [
		{size: 120, action: "send", label: "send", icon: "arrow-return-left"},
		{size: 60, action: "submenu", label: "next", icon: "arrow-left-right", submenu: "swap"},
		{size: 60, action: "focus", label: "focus", icon: "eye"},
		{size: 30, action: "submenu", label: "move", icon: "arrows-move", submenu: "ptzmove"},
		{size: 30, action: "submenu", label: "ir", icon: "lightbulb", submenu: "ptzir"},
		{size: 60, action: "reset", label: "reset", icon: "arrow-repeat"},	
	]
}


Object.values(RadialMenus).forEach(menu => {
	setRotations(menu);
});