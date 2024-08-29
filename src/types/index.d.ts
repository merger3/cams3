export interface CamList {
    name: string;
    cameras: string[];
}

export interface Config {
    camlist: CamList[];
}

export interface CamPresets {
    camName: string;
    presets: string[];
} 

interface Entry {
	label: string;
	subentries: Entry[] | null;
}

interface SwapResponse {
	found: boolean;
	cam: string;
	swaps: Entry | null;
}