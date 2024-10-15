import type { Coordinates } from '$types';

const VideoWidth = 1920;
const VideoHeight = 1080;

interface Geom {
	X: number;
	Y: number;
	Width: number;
	Height: number;
	FrameWidth: number;
	FrameHeight: number;
}

interface Measurements {
	Width: number;
	Height: number;
}

function IsPoint(r: Geom): boolean {
	return (r.Width == 0 && r.Height == 0);
}

function  IsLine(r: Geom): boolean {
	return (r.Width == 0 || r.Height == 0);
}

function GetTopLeft(r: Geom): Coordinates {
	return {x: r.X, y: r.Y}
}

function GetMidpoint(r: Geom): Coordinates {
	if (IsPoint(r)) {
		return GetTopLeft(r);
	}

	let xMid = r.X + (r.Width / 2)
	let yMid = r.Y + (r.Height / 2)

	return {x: xMid, y: yMid}
}

function GetMeasurements(r: Geom): Measurements {
	return {Width: r.Width, Height: r.Height};
}

function GetScaledCoordinates(r: Geom, coords: Coordinates): Coordinates {
	let scaleX = r.FrameWidth / VideoWidth;
	let scaleY = r.FrameHeight / VideoHeight;

	let x = coords.x / scaleX;
	let y = coords.y / scaleY;

	return {x: x, y: y};
}

function  GetScaledMeasurments(r: Geom, measurements: Measurements): Measurements {
	let scaleX = r.FrameWidth / VideoWidth
	let scaleY = r.FrameHeight / VideoHeight

	let w = measurements.Width / scaleX
	let h = measurements.Height / scaleY

	return {Width: w, Height: h}
}


export function ClickTangle(rect: Geom) {
	let point = GetScaledCoordinates(rect, GetMidpoint(rect))

	let intX = Math.min(Math.round(point.x), VideoWidth)
	let intY = Math.min(Math.round(point.y), VideoHeight)

	let command = `!ptzclick ${intX} ${intY} 100`

	return {x: intX.toString(), y: intY.toString(), command: command};
}

export function DrawTangle(rect: Geom) {
	let point = GetScaledCoordinates(rect, GetTopLeft(rect))
	let measurements = GetScaledMeasurments(rect, GetMeasurements(rect))

	let intX = Math.min(Math.round(point.x), VideoWidth)
	let intY = Math.min(Math.round(point.y), VideoHeight)

	let intW = Math.round(measurements.Width)
	let intH = Math.round(measurements.Height)

	let command = `!ptzdraw ${intX} ${intY} ${intW} ${intH}`
	
	return {x: intX.toString(), y: intY.toString(), command: command};
}