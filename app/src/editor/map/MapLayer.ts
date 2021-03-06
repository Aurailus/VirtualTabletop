import { Vec2 } from '../util/Vec';
import { Layer } from '../util/Layer';
import { clamp } from '../util/Helpers';
import * as Buffer from '../util/Buffer';

export const LAYER_SERIALIZATION_ORDER: Layer[] = [ 'floor', 'detail', 'wall' ];

/** Index with a adjacent bit field to get the tile index to use for a wall. */
const WALL_FIELD = [
	 4,  4, 17, 17,  4,  4, 17, 17, 18, 18, 34, 13, 18, 18, 34, 13,  7,  7, 33, 33,  7,  7, 12, 12,  9,  9, 36, 35,  9,  9, 37, 10,
	 4,  4, 17, 17,  4,  4, 17, 17, 18, 18, 34, 13, 18, 18, 34, 13,  7,  7, 33, 33,  7,  7, 12, 12,  9,  9, 36, 35,  9,  9, 37, 10,
	 8,  8, 19, 19,  8,  8, 19, 19, 24, 24, 39, 29, 24, 24, 39, 29, 23, 23, 38, 38, 23, 23, 28, 28, 26, 26, 40, 47, 26, 26, 46, 30,
	 8,  8, 19, 19,  8,  8, 19, 19,  3,  3, 49, 11,  3,  3, 49, 11, 23, 23, 38, 38, 23, 23, 28, 28, 25, 25, 45, 31, 25, 25, 22,  5,
	 4,  4, 17, 17,  4,  4, 17, 17, 18, 18, 34, 13, 18, 18, 34, 13,  7,  7, 33, 33,  7,  7, 12, 12,  9,  9, 36, 35,  9,  9, 37, 10,
	 4,  4, 17, 17,  4,  4, 17, 17, 18, 18, 34, 13, 18, 18, 34, 13,  7,  7, 33, 33,  7,  7, 12, 12,  9,  9, 36, 35,  9,  9, 37, 10,
	 8,  8, 19, 19,  8,  8, 19, 19, 24, 24, 39, 29, 24, 24, 39, 29,  2,  2, 48, 48,  2,  2,  0,  0, 27, 27, 44, 32, 27, 27, 20,  6,
	 8,  8, 19, 19,  8,  8, 19, 19,  3,  3, 49, 11,  3,  3, 49, 11,  2,  2, 48, 48,  2,  2,  0,  0,  1,  1, 21, 15,  1,  1, 16, 14
];

/** Index with a adjacent bit field to get the tile index to use for a floor. */
const FLOOR_FIELD = [
	54, 20, 19, 19, 18, 4,  19, 19, 11, 11, 3,  3,  51, 51, 3,  3,  9,  52, 5,  5,  9,  52, 5,  5,  39, 39, 30, 30, 39, 39, 30, 30,
	2,  12, 32, 32, 34, 6,  32, 32, 11, 11, 3,  3,  51, 51, 3,  3,  43, 38, 29, 29, 43, 38, 29, 29, 39, 39, 30, 30, 39, 39, 30, 30,
	1,  41, 17, 17, 40, 46, 17, 17, 21, 21, 8,  8,  45, 45, 8,  8,  23, 47, 26, 26, 23, 47, 26, 26, 48, 48, 49, 49, 48, 48, 49, 49,
	1,  41, 17, 17, 40, 46, 17, 17, 21, 21, 8,  8,  45, 45, 8,  8,  23, 47, 26, 26, 23, 47, 26, 26, 48, 48, 49, 49, 48, 48, 49, 49,
	0,  33, 31, 31, 14, 7,  31, 31, 42, 42, 27, 27, 36, 36, 27, 27, 9,  52, 5,  5,  9,  52, 5,  5,  39, 39, 30, 30, 39, 39, 30, 30,
	22, 15, 28, 28, 16, 37, 28, 28, 42, 42, 27, 27, 36, 36, 27, 27, 43, 38, 29, 29, 43, 38, 29, 29, 39, 39, 30, 30, 39, 39, 30, 30,
	1,  41, 17, 17, 40, 46, 17, 17, 21, 21, 8,  8,  45, 45, 8,  8,  23, 47, 26, 26, 23, 47, 26, 26, 48, 48, 49, 49, 48, 48, 49, 49,
	1,  41, 17, 17, 40, 46, 17, 17, 21, 21, 8,  8,  45, 45, 8,  8,  23, 47, 26, 26, 23, 47, 26, 26, 48, 48, 49, 49, 48, 48, 49, 49
];

