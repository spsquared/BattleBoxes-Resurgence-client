// main engine, contains general game logic

import { Socket } from 'socket.io-client';
import { ref, watch } from 'vue';

import RenderEngine, { type RenderEngineViewport, TexturedRenderable, CustomRenderable, type RenderEngineMetrics } from '@/game/renderer';
import '@/game/sound';

import { modal } from '@/components/modal';
import { startTransitionTo } from '@/menu/nav';
import { checkConnection, createNamespacedSocket, serverFetch } from '@/server';

import GameMap from './map';
import Entity from './entities/entity';
import Player, { ControlledPlayer, type PlayerTickData } from './entities/player';

const canvasRoot = document.getElementById('canvasRoot');
if (canvasRoot === null) throw new Error('Canvas root was not found');
const canvas = canvasRoot.children[0] instanceof HTMLCanvasElement ? canvasRoot.children[0] : document.createElement('canvas');
canvasRoot.appendChild(canvas);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

export const gameInstance = ref<GameInstance>();

// map below, misc entities, players/bullets, particles, map above, debug, ui
// add particles "webgl" and replace ui 2d with "custom" later
type renderLayers = ['offscreen2d', 'offscreen2d', 'offscreen2d', 'offscreen2d', '2d'];

/**
 * Handles all of the game logic for all of the game. There can only be one!!!
 */
export class GameInstance {
    readonly instanceId = Math.random();

    private renderEngine: RenderEngine<renderLayers> | null = null;
    readonly id: string;
    readonly socket: Socket;
    readonly loadPromise: Promise<void>;
    readonly camera: RenderEngineViewport = {
        x: 0,
        y: 0,
        angle: 0,
        width: window.innerWidth * window.devicePixelRatio,
        height: window.innerHeight * window.devicePixelRatio,
        scale: 64
    };
    private assetsLoaded: boolean = false;
    drawPerfMetrics: boolean = false;

    /**
     * @param id Game ID (namespace)
     * @param authCode Authentication code for connecting to game, supplied when joining
     */
    constructor(id: string, authCode: string) {
        // weird singleton implementation
        if (gameInstance.value !== undefined) throw new Error('Game Instance already exists!');
        this.id = id;
        this.socket = createNamespacedSocket(id, authCode);
        startTransitionTo('game');
        this.loadPromise = this.loadRenderer();
        this.onResize();
        const resizeListener = () => this.onResize();
        window.addEventListener('resize', resizeListener);
        watch(gameInstance, () => {
            if (gameInstance.value?.instanceId !== this.instanceId) {
                window.removeEventListener('resize', resizeListener);
            }
        });
        this.addInputs();
        // socket connection
        this.socket.on('disconnect', async (reason) => {
            await modal.showModal({
                title: 'Disconnected',
                content: reason ?? 'connection lost',
                color: 'red'
            }).result;
            startTransitionTo('menu');
            checkConnection();
            this.destroy();
        });
        this.socket.on('connect_error', async (err) => {
            await modal.showModal({
                title: 'Connection error',
                content: err.message ?? 'connection failed',
                color: 'red'
            }).result;
            checkConnection();
            this.destroy();
        });
        // socket stuff
        this.socket.on('tick', (tick) => this.onTick(tick));
        this.socket.on('initPlayerPhysics', (init: { tick: number, physicsBuffer: number, physicsResolution: number, playerProperties: ControlledPlayer['properties'] }) => {
            ControlledPlayer.physicsTick = init.tick;
            ControlledPlayer.physicsResolution = init.physicsResolution;
            ControlledPlayer.physicsBuffer = init.physicsBuffer;
            ControlledPlayer.baseProperties = init.playerProperties;
        });
        gameInstance.value = this;
        // connect once loading finishes
        this.loadPromise.then(() => this.socket.connect());
    }

    /**
     * Handles resizing of the screen.
     */
    private onResize() {
        this.camera.width = window.innerWidth * window.devicePixelRatio;
        this.camera.height = window.innerHeight * window.devicePixelRatio;
    }

    /**
     * Runs in response to every incoming server tick.
     * @param tick Server tick packet
     */
    private onTick(tick: {
        tick: number
        tps: number
        map: string
        players: PlayerTickData[]
    }) {
        Entity.tick = tick.tick;
        Entity.serverTps = tick.tps;
        GameMap.current = GameMap.maps.get(tick.map);
        Entity.onTick([]);
        Player.onTick(tick.players);
    }

