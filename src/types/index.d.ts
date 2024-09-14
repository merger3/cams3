export interface CamList {
    name: string;
    cameras: string[];
}

export interface Config {
    camlist: CamList[];
}

export interface CamPresets {
    name: string;
    presets: string[];
} 

interface Entry {
	label: string;
	subentries: Entry[] | null;
}

interface SwapResponse {
	found: boolean;
	cam: string;
	position: number;
	swaps: Entry | null;
}

interface Coordinates {
	x: number;
	y: number;
}

interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
    zone: number;
}

interface RadialMenu {
	partsCount: number;
	color: string;
	rotationOffset: number;
	functionBindings: string[];
	location: Coordinates;
	subMenus: {[key: string]: RadialMenu};
	previousMenu: RadialMenu | null;
}

interface RadialPart {
	x: number;
	y: number;
	angle: number;
	rotation: number;
	action: string;
	submenu: RadialMenu | null;
}
