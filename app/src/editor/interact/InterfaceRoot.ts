import Component from './components/Component';

import Toolbar from './components/Toolbar';
import TokenCards from './components/TokenCards';
import TileSidebar from './components/TileSidebar';
import LayerManager from './components/LayerManager';
import TokenSidebar from './components/TokenSidebar';
import SidebarToggler from './components/SidebarToggler';

import Map from '../map/Map';
import ModeMananger from '../mode/ModeManager';
import { DrawModeKey } from '../mode/DrawMode';
import { TokenModeKey } from '../mode/TokenMode';
import InputManager from '../interact/InputManager';
import ActionManager from '../action/ActionManager';
import { ArchitectModeKey } from '../mode/ArchitectMode';

import { Asset } from '../../../../common/DBStructs';

const UI_OFFSET = -10000;
const CLOSED_SIDEBAR_OFFSET = -68;

export default class InterfaceRoot {
	sidebarOpen: boolean = true;

	private scene: Phaser.Scene = null as any;

	private lastMode: string = '';

	private mode: ModeMananger = null as any;
	// private actions: ActionManager = null as any;
	private inputManager: InputManager = null as any;
	private camera: Phaser.Cameras.Scene2D.Camera = null as any;

	private root: Phaser.GameObjects.Container = null as any;
	private leftRoot: Phaser.GameObjects.Container = null as any;
	// private rightRoot: Phaser.GameObjects.Container = null as any;
	
	private tileSidebar: TileSidebar | null = null;
	private tokenSidebar: TokenSidebar | null = null;

	init(scene: Phaser.Scene, input: InputManager, mode: ModeMananger,
		actions: ActionManager, map: Map, assets: Asset[]) {
		
		this.mode = mode;
		this.scene = scene;
		this.inputManager = input;

		this.camera = this.scene.cameras.add(0, 0, undefined, undefined, undefined, 'ui_camera');
		this.camera.scrollX = UI_OFFSET;
		this.camera.setOrigin(0);
		this.camera.setZoom(3);

		this.root = this.scene.add.container(UI_OFFSET, 0);
		this.root.setName('root');
		this.leftRoot = this.scene.add.container(CLOSED_SIDEBAR_OFFSET, 0);
		this.root.add(this.leftRoot);
		
		this.leftRoot.add(new SidebarToggler(scene, 49, 1000, input, this));

		this.tokenSidebar = new TokenSidebar(scene, 0, 0, assets, input, mode);
		this.leftRoot.add(this.tokenSidebar);

		this.tileSidebar = new TileSidebar(scene, 0, 0, assets, input, mode, map);
		this.leftRoot.add(this.tileSidebar);

		this.root.add(new TokenCards(scene, { map, assets }));
		this.root.add(new LayerManager(scene, { map }));
		
		this.root.add(new Toolbar(scene, { mode, actions }));
	}

	update() {
		function testActive(component: Phaser.GameObjects.GameObject) {
			if ((component as Component).mouseCollides?.()) return true;
			else if ((component as Phaser.GameObjects.Container).list)
				for (let c of (component as Phaser.GameObjects.Container).list)
					if (testActive(c)) return true;

			return false;
		}
		
		function update(component: Phaser.GameObjects.GameObject) {
			component.update();
			if ((component as Phaser.GameObjects.Container).list)
				for (let c of (component as Phaser.GameObjects.Container).list) update(c);
		}

		let uiHovered = testActive(this.root);
		this.inputManager.setContext(uiHovered ? 'interface' : 'map');

		if (this.inputManager.keyPressed('TAB')) {
			const modes = this.mode.getModes();
			const currentInd = (modes.indexOf(this.mode.getActive()) + 1) % modes.length;
			this.mode.activate(modes[currentInd]);
		}

		if (this.lastMode !== this.mode.getActive()) {
			this.lastMode = this.mode.getActive();
			switch (this.lastMode) {
			default:
				this.setSidebarOpen(false);
				break;

			case ArchitectModeKey:
				this.displayArchitectMode();
				this.hideTokenMode();
				break;
			
			case TokenModeKey:
				this.hideArchitectMode();
				this.displayTokenMode();
				break;
			}
		}

		update(this.root);
	}

	setVisible(visible: boolean) {
		this.root.setVisible(visible);
	}

	setSidebarOpen(open: boolean) {
		this.scene.tweens.add({
			targets: this.leftRoot,
			ease: 'Cubic',
			duration: 225,
			repeat: 0,
			
			x: (open ? 0 : CLOSED_SIDEBAR_OFFSET)
		});
	}

	private displayArchitectMode() {
		if (!this.tileSidebar) return;
		setTimeout(() => this.leftRoot.bringToTop(this.tileSidebar!), 16);
		this.setSidebarOpen(true);
		this.scene.tweens.add({
			targets: this.tileSidebar,
			ease: 'Cubic',
			duration: 0,

			alpha: { from: 0, to: 1 }
		});
	}

	private hideArchitectMode() {
		if (!this.tileSidebar) return;
	}

	private displayTokenMode() {
		if (!this.tokenSidebar) return;
		this.setSidebarOpen(true);
		setTimeout(() => this.leftRoot.bringToTop(this.tokenSidebar!), 16);
		this.scene.tweens.add({
			targets: this.tokenSidebar,
			ease: 'Cubic',
			duration: 0,

			alpha: { from: 0, to: 1 }
		});
	}

	private hideTokenMode() {
		if (!this.tokenSidebar) return;
	}
}
