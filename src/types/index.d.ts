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

interface CamPosition {
	found: boolean;
	cam: string;
	position: number;
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
	color: string;
	rotation: number;
	location: Coordinates;
	target: number;
	previousMenu?: RadialMenu | undefined;
	parts: RadialPart[];
}

interface RadialPart {
	angle: number;
	action: string;
	label: string;
	icon: string;
	color?: string;
	submenu?: RadialMenu | undefined;
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
	name: string;
	position: number;
	cacheHit: boolean;
}
