import { Vec2 } from './util/Vec';
import { generateId } from './util/Helpers';

export interface SerializedToken {
	uuid: string;
	sprite: string;
	frame: number;
	x: number;
	y: number;
}

export default class Token extends Phaser.GameObjects.Container {
	sprite: Phaser.GameObjects.Sprite | null = null;
	shadow: Phaser.GameObjects.Sprite | null = null;

	currentFrame: number = 0;

	uuid: string;

	width: number = 0;
	height: number = 0;

	hovered: boolean = false;
	selected: boolean = false;

	constructor(scene: Phaser.Scene, x: number, y: number, tex: string) {
		super(scene, x, y);
		this.setTexture(tex);

		this.uuid = generateId(32);
	}

	static deserialize(scene: Phaser.Scene, serialized: string): Token {
		let tkn = new Token(scene, 0, 0, '');
		tkn.loadSerializedData(serialized);
		return tkn;
	}

	setTexture(tex: string) {
		if (this.shadow != null) this.shadow.setTexture(tex);
		else {
			this.shadow = new Phaser.GameObjects.Sprite(this.scene, -4, -4, tex);
			this.shadow.setOrigin(0, 0);
			this.shadow.setScale(4, 1);
			this.shadow.setTint(0x000000);
			this.shadow.setAlpha(0.1, 0.1, 0.3, 0.3);
			this.list.push(this.shadow);
		}

		this.width = this.shadow.width * 4;
		this.height = this.shadow.height * 4;
		this.shadow.y = this.height - 26;

		if (this.sprite != null) this.sprite.setTexture(tex);
		else {
			this.sprite = new Phaser.GameObjects.Sprite(this.scene, -4, -4, tex);
			this.sprite.setOrigin(0, 0);
			this.sprite.setScale(4, 4);
			this.setPosition(this.x / 4, this.y / 4);
			this.list.push(this.sprite);
		}
	}

	setFrame(frame: number): void {
		this.currentFrame = frame;
		if (!this.sprite || !this.shadow) { console.log('Tried to get the frame count of a Token without a sprite!'); return; }
		this.sprite.setFrame(frame);
		this.shadow.setFrame(frame);
	}

	getFrame(): number {
		return this.currentFrame;
	}

	frameCount(): number {
		if (!this.sprite || !this.shadow) { console.log('Tried to get the frame count of a Token without a sprite!'); return 0; }
		return Object.keys(this.sprite.texture.frames).length - 1;
	}

	setHovered(hovered: boolean) {
		if (!this.sprite) return;
		if (this.hovered === hovered) return;
		this.hovered = hovered;

		if (!hovered && !this.selected) {
			this.sprite.resetPipeline();
			return;
		}

		if (!this.selected) this.sprite.setPipeline('brighten');
	}

	setSelected(selected: boolean) {
		if (!this.sprite) return;
		if (this.selected === selected) return;
		this.selected = selected;

		if (!selected) {
			if (!this.hovered) this.sprite.resetPipeline();
			else this.sprite.setPipeline('brighten');
		}
		else {
			this.sprite.setPipeline('outline');
			// @ts-ignore
			// this.sprite.pipeline.setFloat1('tex_size', this.sprite.texture.source[0].width);
		}
	}

	setPosition(x?: number, y?: number, z?: number, w?: number): this {
		Phaser.GameObjects.Container.prototype.setPosition.call(this, (x || 0) * 4, (y || 0) * 4, z, w);
		return this;
	}

	getPosition(): Vec2 {
		return new Vec2(this.x / 4, this.y / 4);
	}

	// Serialization Methods
	serialize(): string {
		return JSON.stringify(({
			uuid: this.uuid,
			sprite: this.sprite ? this.sprite.texture.key : '',
			frame: this.currentFrame,
			x: this.x / 4,
			y: this.y / 4
		} as SerializedToken));
	}

	loadSerializedData(serialized: string) {
		let tbl: SerializedToken = JSON.parse(serialized);
		this.uuid = tbl.uuid;
		this.setTexture(tbl.sprite);
		this.setFrame(tbl.frame);
		this.setPosition(tbl.x, tbl.y);
	}
}