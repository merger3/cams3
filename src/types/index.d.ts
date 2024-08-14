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