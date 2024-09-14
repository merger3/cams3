<script lang="ts">
	import { Arc, Group, Shape, Text, TextPath } from "svelte-konva";
	import Konva from "konva";
	import { createEventDispatcher, onMount, tick } from 'svelte';
	import type { RadialPart, RadialMenu } from '$types';

	
	const dispatch = createEventDispatcher();
	const buttonHandlers: {[key: string]: any} = {"send": send, "swap": nop, "load": nop, "reset": nop, "focus": nop, "pan": nop, "tilt": nop, "zoom": nop, "back": nop};
	const buttonIcons: {[key: string]: string} = {"send": "arrow-return-left", "swap": "arrow-left-right", "load": "upload", "reset": "arrow-repeat", "move": "arrows-move", "pan": "bezier", "tilt": "bezier", "zoom": "bezier", "back": "bezier"};

	export let stage: Konva.Stage;
	export let menuDefintion: RadialMenu = {partsCount: 0, color: "grey", rotationOffset: 0, functionBindings: [], location: {x: 0, y: 0}, previousMenu: null, subMenus: {}};
	let color: string = 'gray';
	function builder(defintion: RadialMenu): RadialPart[] {
		color = defintion.color;
		
		let radialParts: RadialPart[] = [];
		var angle: number = 360 / defintion.partsCount;
		var rotation: number = 0;
		for (let i = 1; i < defintion.partsCount + 1; i++) {
			radialParts.push({x: defintion.location.x, y: defintion.location.y, angle: angle, rotation: rotation + defintion.rotationOffset, action: defintion.functionBindings[i - 1], submenu: defintion.subMenus[defintion.functionBindings[i - 1]]});
			rotation = i * angle; 
		}
		
		return radialParts;
	}

	function getFunctionFromName(name: string) {
		let func = buttonHandlers[name] ? buttonHandlers[name] : nop;
    	return func;
	}

	let radials: Konva.Group;
	export function redefine(definition: RadialMenu) {
		
		menuDefintion = definition;
	}
	
	export function addHandlers() {
		stage.on("pointerup", function () {
			menuDefintion.partsCount = 0;
			jQuery('.movedown').css('z-index', '');
			stage.off("pointerup");
      	});
	}
	
	let labelConfig = {
		x: 0,
		y: 0,
		width: 200,
		text: "",
		fontSize: 2 * parseFloat(getComputedStyle(document.documentElement).fontSize),
		padding: 5,
		fill: "white",
		stroke: 'black',
		strokeWidth: 1,
		align: 'center'
	}

	
	let label: Konva.Text;
	let hoverTimeout: number;
	function highlightRadial(e: CustomEvent, name: string, submenu: RadialMenu | null) {
		console.log(e.detail.target);
		console.log(e.detail.target.offsetX());
		
		(e.detail.target as Konva.Shape).fill("rgba(92, 150, 255, 0.15)")
		let hoveredElementPos = e.detail.target.getPosition();
		label.position({x: hoveredElementPos.x, y: hoveredElementPos.y});
		label.offsetX(label.width() / 2);
		label.offsetY(label.height() / 2);
		label.text(e.detail.target.name());
		label.show();

		if (name == "back") {
			hoverTimeout = setTimeout(() => {
				loadPreviousMenu();
			}, 500);
		} else if (submenu) {
			hoverTimeout = setTimeout(() => {
				loadSubmenu(submenu);
			}, 500);
		}
	}
	
	function unhighlightRadial(e: CustomEvent) {
		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
		}
		(e.detail.target as Konva.Shape).fill(color);
		label.hide();
	}

	function nop() {
		console.log("calling function");
		label.hide();
	};

	function loadSubmenu(submenu: RadialMenu) {
		console.log("Loading submenu");
		submenu.location = {x: menuDefintion.location.x, y: menuDefintion.location.y};
		// let mousePos = stage.getPointerPosition();
		// if (mousePos) {
		// 	submenu.location = {x: mousePos.x, y: mousePos.y};
		// } else {
		// }

		submenu.previousMenu = menuDefintion;
		label.hide();

		redefine(submenu);
	};

	function loadPreviousMenu() {
		console.log("Going back to previous menu");
		if (menuDefintion.previousMenu) {
			// let mousePos = stage.getPointerPosition();
			// if (mousePos) {
			// 	menuDefintion.previousMenu.location = {x: mousePos.x, y: mousePos.y};
			// }
			label.hide();
			redefine(menuDefintion.previousMenu);
		} else {
			alert("Should not have gotten here!");
		}
	}
	

	function send() {
		dispatch("sendcmd");
		label.hide();
	}

	onMount(async () => {
		await tick();
 	});

	function arcCustomHitbox(context: Konva.Context, shape: any) {
		var arc = shape as Konva.Arc;
		var angle = Konva.getAngle(arc.angle()),
		clockwise = arc.clockwise();

		context.beginPath();
		context.arc(0, 0, arc.outerRadius() * 1.75, 0, angle, clockwise);
		context.arc(0, 0, arc.innerRadius() * .8, angle, 0, !clockwise);
		context.closePath();
		context.fillStrokeShape(arc);
	}

	// window.addEventListener('keydown', function (e) {
    //     if (e.code == "Space") {
	// 		var node = stage.findOne('#mainlayer') as Konva.Layer;
	// 		node!.toggleHitCanvas();
	// 		e.preventDefault();
    //     } 
    //   });
	function polar2xy(r: number, theta: number) {
		theta = theta * (Math.PI / 180)
		// theta in radians
		if (r===0) {
			return {
				x: 0,
				y: 0,
			}
		}
		return {
			x: r*Math.cos(theta),
			y: r*Math.sin(theta),
		}
	}

</script>

<Group 
	bind:handle={radials}
	config={{
		x: stage.x(),
		y: stage.y(),
	}}
>
	{#each builder(menuDefintion) as r, i}
		<Arc config={{
			x: r.x,
			y: r.y,
			innerRadius: window.innerHeight * .08,
			outerRadius: (window.innerHeight * .08) + (window.innerHeight * .13),
			angle: r.angle,
			fill: color,
			stroke: 'darkgrey',
			strokeWidth: 2,
			rotation: r.rotation,
			name: r.action,
			hitFunc: arcCustomHitbox
		}}
		on:pointerenter={(e) => highlightRadial(e, r.action, r.submenu)}
		on:pointerleave={unhighlightRadial}
		on:pointerup={getFunctionFromName(r.action)}
		/>
		<i class="bi bi-{buttonIcons[r.action]} absolute z-50 pointer-events-none text-3xl" style="left: {polar2xy(((window.innerHeight * .08) + ((window.innerHeight * .08) + (window.innerHeight * .13))) / 2, (r.rotation + (r.rotation + r.angle)) / 2).x + r.x}px; top: {polar2xy(((window.innerHeight * .08) + ((window.innerHeight * .08) + (window.innerHeight * .13))) / 2, (r.rotation + (r.rotation + r.angle)) / 2).y + r.y}px; transform: translate(-50%, -50%)"></i>
	{/each}
	<Text bind:handle={label} config={labelConfig} />
	
</Group>