    private addInputs() {
        const onKeyDown = (e: KeyboardEvent) => {
            if (ControlledPlayer.self === undefined) return;
            if (e.target instanceof HTMLElement && e.target.matches('input[type=text], input[type=number], input[type=password], textarea')) {
                if (e.key == 'Escape') e.target.blur();
                return;
            }
            const key = e.key.toLowerCase();
            if ((key != 'i' && key != 'c') || !e.ctrlKey || !e.shiftKey) e.preventDefault();
            switch (key) {
                case keybinds.up: ControlledPlayer.self.inputs.up = true; break;
                case keybinds.down: ControlledPlayer.self.inputs.down = true; break;
                case keybinds.left: ControlledPlayer.self.inputs.left = true; break;
                case keybinds.right: ControlledPlayer.self.inputs.right = true; break;
                case '\\':
                    if (e.ctrlKey) this.overlayRenderer.playerInfo = !this.overlayRenderer.playerInfo;
                    else this.overlayRenderer.detailed = !this.overlayRenderer.detailed;
                    break;
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
            if (ControlledPlayer.self === undefined) return;
            const key = e.key.toLowerCase();
            switch (key) {
                case keybinds.up: ControlledPlayer.self.inputs.up = false; break;
                case keybinds.down: ControlledPlayer.self.inputs.down = false; break;
                case keybinds.left: ControlledPlayer.self.inputs.left = false; break;
                case keybinds.right: ControlledPlayer.self.inputs.right = false; break;
            }

        };
        const onBlur = () => {
            if (ControlledPlayer.self === undefined) return;
            ControlledPlayer.self.inputs.left = false;
            ControlledPlayer.self.inputs.right = false;
            ControlledPlayer.self.inputs.up = false;
            ControlledPlayer.self.inputs.down = false;
        };
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        document.addEventListener('blur', onBlur);
        watch(gameInstance, () => {
            if (gameInstance.value?.instanceId !== this.instanceId) {
                document.removeEventListener('keydown', onKeyDown);
                document.removeEventListener('keyup', onKeyUp);
                document.removeEventListener('blur', onBlur);
            }
        });
    }

    get loaded() {
        return this.assetsLoaded;
    }

    readonly overlayRenderer: UIOverlayRenderer = new UIOverlayRenderer();
    /**
     * Creates a new renderer instance.
     */
    private async loadRenderer(): Promise<void> {
        await GameMap.reloadMaps();
        this.renderEngine = new RenderEngine<renderLayers>(canvas, [
            // map below
            {
                type: 'offscreen2d',
                canvas: 1,
                target: 1,
                textures: await Promise.all(Array.from(GameMap.maps.values()).sort((a, b) => a.index - b.index).map(async (map) => (await map.textures)[0])),
                smoothing: false
            },
            // misc. entities
            {
                type: 'offscreen2d',
                canvas: 1,
                target: 1,
                textures: []
            },
            // players/bullets
            {
                type: 'offscreen2d',
                canvas: 1,
                target: 1,
                textures: []
            },
            // particles
            // {
            //     type: 'webgl',
            //     canvas: 1,
            //     target: 0,
            //     textures: [],
            //     clear: true
            // },
            // map above, debug
            {
                type: 'offscreen2d',
                canvas: 1,
                target: 0,
                textures: await Promise.all(Array.from(GameMap.maps.values()).sort((a, b) => a.index - b.index).map(async (map) => (await map.textures)[1])),
                smoothing: false
            },
            // ui (replace with "custom" later)
            {
                type: '2d',
                canvas: 0,
                target: 0,
                textures: []
            }
        ]);
        this.renderEngine.onBeforeFrame(() => this.beforeDraw());
        this.assetsLoaded = true;
    }

    /**
     * Runs before every frame to update the rendering pipe.
     */
    private async beforeDraw(): Promise<void> {
        if (this.renderEngine == undefined) return;
        // spaghetti metrics
        this.overlayRenderer.metrics = this.renderEngine.metrics;
        if (ControlledPlayer.physicsTick % 20 == 0) {
            const start = performance.now();
            const token = Math.random();
            this.socket.emit('ping', token);
            const response = (t: number) => {
                if (t == token) {
                    this.overlayRenderer.ping = performance.now() - start;
                    this.socket.off('pong', response);
                }
            };
            this.socket.on('pong', response);
        }
        // send to pipeline also lerp
        const t = performance.now();
        if (ControlledPlayer.self !== undefined) {
            ControlledPlayer.self.lerp(t);
            this.camera.x = -ControlledPlayer.self.x;
            this.camera.y = -ControlledPlayer.self.y;
            this.camera.angle = -ControlledPlayer.self.angle;
        }
        this.renderEngine.sendFrame(this.camera, [
            // map below
            [new TexturedRenderable({
                x: (GameMap.current?.width ?? 0) * 0.5,
                y: (GameMap.current?.height ?? 0) * 0.5,
                width: GameMap.current?.width ?? 0,
                height: GameMap.current?.height ?? 0,
                cropx: (await GameMap.current?.textures)?.at(0)?.width ?? 0,
                cropy: (await GameMap.current?.textures)?.at(0)?.height ?? 0,
                texture: GameMap.current?.index ?? 0
            })],
            // misc entities 
            [],
            // players/bullets
            [...Array.from(Player.list.values())].map((e) => { e.lerp(t); return e; }),
            // particles
            // [],
            // map above, debug
            [new TexturedRenderable({
                x: (GameMap.current?.width ?? 0) * 0.5,
                y: (GameMap.current?.height ?? 0) * 0.5,
                width: GameMap.current?.width ?? 0,
                height: GameMap.current?.height ?? 0,
                cropx: (await GameMap.current?.textures)?.at(0)?.width ?? 0,
                cropy: (await GameMap.current?.textures)?.at(0)?.height ?? 0,
                texture: GameMap.current?.index ?? 0
            }), ...(this.overlayRenderer.playerInfo ? (GameMap.current?.flatCollisionGrid ?? []) : [])],
            // ui
            [this.overlayRenderer]
        ])
    }

    /**
     * Disconnects and closes the game client.
     */
    destroy() {
        this.renderEngine?.stop();
        this.socket.disconnect();
        gameInstance.value = undefined;
        (window as any).gameInstance = undefined;
        Entity.serverTps = 1;
        Entity.tick = 0;
        ControlledPlayer.physicsTick = 0;
        Player.list.clear();
    }
}

/**
 * Loads a texture as an ImageBitmap from game resources on the server.
 * @param src Texture path relative to texture path (`/resources/textures/`)
 * @returns Promise that resolves as bitmap image
 */
export const loadTexture = async (src: string): Promise<ImageBitmap> => {
    return await serverFetch('/resources/textures/' + src).then((res) => res.blob()).then((blob) => createImageBitmap(blob));
};

class UIOverlayRenderer extends CustomRenderable {
    metrics?: RenderEngineMetrics;
    ping: number = 0;
    detailed: boolean = false;
    playerInfo: boolean = false;

