import type { Coordinates } from '$types';

export enum States {
	PositiveSentinel,
	NegativeSentinel,

	StagePointerDown,
	StagePointerUp,
	StageDragging,
	StageDraggingBuffered,
	StageDraggingMinimal,
	StageDraggingDejittered,
	NoPointers,
	OnePointer,
	TwoPointers,
	ThreePointers,
	OverThreePointers,
	
	MousePointer,
	TouchPointer,
	PenPointer,

	PointerAdded,
	PointerRemoved,
	StageDoubleClick,
	StagePressed,
	CommandScrollable,
	LeftMouseButtonPressed,
	RightMouseButtonPressed,
	MiddleMouseButtonPressed,
	WheelScrolling,
	WheelScrollUp,
	WheelScrollDown,

	ClickedZone,
	HoveredZone,

	CrossedZones,
	ClickedEmptySpace,
	ClickedListeningShape,
	ClickedTransformer,
	ClickedCircle,
	ClickedTangle,
	DoubleClickedTransformer,
	DoubleClickedCircle,
	DoubleClickedTangle,
	DoubleClickedEmptySpace
}

export interface Action {
	Name: string;
	TriggerConditions: {
		Active: Set<States>;
		Inactive: Set<States>;
	};
	CancelConditions: {
		Active: Set<States>;
		Inactive: Set<States>;
	};
	IsActive: boolean;
	Enable(origin: Coordinates): void;
	Cancel(): void;
}

export interface ActionsManager {
	ActiveStates: Set<States>;
	Actions: {
		[key: string]: Action;
	};
	IsAvailable(actionName: string): boolean;
	ShouldCancel(actionName: string): boolean;
	CheckActions(origin: Coordinates): void;
	CancelAll(): void;
}