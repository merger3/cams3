import type { Coordinates } from '$types';

export enum States {
	StagePointerDown,
	StagePointerUp,
	StageDragging,
	StageDraggingBuffered,
	ZoneHit,
	OnePointer,
	TwoPointers,
	ThreePointers,
	OverThreePointers
}

export interface Action {
	Name: string;
	ActiveConditions: Set<States>;
	InactiveConditions: Set<States>;
	IsActive: boolean;
	Enable(origin: Coordinates): void;
	Cancel(): void;
}

export interface ActionsManager {
	ActiveStates: Set<States>;
	Actions: {
		[key: string]: Action;
	};
	ActiveAction: Action | null;
	IsAvailable(actionName: string): boolean;
	CallAction(actionName: string, origin: Coordinates): void;
	CheckActions(origin: Coordinates): void;
}