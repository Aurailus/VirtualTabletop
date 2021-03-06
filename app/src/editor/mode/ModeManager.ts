import type * as Phaser from 'phaser';
import * as IO from 'socket.io-client';

import type Mode from './Mode';
import type Map from '../map/Map';
import EventHandler from '../EventHandler';
import InputManager from '../interact/InputManager';
import ActionManager from '../action/ActionManager';

import DrawMode, { DrawModeKey } from './DrawMode';
import TokenMode, { TokenModeKey } from './TokenMode';
import ArchitectMode, { ArchitectModeKey } from './ArchitectMode';

import { Vec2 } from '../util/Vec';
import { Asset } from '../../../../common/DBStructs';

export interface ModeSwitchEvent {
	from: string;
	to: string;
}

/**
 * Manages initializing and toggling editor modes.
 */

export default class ModeManager {
	active: Mode | undefined;

	private modeStr: string = '';
	private modes: { [mode: string]: Mode } = {};

	private evtHandler = new EventHandler<ModeSwitchEvent>();

	init(scene: Phaser.Scene, state: 'owner' | 'player',
		map: Map, socket: IO.Socket, actions: ActionManager, assets: Asset[]) {
		
		if (state === 'owner') this.modes[ArchitectModeKey] = new ArchitectMode(scene, map, socket, actions, assets);
		this.modes[TokenModeKey] = new TokenMode(scene, map, socket, actions, assets);
		this.modes[DrawModeKey] = new DrawMode(scene, map, socket, actions, assets);

		this.activate(Object.keys(this.modes)[0]);
	}

	activate(mode: string) {
		this.evtHandler.dispatch({ from: this.modeStr, to: mode });
		this.active?.deactivate();
		this.active = this.modes[mode];
		this.active?.activate();
		this.modeStr = mode;
	}

	getModes(): string[] {
		return Object.keys(this.modes);
	}

	hasMode(mode: string): boolean {
		return this.modes[mode] !== undefined;
	}

	getActive(): string {
		return this.modeStr;
	}

	getActiveInstance(): Mode {
		return this.active!;
	}

	update(cursorPos: Vec2, input: InputManager) {
		this.active?.update(cursorPos, input);
	}

	bind(cb: (evt: ModeSwitchEvent) => boolean | void) {
		this.evtHandler.bind(cb);
	}

	unbind(cb: (evt: ModeSwitchEvent) => boolean | void) {
		this.evtHandler.unbind(cb);
	}
}
