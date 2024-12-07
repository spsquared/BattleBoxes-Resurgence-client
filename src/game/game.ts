// main engine, contains general game logic

import { Socket } from 'socket.io-client';
import { reactive, ref, watch } from 'vue';

import RenderEngine, { type RenderEngineViewport, TexturedRenderable, CustomRenderable, type RenderEngineMetrics, type LinearPoint, PathRenderable } from '@/game/renderer';
import '@/game/sound';

import { modal } from '@/components/modal';
import transition from '@/menu/nav';
import { checkConnection, createNamespacedSocket, serverFetch } from '@/server';

import GameMap from './map';
import Entity from './entities/entity';
import Player, { ControlledPlayer, type PlayerTickData, type Point } from './entities/player';
import Projectile, { type ProjectileTickData, type ProjectileType } from './entities/projectile';
import LootBox, { type LootBoxTickData } from './entities/lootbox';

const canvasRoot = document.getElementById('canvasRoot');
if (canvasRoot === null) throw new Error('Canvas root was not found');
const canvas = canvasRoot.children[0] instanceof HTMLCanvasElement ? canvasRoot.children[0] : document.createElement('canvas');
canvasRoot.appendChild(canvas);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

export const gameInstance = ref<GameInstance>();

export type Stats = { avg: number, min: number, max: number };

// map below, misc entities, players/bullets, particles, map above, ui
// add 'webgl' layer for particles
type renderLayers = ['2d', '2d', '2d', '2d', 'custom'];

export type GameInfo = {
    readonly id: string
    host: string
    players: number
    maxPlayers: number
    aiPlayers: number
    playersReady: number
    public: boolean
    running: boolean
};

/**
 * Handles all of the game logic for all of the game. There can only be one!!!
 */
export class GameInstance {
    readonly instanceId = Math.random();

    private renderEngine: RenderEngine<renderLayers> | null = null;
    readonly id: string;
    readonly socket: Socket;
    readonly loadPromise: Promise<void>;
    private leaveReason?: string = undefined;
    private expectDisconnect: boolean = false;

    readonly gameInfo: GameInfo;

    readonly maxChatHistory: number = 100;
    readonly chatHistory: { message: ChatMessageSection[], id: number }[] = reactive([]);
    readonly camera: { mx: number, my: number } & RenderEngineViewport = {
        x: 0,
        y: 0,
        angle: 0,
        width: window.innerWidth * window.devicePixelRatio,
        height: window.innerHeight * window.devicePixelRatio,
        scale: 64,
        mx: 0,
        my: 0
    };
    private assetsLoaded: boolean = false;

    acceptInputs: boolean = true;