    draw(ctx: OffscreenCanvasRenderingContext2D) {
        ctx.font = '14px \'Source Code Pro\'';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.resetTransform();
        if (this.metrics == undefined) {
            ctx.fillStyle = '#0005';
            ctx.fillRect(4, 4, ctx.measureText('No Data').width, 16);
            ctx.fillStyle = '#fff';
            ctx.fillText('No Data', 6, 6);
        } else {
            const lines = [
                `FPS: ${this.metrics.fps} (${Math.round(this.metrics.fpsHistory.avg)} avg; ${this.metrics.fpsHistory.min} min; ${this.metrics.fpsHistory.max} max)`,
                ...(this.detailed ? [
                    'Timings:',
                    `  Total: ${Math.round(this.metrics.timings.total.avg)}ms avg; ${Math.round(this.metrics.timings.total.min)}ms min; ${Math.round(this.metrics.timings.total.max)}ms max`,
                    `  Sort: ${Math.round(this.metrics.timings.sort.avg)}ms avg; ${Math.round(this.metrics.timings.sort.min)}ms min; ${Math.round(this.metrics.timings.sort.max)}ms max`,
                    `  Draw: ${Math.round(this.metrics.timings.draw.avg)}ms avg; ${Math.round(this.metrics.timings.draw.min)}ms min; ${Math.round(this.metrics.timings.draw.max)}ms max`,
                    'Server:',
                    `  TPS: ${Entity.serverTps}`,
                    `  Tick: ${Entity.tick}/${ControlledPlayer.physicsTick}`,
                    `  Ping: ${this.ping.toPrecision(3)}ms`
                ] : [])
            ];
            ctx.fillStyle = '#0005';
            for (let i = 0; i < lines.length; i++) ctx.fillRect(4, i * 16 + 8, ctx.measureText(lines[i]).width + 4, 16);
            ctx.fillStyle = '#fff';
            for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], 6, i * 16 + 10);
        }
        if (this.detailed) {
            ctx.fillStyle = '#0005';
        }
        if (this.playerInfo) {
            ctx.translate(ctx.canvas.width, 0);
            ctx.textAlign = 'right';
            if (ControlledPlayer.self === undefined) {
                const line = 'No Player';
                ctx.fillStyle = '#0005';
                ctx.fillRect(-4, 8, ctx.measureText(line).width + 4, 16);
                ctx.fillStyle = '#fff';
                ctx.fillText(line, -6, 10);
            } else {
                const lines = [
                    `(${ControlledPlayer.self.tx.toFixed(3)}, ${ControlledPlayer.self.ty.toFixed(3)}) S-P`,
                    `(${ControlledPlayer.self.x.toFixed(3)}, ${ControlledPlayer.self.y.toFixed(3)}) POS`,
                    `(${ControlledPlayer.self.vx.toFixed(3)}, ${ControlledPlayer.self.vy.toFixed(3)}) VEL`
                ];
                ctx.fillStyle = '#0005';
                for (let i = 0; i < lines.length; i++) ctx.fillRect(-4, i * 16 + 8, -ctx.measureText(lines[i]).width - 4, 16);
                ctx.fillStyle = '#fff';
                for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], -6, i * 16 + 10);
            }
        }
    }
}

export const keybinds = {
    up: 'w',
    down: 's',
    left: 'a',
    right: 'd'
};

export default gameInstance;

// if (import.meta.env.DEV) {
//     console.info('Development mode enabled, exposing game instances');
//     const existing = (window as any).gameInstance;
//     if (existing != undefined) gameInstance.value = existing;
//     watch(gameInstance, () => {
//         (window as any).gameInstance = gameInstance.value;
//         console.log((window as any).gameInstance)
//     });
//     (window as any).gameInstance = gameInstance.value;
// }