type LayerData = { tiles: number[][]; tilesets: number[][] };


/**
 * Represents a layer of a map, including the three 'sub-layers' wall, ground, & detail.
 */

export default class MapLayer {
	name: string = '';

	private onDirty?: (x: number, y: number) => void;
	
	private data: { [ key in Layer ]: LayerData } = {
		wall: { tiles: [], tilesets: [] }, floor: { tiles: [], tilesets: [] }, detail: { tiles: [], tilesets: [] } };

	constructor(public index: number, public size: Vec2) {
		const createLayerData = (startTile: number | (() => number), startTileset: number): LayerData => {
			let layer: LayerData = { tiles: [], tilesets: [] };

			for (let i = 0; i < this.size.y; i++) {
				layer.tiles[i] = [];
				layer.tilesets[i] = [];
				for (let j = 0; j < this.size.x; j++) {
					let tile = typeof(startTile) === 'number' ? startTile : startTile();
					layer.tiles[i][j] = tile;
					layer.tilesets[i][j] = startTileset;
				}
			}

			return layer;
		};

		this.name = 'Layer ' + (index + 1);

		this.data.wall = createLayerData(0, 0);
		this.data.floor = createLayerData(() => Math.floor(Math.random() * 6) + 54, 1);
		this.data.detail = createLayerData(0, 0);
	}

	/**
	 * Convert a 3x3 array of wall states into a numeric value between 0 and 255.
	 *
	 * @param {boolean} walls - The walls
	 */

	static bitsToIndices(walls: boolean[]): number {
		return (
			(+walls[0] << 0) +
			(+walls[1] << 1) +
			(+walls[2] << 2) +
			(+walls[3] << 3) +
			(+walls[5] << 4) +
			(+walls[6] << 5) +
			(+walls[7] << 6) +
			(+walls[8] << 7));
	}


	/**
	 * Returns a tile index for a wall based on it's surrounding walls.
	 *
	 * @param {boolean[]} walls - Surrounding walls boolean array.
	 * @param {number} current - The current wall value.
	 */

	static wall(walls: boolean[], current: number): number {
		if (current === -1) return -1;
		const ind = WALL_FIELD[MapLayer.bitsToIndices(walls)];
		if (ind < 54) return ind;
		return 54 + Math.floor(Math.random() * 6);
	}


	/**
	 * Returns a tile index for a floor based on it's surrounding walls.
	 *
	 * @param {boolean[]} walls - Surrounding walls boolean array.
	 * @param {number} current - The current floor value.
	 */

	static floor(walls: boolean[], current: number): number {
		if (current === -1) return -1;
		const ind = FLOOR_FIELD[MapLayer.bitsToIndices(walls)];
		if (ind < 54) return ind;
		return 54 + Math.floor(Math.random() * 6);
	}


	/**
	 * Returns a tile index for a detail based on it's surrounding details.
	 *
	 * @param {boolean[]} details - Surrounding details boolean array.
	 * @param {number} current - The current floor value.
	 */

	static detail(details: boolean[], current: number): number {
		if (current === -1) return -1;
		const ind = WALL_FIELD[MapLayer.bitsToIndices(details)];
		if (ind < 54) return ind;
		return 54 + Math.floor(Math.random() * 6);
	}


	/**
	 * Assigns an on-dirty function for the layer to update chunks.
	 */

	init(onDirty: (x: number, y: number) => void) {
		this.onDirty = onDirty;
	}
	

	/**
	 * Sets a tile to the tileset provided, automatically smart-tiling as needed.
	 *
	 * @param {Layer} layer - The internal layer to set the tile at.
	 * @param {number} tileset - The tileset to set the tile to.
	 * @param {Vec2} pos - The position to set the tile at.
	 *
	 * @returns {boolean} - True if the tileset was changed, false otherwise.
	 */

	setTile(layer: Layer, tileset: number, pos: Vec2): boolean {
		if (pos.x < 0 || pos.y! < 0 || pos.x >= this.size.x || pos.y >= this.size.y) return false;

		if (this.setTileset(layer, pos, tileset)) {
			this.autoTile(pos);
			return true;
		}

		return false;
	}


	/**
	 * Gets the tileset at the specified position.
	 *
	 * @param layer - The internal layer to get the tileset at.
	 * @param {number} pos - The position to get the tile at.
	 */

	getTile(layer: Layer, pos: Vec2): number {
		return this.data[layer].tilesets[clamp(pos.y, 0, this.size.y - 1)][clamp(pos.x, 0, this.size.x - 1)];
	}


