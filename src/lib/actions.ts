import type { Coordinates } from '$types';

export interface States {
	StageMouseDown: boolean;
	StageMouseUp: boolean;
	StageDragging: boolean;
	ZoneClicked: boolean;
}

export interface Action {
	Name: string;
	State: {
		[key: string]: boolean;
	};
	IsActive: boolean;
	IsAvailable(): boolean;
	Enable(origin: Coordinates): void;
	Cancel(): void;
}

export interface ActionsManager {
	Actions: Action[];
	ActiveAction: Action | null;
}