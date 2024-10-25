import type { Coordinates } from '$types';

export enum States {
	StagePointerDown,
	StagePointerUp,
	StageDragging,
	StageDraggingBuffered,
	StageDraggingDejittered,
	NodeHit,
	ZoneHit,
	TangleHit,
	NodeScrollHover,
	ZoneScrollHover,
	TangleScrollHover,
	NodeDragHover,
	ZoneDragHover,
	TangleDragHover,
	OnePointer,
	TwoPointers,
	ThreePointers,
	OverThreePointers,
	StageDoubleClick,
	CommandScrollable,
	LeftMouseButtonPressed,
	RightMouseButtonPressed,
	MiddleMouseButtonPressed,
	WheelScrolling,
	WheelScrollUp,
	WheelScrollDown
}

export interface Action {
	Name: string;
	ActiveConditions: Set<States>;
	InactiveConditions: Set<States>;
	MustCancel: string[];
	IsActive: boolean;
	Enable(origin: Coordinates): void;
	Cancel(mod?: any): void;
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