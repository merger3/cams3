import Konva from "konva";

export interface CamList {
    name: string;
    cameras: string[];
}

interface Config {
    camlist: CamList[];
}

interface CamPresets {
    value: string;
    items: any[];
} 

interface ButtonTabs {
	tab: string;
	buttons: ButtonPreset[];
}


interface ButtonPreset {
    value: string;
} 

interface HotkeyPreset {
    value: string;
    hotkeys: string;
	sublayer: HotkeyPreset[];
} 

interface Entry {
	label: string;
	subentries: Entry[];
}

interface SwapResponse {
	found: boolean;
	cam: string;
	items: MenuItem;
}

interface CamPosition {
	found: boolean;
	cam: string;
	position: number;
}

interface MenuItem {
	value: string;
	items: MenuItem[];
}

interface Coordinates {
	x: number;
	y: number;
}

interface Dimensions {
	width: number;
	height: number;
}

interface Point {
	position: Coordinates;
	initialized: boolean;
}

interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
    zone: number;
}

interface RadialMenu {
	name?: string;
	color?: string;
	rotation?: number;
	parts: RadialPart[];
	location?: Coordinates;
	target?: Konva.Rect;
	previousMenu?: RadialMenu;
}

interface RadialPart {
	size: number;
	action: string;
	label: string;
	icon: string;
	color?: string;
	submenu?: string;
	angle?: number;
	rotation?: number;
}

interface CamRequest {
	coordinates: Coordinates;
	frameWidth: number;
	frameHeight: number;
	position: number;
}

interface CamResponse {
	found: boolean;
	cam: string;
	position: number;
	cacheHit: boolean;
}

interface ScrollState {
	cam: string;
	tab: string;
	tabs: {[key: string]: number};
}