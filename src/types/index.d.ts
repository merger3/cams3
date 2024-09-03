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