class Actions {
	click: boolean;
	draw: boolean;
	drag: boolean;
	touchZoom: boolean;
	touchPan: boolean;
	wheelZoom: boolean;
	wheelPan: boolean;
	radial: boolean;
	doubleClick: boolean;
	rightClick: boolean;

	constructor(state = false) {
		this.click = state;
		this.draw = state;
		this.drag = state;
		this.touchZoom = state;
		this.touchPan = state;
		this.wheelZoom = state;
		this.wheelPan = state;
		this.radial = state;
		this.doubleClick = state;
		this.rightClick = state;
	}
}


class ActionsManager {
	AvailbleActions: Actions;
	EnabledActions: Actions;

	constructor() {
	  this.AvailbleActions = new Actions(true);
	  this.EnabledActions = new Actions(false);
	}

	scale(n: number): void {
		this.x *= n;
		this.y *= n;
	  }
  }

