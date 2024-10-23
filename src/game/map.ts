import { loadTexture } from '@/game/game';
import { serverFetch } from '@/server';

import { Collidable } from './entities/player';

/**
 * Global map loader that creates and stores collision entities for maps from server-side.
 */
export class GameMap {
    private static mapIndex: number = 0;
    static readonly maps: Map<string, GameMap> = new Map();
    static current?: GameMap = undefined;
    private static tileset: GameTileset | undefined;

    readonly index: number;
    readonly width: number;
    readonly height: number;
    readonly collisionGrid: MapCollision[][][];
    readonly flatCollisionGrid: MapCollision[];
    readonly textures: Promise<[ImageBitmap, ImageBitmap]>;

    /**
     * @param json Raw data from server
     * @param name Unique name/ID of map
     */
    constructor(json: any, name: string) {
        const raw = json;
        this.index = GameMap.mapIndex++;
        if (GameMap.tileset === undefined) throw new ReferenceError('Tileset was not loaded before map load');
        this.width = raw.width;
        this.height = raw.height;
        // generate collisions
        this.collisionGrid = Array.from(new Array(this.height), () => Array.from(new Array(this.width), () => new Array()));
        for (const layer of raw.layers) {
            if (layer.width != this.width || layer.height != this.height || layer.data.length != this.width * this.height) throw new RangeError('Mismatched layer size with map size or data length');
            // don't want spawnpoints on client
            if (layer.name != 'Spawns') {
                // loop through every tile in every layer and add collisions
                for (let i = 0; i < layer.data.length; i++) {
                    const tile = layer.data[i] - 1;
                    const x = i % this.width;
                    const y = this.height - ~~(i / this.width) - 1;
                    if (GameMap.tileset.collisionMaps[tile] == undefined) {
                        if (tile >= 0) console.warn(`Tile with no collision map at (${x}, ${y}) - ${tile}`);
                    } else if (GameMap.tileset.collisionMaps[tile].length > 0) {
                        this.collisionGrid[y][x].push(...GameMap.tileset.collisionMaps[tile].map((col) => new MapCollision(col.x + x, col.y + y, col.hw, col.hh, col.fr)));
                    }
                }
            }
        }
        // flatten collisions for debug drawing
        this.flatCollisionGrid = this.collisionGrid.flat().flat();
        // generate textures
        this.textures = new Promise<[ImageBitmap, ImageBitmap]>(async (resolve) => {
            if (GameMap.tileset === undefined) throw new ReferenceError('Tileset was not loaded before map load');
            // create canvas
            const canvas = new OffscreenCanvas(this.width * GameMap.tileset.tileSize, this.height * GameMap.tileset.tileSize);
            const canvas2 = new OffscreenCanvas(canvas.width, canvas.height);
            const ctx = canvas.getContext('2d');
            const ctx2 = canvas2.getContext('2d');
            if (ctx === null || ctx2 === null) throw new TypeError('Map texture generation failed');
            // background is necessary
            ctx.fillStyle = '#FFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // drawing needs to flip map because +y is up here
            const tsize = GameMap.tileset.tileSize + GameMap.tileset.tileSpace;
            const top = GameMap.tileset.tileSize * (this.height - 1);
            const texture = await GameMap.tileset.texture;
            for (const layer of raw.layers) {
                // definitely no spawnpoints in texture
                if (layer.name != 'Spawns') {
                    const above = layer.name.startsWith('A');
                    // loop to add textures
                    for (let i = 0; i < layer.data.length; i++) {
                        const tile = layer.data[i] - 1;
                        if (tile >= 0) {
                            const x = (i % this.width) * GameMap.tileset.tileSize;
                            const y = top - (this.height - ~~(i / this.width) - 1) * GameMap.tileset.tileSize;
                            const tx = (tile % GameMap.tileset.tileColumns) * tsize + GameMap.tileset.tileMargin;
                            const ty = ~~(tile / GameMap.tileset.tileColumns) * tsize + GameMap.tileset.tileMargin;
                            (above ? ctx2 : ctx).drawImage(texture, tx, ty, GameMap.tileset.tileSize, GameMap.tileset.tileSize, x, y, GameMap.tileset.tileSize, GameMap.tileset.tileSize);
                        }
                    }
                }
            }
            resolve([await createImageBitmap(canvas), await createImageBitmap(canvas2)]);
        });
        GameMap.maps.set(name, this);
    }

    /**
     * Clears map list and regenerates tileset and maps from file.
     */
    static async reloadMaps() {
        const [tilesetJson, mapsJson] = await Promise.all([
            serverFetch('/resources/tileset.json').then((res) => res.json()),
            serverFetch('/resources/mapList').then((res) => res.text()).then((maps) => Promise.all(maps.split(', ').map(async (map) => [map, await (await serverFetch('/resources/maps/' + map)).json()])))
        ]);
        this.maps.clear();
        this.mapIndex = 0;
        this.tileset = new GameTileset(tilesetJson);
        for (const [name, json] of mapsJson) new GameMap(json, name.replace('.json', ''));
        await Promise.all(Array.from(this.maps.values(), (map) => map.textures));
    }
}

/**
 * Stores tileset data for maps, including collision templates.
 */
export class GameTileset {
    readonly collisionMaps: { x: number, y: number, hw: number, hh: number, fr: number }[][];
    readonly tileSize: number;
    readonly tileColumns: number;
    readonly tileMargin: number;
    readonly tileSpace: number;
    readonly texture: Promise<ImageBitmap>;

    /**
     * @param json Raw data from server
     */
    constructor(json: any) {
        const raw = json;
        if (raw.tilewidth != raw.tileheight) throw new RangeError('Non-square tiles in tileset');
        // fetch texture
        this.tileSize = raw.tilewidth;
        this.tileColumns = raw.columns;
        this.tileMargin = raw.margin;
        this.tileSpace = raw.spacing;
        this.texture = loadTexture('tileset.png');
        // convert collision rectangles to collidables for entity collision
        this.collisionMaps = Array.from(new Array(raw.tilecount), () => new Array());
        for (const tile of raw.tiles) {
            if (tile.objectgroup == undefined) continue;
            const collisions = this.collisionMaps[tile.id];
            for (const col of tile.objectgroup.objects) {
                const hw = col.width / this.tileSize / 2;
                const hh = col.height / this.tileSize / 2;
                const friction = col.properties?.find((prop: any) => prop.name == 'friction')?.value;
                if (typeof friction != 'number') throw new TypeError('Invalid or missing friction coefficient for tile ' + tile.id);
                collisions.push({ x: col.x / this.tileSize + hw, y: 1 - (col.y / this.tileSize + hh), hw: hw, hh: hh, fr: friction });
            }
        }
    }
}

export class MapCollision extends Collidable {
    readonly friction: number;
    /**Absolute coordinates of axis-aligned rectangular bounding box - left/right are X, top/bottom are Y */
    declare readonly boundingBox: Collidable['boundingBox'];
    constructor(x: number, y: number, hw: number, hh: number, fr: number) {
        super(x, y, [
            { type: 'line', x: x - hw, y: y + hh },
            { type: 'line', x: x + hw, y: y + hh },
            { type: 'line', x: x + hw, y: y - hh },
            { type: 'line', x: x - hw, y: y - hh }
        ], '#E00');
        this.friction = fr;
    }
}

export default GameMap;