    /**
     * @param id Game ID (namespace)
     * @param authCode Authentication code for connecting to game, supplied when joining
     */
    constructor(id: string, authCode: string) {
        // weird singleton implementation
        if (gameInstance.value !== undefined) throw new Error('Game Instance already exists!');
        this.id = id;
        this.socket = createNamespacedSocket(id, authCode);
        transition.startTo('game', 'doors', 1000);
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
        this.socket.on('leave', (reason?: string) => {
            this.leaveReason = reason;
        });
        this.socket.on('gameEnd', () => {
            this.expectDisconnect = true;
        });
        this.socket.on('disconnect', async (reason) => {
            if (!this.expectDisconnect) await modal.showModal({
                title: 'Disconnected',
                content: this.leaveReason ?? reason ?? 'connection lost',
                color: 'red'
            }).result;
            transition.startTo('menu', 'doors', 1000);
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
        // stuff
        this.socket.on('tick', (tick) => this.onTick(tick));
        // init response will tell server player is ready to start physics ticks
        this.socket.on('initPlayerPhysics', (init: {
            tick: number,
            physicsBuffer: number,
            physicsResolution: number,
            playerProperties: ControlledPlayer['properties'],
            projectileTypes: { [key in keyof typeof Projectile.types]: Point[] },
            chunkSize: number
        }) => {
            ControlledPlayer.physicsTick = init.tick;
            ControlledPlayer.physicsResolution = init.physicsResolution;
            ControlledPlayer.physicsBuffer = init.physicsBuffer;
            ControlledPlayer.baseProperties = init.playerProperties;
            Object.entries(init.projectileTypes).forEach(([type, points]: [any, Point[]]) => {
                const typeData = ((Projectile.types as any)[type] as ProjectileType);
                typeData.vertices.length = 0;
                typeData.vertices.push(...points.map<LinearPoint>((p) => ({ type: 'line', x: p.x, y: p.y })));
            });
            GameMap.chunkSize = init.chunkSize;
            // set tps to 40 to reduce chances of getting kicked network latency causes player
            // to fall behind as server tick reaches player too late to start ticking in time
            Entity.serverTps = 40;
            this.socket.emit('ready');
        });
        this.gameInfo = reactive({
            id: this.id,
            host: '',
            players: 0,
            maxPlayers: 0,
            aiPlayers: 0,
            playersReady: 0,
            public: true,
            running: false
        });
        this.socket.on('gameInfo', (info: GameInfo) => {
            this.gameInfo.host = info.host;
            this.gameInfo.players = info.players;
            this.gameInfo.maxPlayers = info.maxPlayers;
            this.gameInfo.aiPlayers = info.aiPlayers;
            this.gameInfo.playersReady = info.playersReady;
            this.gameInfo.public = info.public;
            this.gameInfo.running = info.running;
        });
        // chat
        let chatCount = 0;
        this.socket.on('chatMessage', (message: ChatMessageSection[]) => {
            this.chatHistory.push({ message: message, id: chatCount++ });
            if (this.chatHistory.length > this.maxChatHistory) this.chatHistory.shift();
        });
        gameInstance.value = this;
        if (import.meta.env.DEV) (window as any).gameInstance = this;
        Entity.serverTps = 1;
        Entity.tick = 0;
        ControlledPlayer.physicsTick = 0;
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
        tps: Stats & { curr: number, jitter: number }
        timings: Stats
        heapUsed: number
        heapTotal: number
        map: string
        players: PlayerTickData[]
        projectiles: ProjectileTickData[]
        lootboxes: LootBoxTickData[]
    }) {
        Entity.tick = tick.tick;
        Entity.serverTps = tick.tps.curr;
        GameMap.current = GameMap.maps.get(tick.map);
        Entity.onTick([]);
        Player.onTick(tick.players);
        Projectile.onTick(tick.projectiles);
        LootBox.onTick(tick.lootboxes);
        this.overlayRenderer.ticks.tps.server = tick.tps;
        this.overlayRenderer.ticks.timings.server = tick.timings;
        this.overlayRenderer.serverHeap.used = tick.heapUsed;
        this.overlayRenderer.serverHeap.total = tick.heapTotal;
    }

    private readonly externalKeybinds: Map<string, Set<(e: KeyboardEvent) => any>> = new Map();
    private addInputs() {
        const onKeyDown = (e: KeyboardEvent) => {
            if (ControlledPlayer.self === undefined) return;
            const key = e.key.toLowerCase();
            if (this.externalKeybinds.has(key)) this.externalKeybinds.get(key)!.forEach((cb) => { try { cb(e) } catch (err) { console.error(err); } });
            if (!this.acceptInputs) return;
            if (e.target instanceof HTMLElement) {
                if (e.target.matches('input[type=text], input[type=number], input[type=password], textarea')) {
                    if (e.key == 'Escape') e.target.blur();
                    return;
                } else if (e.target.matches('input[type=button]') || e.target.parentElement?.matches('button')) e.target.blur();
            }
            if (((key != 'i' && key != 'c') || !e.ctrlKey || !e.shiftKey) && ((key != '-' && key != '=' || !e.ctrlKey))) e.preventDefault();
            switch (key) {
                case keybinds.up: ControlledPlayer.self.inputs.up = true; break;
                case keybinds.down: ControlledPlayer.self.inputs.down = true; break;
                case keybinds.left: ControlledPlayer.self.inputs.left = true; break;
                case keybinds.right: ControlledPlayer.self.inputs.right = true; break;
                case '\\':
                    if (e.ctrlKey) this.showDebugInfo = !this.showDebugInfo;
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
        const onMouseMove = (e: MouseEvent) => {
            if (!this.acceptInputs || ControlledPlayer.self === undefined) return;
            this.camera.mx = e.clientX - window.innerWidth / 2;
            this.camera.my = -e.clientY + window.innerHeight / 2;
            ControlledPlayer.self.inputs.mouseAngle = Math.atan2(this.camera.my, this.camera.mx) + ControlledPlayer.self.angle;
        };
        const onMouseDown = (e: MouseEvent) => {
            if (!this.acceptInputs || ControlledPlayer.self === undefined || (e.target instanceof HTMLElement && (e.target.matches('input[type=text], input[type=number], input[type=password], textarea, input[type=button]') || e.target.parentElement?.matches('button')))) return;
            onMouseMove(e);
            switch (e.button) {
                case keybinds.primary: ControlledPlayer.self.inputs.primary = true; break;
                case keybinds.secondary: ControlledPlayer.self.inputs.secondary = true; break;
            }
        };
        const onMouseUp = (e: MouseEvent) => {
            if (ControlledPlayer.self === undefined) return;
            onMouseMove(e);
            switch (e.button) {
                case keybinds.primary: ControlledPlayer.self.inputs.primary = false; break;
                case keybinds.secondary: ControlledPlayer.self.inputs.secondary = false; break;
            }
        };
        const onBlur = () => {
            if (ControlledPlayer.self === undefined) return;
            ControlledPlayer.self.inputs.left = false;
            ControlledPlayer.self.inputs.right = false;
            ControlledPlayer.self.inputs.up = false;
            ControlledPlayer.self.inputs.down = false;
            ControlledPlayer.self.inputs.primary = false;
            ControlledPlayer.self.inputs.secondary = false;
        };
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mouseup', onMouseUp);
        window.addEventListener('blur', onBlur);
        watch(gameInstance, () => {
            if (gameInstance.value?.instanceId !== this.instanceId) {
                document.removeEventListener('keydown', onKeyDown);
                document.removeEventListener('keyup', onKeyUp);
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mousedown', onMouseDown);
                document.removeEventListener('mouseup', onMouseUp);
                window.removeEventListener('blur', onBlur);
            }
        });
    }

    addKeybind(key: string, cb: (e: KeyboardEvent) => any) {
        const k = key.toLowerCase();
        if (this.externalKeybinds.has(k)) this.externalKeybinds.get(key)!.add(cb);
        else this.externalKeybinds.set(k, new Set([cb]));
    }

    get loaded() {
        return this.assetsLoaded;
    }

    showDebugInfo: boolean = false;
    private readonly overlayRenderer: UIOverlayRenderer = new UIOverlayRenderer();
    private mapRenderables: [TexturedRenderable[], TexturedRenderable[], PathRenderable[]] = [[], [], []];
    /**
     * Creates a new renderer instance.
     */
    private async loadRenderer(): Promise<void> {
        await GameMap.reloadMaps();
        this.renderEngine = new RenderEngine<renderLayers>(canvas, [
            // map below
            {
                type: '2d',
                canvas: 1,
                target: 1,
                smoothing: false,
                culling: false
            },
            // misc. entities
            {
                type: '2d',
                canvas: 1,
                target: 1
            },
            // players/bullets
            {
                type: '2d',
                canvas: 1,
                target: 1
            },
            // particles
            // {
            //     type: 'webgl',
            //     canvas: 1,
            //     target: 0,
            //     clear: true
            // },
            // map above, debug
            {
                type: '2d',
                canvas: 1,
                target: 0,
                smoothing: false,
                culling: false
            },
            // ui (replace with "custom" later)
            {
                type: 'custom',
                canvas: 0,
                target: 0
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
        this.overlayRenderer.renderMetrics = this.renderEngine.metrics;
        const physicsMetrics = ControlledPlayer.physicsPerformanceMetrics;
        this.overlayRenderer.ticks.tps.client = physicsMetrics.tps;
        this.overlayRenderer.ticks.timings.client = physicsMetrics.timings;
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
            const cosVal = Math.cos(ControlledPlayer.self.angle);
            const sinVal = Math.sin(ControlledPlayer.self.angle);
            this.camera.x = (ControlledPlayer.self.x * cosVal + ControlledPlayer.self.y * sinVal) + this.camera.mx / this.camera.scale * 0.1;
            this.camera.y = (ControlledPlayer.self.y * cosVal - ControlledPlayer.self.x * sinVal) + this.camera.my / this.camera.scale * 0.1;
            this.camera.angle = ControlledPlayer.self.angle;
        }
        // generate new map stuff if needed
        if (this.mapRenderables[0][0]?.texture != (await GameMap.current?.textures)?.at(0)) this.mapRenderables = await this.generateMapRenderables();
        this.renderEngine.sendFrameData(this.camera, [
            // map below
            [
                ...this.mapRenderables[0],
            ],
            // misc entities 
            [],
            // players/bullets
            [
                ...Player.list.values(),
                ...Projectile.list.values(),
            ].map((e) => { e.lerp(t); return e; }),
            // particles
            // [],
            // map above, debug
            [
                ...this.mapRenderables[1],
                ...(this.showDebugInfo ? this.mapRenderables[2] : []),
                ...(this.showDebugInfo ? (GameMap.current?.flatCollisionGrid ?? []) : []),
                ...(this.showDebugInfo ? Array.from(Player.list.values(), (p) => p.debugRenderable) : []),
                ...(this.showDebugInfo ? Array.from(Projectile.list.values(), (p) => p.debugRenderable) : [])
            ],
            // ui
            [this.overlayRenderer]
        ]);
    }

    private readonly mapEdgeBuffer = 16;
    private async generateMapRenderables(): Promise<[TexturedRenderable[], TexturedRenderable[], PathRenderable[]]> {
        const width = GameMap.current?.width ?? 0;
        const height = GameMap.current?.height ?? 0;
        const textures = await GameMap.current?.textures ?? [];
        const textureWidth = textures[0]?.width ?? 0;
        const textureHeight = textures[0]?.height ?? 0;
        const partialEntities: Partial<TexturedRenderable>[] = [
            {
                x: width / 2,
                y: height / 2,
                width: width,
                height: height,
                shiftx: 0,
                shifty: 0,
                cropx: textureWidth,
                cropy: textureHeight
            },
            // edges
            {
                x: -this.mapEdgeBuffer / 2,
                y: height / 2,
                width: this.mapEdgeBuffer,
                height: height,
                shiftx: 0,
                shifty: 0,
                cropx: GameMap.tileSize,
                cropy: textureHeight,
                tileWidth: 1,
                tileHeight: height
            },
            {
                x: width + this.mapEdgeBuffer / 2,
                y: height / 2,
                width: this.mapEdgeBuffer,
                height: height,
                shiftx: textureWidth - GameMap.tileSize,
                shifty: 0,
                cropx: GameMap.tileSize,
                cropy: textureHeight,
                tileWidth: 1,
                tileHeight: height
            },
            {
                x: width / 2,
                y: height + this.mapEdgeBuffer / 2,
                width: width,
                height: this.mapEdgeBuffer,
                shiftx: 0,
                shifty: 0,
                cropx: textureWidth,
                cropy: GameMap.tileSize,
                tileWidth: width,
                tileHeight: 1
            },
            {
                x: width / 2,
                y: -this.mapEdgeBuffer / 2,
                width: width,
                height: this.mapEdgeBuffer,
                shiftx: 0,
                shifty: textureHeight - GameMap.tileSize,
                cropx: textureWidth,
                cropy: GameMap.tileSize,
                tileWidth: width,
                tileHeight: 1
            },
            // corners (texture space is +y down, but game space is +y up)
            {
                x: -this.mapEdgeBuffer / 2,
                y: -this.mapEdgeBuffer / 2,
                width: this.mapEdgeBuffer,
                height: this.mapEdgeBuffer,
                shiftx: 0,
                shifty: textureHeight - GameMap.tileSize,
                cropx: GameMap.tileSize,
                cropy: GameMap.tileSize,
                tileWidth: 1,
                tileHeight: 1
            },
            {
                x: -this.mapEdgeBuffer / 2,
                y: height + this.mapEdgeBuffer / 2,
                width: this.mapEdgeBuffer,
                height: this.mapEdgeBuffer,
                shiftx: 0,
                shifty: 0,
                cropx: GameMap.tileSize,
                cropy: GameMap.tileSize,
                tileWidth: 1,
                tileHeight: 1
            },
            {
                x: width + this.mapEdgeBuffer / 2,
                y: height + this.mapEdgeBuffer / 2,
                width: this.mapEdgeBuffer,
                height: this.mapEdgeBuffer,
                shiftx: textureWidth - GameMap.tileSize,
                shifty: 0,
                cropx: GameMap.tileSize,
                cropy: GameMap.tileSize,
                tileWidth: 1,
                tileHeight: 1
            },
            {
                x: width + this.mapEdgeBuffer / 2,
                y: -this.mapEdgeBuffer / 2,
                width: this.mapEdgeBuffer,
                height: this.mapEdgeBuffer,
                shiftx: textureWidth - GameMap.tileSize,
                shifty: textureHeight - GameMap.tileSize,
                cropx: GameMap.tileSize,
                cropy: GameMap.tileSize,
                tileWidth: 1,
                tileHeight: 1
            }
        ];
        const ceilChunkWidth = Math.ceil(width / GameMap.chunkSize) * GameMap.chunkSize;
        const ceilChunkHeight = Math.ceil(height / GameMap.chunkSize) * GameMap.chunkSize;
        const doubleSize = 2 * GameMap.chunkSize;
        const chunkBorders: PathRenderable['points'] = [{ type: 'line', x: 0, y: 0 }, { type: 'line', x: ceilChunkWidth, y: 0 }];
        for (let y = GameMap.chunkSize; y <= ceilChunkHeight; y += GameMap.chunkSize) {
            if (y % doubleSize == 0) chunkBorders.push({ type: 'line', x: 0, y: y }, { type: 'line', x: ceilChunkWidth, y: y });
            else chunkBorders.push({ type: 'line', x: ceilChunkWidth, y: y }, { type: 'line', x: 0, y: y });
        }
        if (chunkBorders[chunkBorders.length - 1].x != 0) chunkBorders.push({ type: 'line', x: 0, y: ceilChunkHeight });
        for (let x = 0; x <= ceilChunkWidth; x += GameMap.chunkSize) {
            if (x % doubleSize == 0) chunkBorders.push({ type: 'line', x: x, y: ceilChunkHeight }, { type: 'line', x: x, y: 0 });
            else chunkBorders.push({ type: 'line', x: x, y: 0 }, { type: 'line', x: x, y: ceilChunkHeight });
        }
        return [
            partialEntities.map((entity) => new TexturedRenderable({ ...entity, texture: textures[0] })),
            partialEntities.map((entity) => new TexturedRenderable({ ...entity, texture: textures[1] })),
            [new PathRenderable({ color: '#F90', lineWidth: 0.08, points: chunkBorders, cap: 'square' })]
        ];
    }

    /**
     * Send a message in public chat.
     * @param message Message
     */
    sendChatMessage(message: string): void {
        this.socket.emit('chatMessage', message);
    }

    private isPlayerReady: boolean = false;
    /**
     * Signal to the server if the player is ready to start the round.
     */
    markReady(state: boolean): void {
        this.isPlayerReady = state;
        this.socket.emit('readyStart', this.isPlayerReady);
    }

    get playerReady(): boolean {
        return this.isPlayerReady;
    }

    /**
     * Disconnects and closes the game client.
     */
    destroy(): void {
        this.renderEngine?.stop();
        this.expectDisconnect = true;
        this.socket.disconnect();
        gameInstance.value = undefined;
        // see "disconnect" event in Socket.IO handlers (in constructor) for more stuff
        if (import.meta.env.DEV) (window as any).gameInstance = undefined;
        if ((window as any).gameInstance !== undefined) throw new Error('buh i need to access gameInstance otherwise its not undefined');
        Entity.serverTps = 1;
        Entity.tick = 0;
        ControlledPlayer.physicsTick = 0;
        ControlledPlayer.self?.remove();
        Player.list.clear();
        Projectile.list.clear();
        LootBox.list.clear();
    }
}

/**Describes a single section of a chat message - see server documentation */
export interface ChatMessageSection {
    text: string
    style?: {
        color?: string,
        fontWeight?: 'normal' | 'bold',
        fontStyle?: 'normal' | 'italic'
    }
    trusted?: boolean
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
    renderMetrics?: RenderEngineMetrics;
    serverHeap: { used: number, total: number } = { used: 0, total: 0 };
    ticks: {
        tps: {
            server: Stats & { curr: number, jitter: number }
            client: Stats & { curr: number, jitter: number }
        },
        timings: {
            server: Stats
            client: Stats
        }
    } = {
            tps: {
                server: { curr: 0, avg: 0, min: 0, max: 0, jitter: 0 },
                client: { curr: 0, avg: 0, min: 0, max: 0, jitter: 0 }
            },
            timings: {
                server: { avg: 0, min: 0, max: 0 },
                client: { avg: 0, min: 0, max: 0 }
            }
        };
    ping: number = 0;
    detailed: boolean = false;

    draw(ctx: OffscreenCanvasRenderingContext2D) {
        ctx.font = '14px \'Source Code Pro\'';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.resetTransform();
        const lines = [
            `FPS: ${this.renderMetrics?.fps ?? 'NO DATA'} (${(this.renderMetrics?.fpsHistory.avg ?? 0).toFixed(1)} avg; ${this.renderMetrics?.fpsHistory.min ?? 0} min; ${this.renderMetrics?.fpsHistory.max ?? 0} max)`,
            ...(this.detailed ? [
                'Timings:',
                `  Total: ${this.renderMetrics?.timings.total.avg.toFixed(1)}ms avg; ${this.renderMetrics?.timings.total.min.toFixed(1)}ms min; ${this.renderMetrics?.timings.total.max.toFixed(1)}ms max`,
                `  Sort: ${this.renderMetrics?.timings.sort.avg.toFixed(1)}ms avg; ${this.renderMetrics?.timings.sort.min.toFixed(1)}ms min; ${this.renderMetrics?.timings.sort.max.toFixed(1)}ms max`,
                `  Draw: ${this.renderMetrics?.timings.draw.avg.toFixed(1)}ms avg; ${this.renderMetrics?.timings.draw.min.toFixed(1)}ms min; ${this.renderMetrics?.timings.draw.max.toFixed(1)}ms max`,
                'Server:',
                `  TPS: ${this.ticks.tps.server.curr} (${this.ticks.tps.server.avg.toFixed(1)} avg; ${this.ticks.tps.server.min} min; ${this.ticks.tps.server.max} max) ${this.ticks.tps.server.jitter} jitter`,
                `  Timings: ${this.ticks.timings.server.avg.toFixed(1)}ms avg; ${this.ticks.timings.server.min.toFixed(1)}ms min; ${this.ticks.timings.server.max.toFixed(1)}ms max`,
                `  Tick: ${Entity.tick}`,
                `  Ping: ${this.ping.toFixed(1)}ms`,
                'Physics:',
                `  TPS: ${this.ticks.tps.client.curr} (${this.ticks.tps.client.avg.toFixed(1)} avg; ${this.ticks.tps.client.min} min; ${this.ticks.tps.client.max} max) ${this.ticks.tps.client.jitter} jitter`,
                `  Timings: ${this.ticks.timings.client.avg.toFixed(1)}ms avg; ${this.ticks.timings.client.min.toFixed(1)}ms min; ${this.ticks.timings.client.max.toFixed(1)}ms max`,
                `  Tick: ${ControlledPlayer.physicsTick} / ${ControlledPlayer.physicsTick - Entity.tick} (${ControlledPlayer.physicsTick > Entity.tick ? 'LEAD' : 'LAG'})`,
                'Heap:',
                `  Server: ${this.serverHeap.used.toFixed(2)}MB/${this.serverHeap.total.toFixed(2)}MB`,
                `  Client: ${(performance as any).memory === undefined ? 'NO DATA' : `${((performance as any).memory.usedJSHeapSize / 1048576).toFixed(2)}MB/${((performance as any).memory.totalJSHeapSize / 1048576).toFixed(2)}MB`}`,
                'Entities:',
                `  Pl: ${Player.list.size}`,
                `  Pj: ${Projectile.list.size}`,
                `  Lb: ${LootBox.list.size}`
            ] : [])
        ];
        ctx.fillStyle = '#0005';
        for (let i = 0; i < lines.length; i++) ctx.fillRect(4, i * 16 + 8, ctx.measureText(lines[i]).width + 4, 16);
        ctx.fillStyle = '#fff';
        for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], 6, i * 16 + 10);
        if (gameInstance.value?.showDebugInfo) {
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
    right: 'd',
    primary: 0,
    secondary: 2
};

export default gameInstance;

if (import.meta.env.DEV) {
    console.info('Development mode enabled, exposing game instances');
    const existing = (window as any).gameInstance;
    if (existing != undefined) {
        gameInstance.value = existing;
        console.warn('Existing game instance found, using that (this may break things!)');
    }
}