	/**
	 * Gets the current tile index at a position.
	 *
	 * @param {Layer} layer - The internal layer to get the tile index at.
	 * @param {Vec2} pos - The position to get the tile index at.
	 *
	 * @returns {number} - The tile index at the position specified.
	 */

	getTileIndex(layer: Layer, pos: Vec2): number {
		return this.data[layer].tiles[clamp(pos.y, 0, this.size.y - 1)][clamp(pos.x, 0, this.size.x - 1)];
	}


	load(layerData: string) {
		for (const layer of LAYER_SERIALIZATION_ORDER) {
			let numEnd = layerData.indexOf('|');
			let num = Number.parseInt(layerData.substr(0, numEnd), 10);
			
			const tileStr = layerData.slice(numEnd + 1, numEnd + 1 + num);
			const tileBuff = Buffer.deserialize(tileStr);
			const tileArr = new Uint16Array(tileBuff);

			layerData = layerData.substr(numEnd + num + 1);

			numEnd = layerData.indexOf('|');
			num = Number.parseInt(layerData.substr(0, numEnd), 10);

			const tileIndStr = layerData.slice(numEnd + 1, numEnd + 1 + num);
			const tileIndBuff = Buffer.deserialize(tileIndStr);
			const tileIndArr = new Uint8Array(tileIndBuff);

			layerData = layerData.substr(numEnd + num + 1);

			for (let i = 0; i < tileArr.length; i++) {
				const x = i % this.size.x;
				const y = Math.floor(i / this.size.x);
				this.setTileset(layer, new Vec2(x, y), tileArr[i]);
				this.setTileIndex(layer, new Vec2(x, y), tileIndArr[i]);
			}
		}
	}


	/**
	 * Sets a tile to the one provided.
	 *
	 * @param {Layer} layer - The layer to set the tileset at.
	 * @param {Vec2} x - The position to set the tileset at.
	 * @param {number} tile - The tileset to set.
	 *
	 * @returns {boolean} - True if the tileset was changed, false otherwise.
	 */

	private setTileset(layer: Layer, pos: Vec2, tile: number): boolean {
		const oldTileset = this.getTile(layer, pos);
		if (oldTileset === tile!) return false;

		this.data[layer].tilesets[pos.y][pos.x] = tile!;
		return true;
	}


	/**
	 * Sets the tile at the specified position to the index provided.
	 */

	private setTileIndex(layer: Layer, pos: Vec2, index: number): void {
		this.data[layer].tiles[pos.y][pos.x] = index;
		if (this.onDirty) this.onDirty(pos.x, pos.y);
	}


	/**
	 * Automatically updates the tile indexes surrounding a position.
	 *
	 * @param {number} pos - The position to update around.
	 */

	private autoTile(pos: Vec2): void {
		for (let i = clamp(pos.x - 1, this.size.x - 1, 0); i <= clamp(pos.x + 1, this.size.x - 1, 0); i++) {
			for (let j = clamp(pos.y - 1, this.size.y - 1, 0); j <= clamp(pos.y + 1, this.size.y - 1, 0); j++) {
				const pos = new Vec2(i, j);
				const solids = this.getTilesAround('wall', pos).map(i => i !== 0);

				const wall = MapLayer.wall(solids, this.getTileIndex('wall', pos));
				if (wall !== -1) this.setTileIndex('wall', pos, wall);

				const floor = MapLayer.floor(solids, this.getTileIndex('floor', pos));
				if (floor !== -1) this.setTileIndex('floor', pos, floor);

				const detail = MapLayer.detail(this.getTilesAround('detail', pos).map(i => i !== 0), 0);
				if (detail !== -1) this.setTileIndex('detail', pos, detail);
			}
		}
	}


	/**
	 * Gets the 9 tiles in a 3x3 grid around the position specified.
	 *
	 * @param {Layer} layer - The internal layer to get the tileset at.
	 * @param {Vec2} pos - The position to get the tiles around.
	 *
	 * @returns {number[]} a nine-element long array of the tiles around.
	 */

	private getTilesAround(layer: Layer, pos: Vec2): number[] {
		let tilesets: number[] = [];
		for (let i = -1; i <= 1; i++)
			for (let j = -1; j <= 1; j++)
				tilesets.push(this.getTile(layer, new Vec2(clamp(pos.x + j, 0, this.size.x - 1),
					clamp(pos.y + i, 0, this.size.y - 1))));
		return tilesets;
	}
}
