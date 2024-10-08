// main engine, contains general game logic

import '@/game/renderer';
import '@/game/sound';
import '@/game/entities/entity';

import { Socket } from 'socket.io-client';
import { checkConnection, createNamespacedSocket, serverFetch } from '@/server';
import { ref, watch } from 'vue';
import { startTransitionTo } from '@/menu/nav';
import RenderEngine, { CustomRenderable, type RenderEngineMetrics, type RenderEngineViewport } from '@/game/renderer';
import { Player, type PlayerTickData } from './entities/player';
import { Entity } from '@/game/entities/entity';
import { modal } from '@/components/modal';

const canvasRoot = document.getElementById('canvasRoot');
if (canvasRoot === null) throw new Error('Canvas root was not found');
const canvas = canvasRoot.children[0] instanceof HTMLCanvasElement ? canvasRoot.children[0] : document.createElement('canvas');
canvasRoot.appendChild(canvas);

export const gameInstance = ref<GameInstance>();

// map, misc entities, players/bullets, particles, above, ui
// add particles "webgl" and replace ui 2d with "custom" later
type renderLayers = ['offscreen2d', 'offscreen2d', 'offscreen2d', 'offscreen2d', '2d'];

/**
 * Handles all of the game logic for all of the game. There can only be one!!!
 */
export class GameInstance {

    private renderEngine: RenderEngine<renderLayers> | null = null;
    readonly id: string;
    readonly socket: Socket;
    readonly loadPromise: Promise<void>;
    readonly camera: RenderEngineViewport = {
        x: 0,
        y: 0,
        angle: 0,
        width: window.innerWidth * window.devicePixelRatio,
        height: window.innerHeight * window.devicePixelRatio
    };
    private assetsLoaded: boolean = false;
    drawPerfMetrics: boolean = false;

    constructor(id: string, authCode: string) {
        // weird singleton implementation
        if (gameInstance.value !== undefined) throw new Error('Game Instance already exists!');
        this.id = id;
        this.socket = createNamespacedSocket(id, authCode);
        this.socket.on('join', () => startTransitionTo('game'));
        this.loadPromise = this.loadRenderer();
        this.onResize();
        const resizeListener = () => this.onResize();
        window.addEventListener('resize', resizeListener);
        watch(gameInstance, () => {
            if (gameInstance.value === undefined) {
                this.destroy();
                window.removeEventListener('resize', resizeListener);
            }
        });
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
        this.socket.on('tick', () => console.log('bug'))
    }

    private onResize() {
        this.camera.width = window.innerWidth * window.devicePixelRatio;
        this.camera.height = window.innerHeight * window.devicePixelRatio;
    }

    private onTick(tick: {
        tick: number
        tps: number
        players: PlayerTickData[]
    }) {
        console.log('buh')
        Entity.tick = tick.tick;
        Entity.serverTps = tick.tps;
        Entity.onTick([]);
        Player.onTick(tick.players);
    }

    get loaded() {
        return this.assetsLoaded;
    }

    private readonly uiRenderer: UIRenderer = new UIRenderer();
    private async loadRenderer() {
        this.renderEngine = new RenderEngine<renderLayers>(canvas, [
            {
                type: 'offscreen2d',
                canvas: 1,
                target: 1,
                textures: [],
                clear: true,
                culling: false
            },
            {
                type: 'offscreen2d',
                canvas: 1,
                target: 1,
                textures: []
            },
            {
                type: 'offscreen2d',
                canvas: 1,
                target: 1,
                textures: []
            },
            // {
            //     type: 'webgl',
            //     canvas: 1,
            //     target: 0,
            //     textures: [],
            //     clear: true
            // },
            {
                type: 'offscreen2d',
                canvas: 1,
                target: 0,
                textures: [],
            },
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

    private async loadTexture(src: string): Promise<ImageBitmap> {
        return await serverFetch('/resources/textures/' + src).then((res) => res.blob()).then((blob) => createImageBitmap(blob));
    }

    private async beforeDraw() {
        if (this.renderEngine == undefined) return;
        // send to pipeline also lerp
        this.uiRenderer.metrics = this.renderEngine.metrics;
        const t = performance.now();
        this.renderEngine.sendFrame(this.camera, [
            [],
            [...Array.from(Player.list.values())].map((e) => { e.lerp(t); return e; }),
            [],
            [],
            []
        ])
    }

    destroy() {
        this.renderEngine?.stop();
        this.socket.disconnect();
        gameInstance.value = undefined;
    }
}

class UIRenderer extends CustomRenderable {
    metrics?: RenderEngineMetrics;
    graphs: boolean = false;

    draw(ctx: OffscreenCanvasRenderingContext2D) {
        ctx.font = '14px Pixel';
        ctx.fillStyle = '#0005';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.resetTransform();
        if (this.metrics == undefined) {
            ctx.fillRect(4, 4, ctx.measureText('No Data').width, 16);
            ctx.fillStyle = '#fff';
            ctx.fillText('No Data', 6, 6);
        } else {
            const l1 = `FPS: ${this.metrics.fps} (${Math.round(this.metrics.fpsHistory.avg)} avg; ${this.metrics.fpsHistory.min} min; ${this.metrics.fpsHistory.max} max)`;
            const l2 = 'Timings:';
            const l3 = `Total: ${Math.round(this.metrics.timings.total.avg)}ms avg; ${Math.round(this.metrics.timings.total.min)}ms min; ${Math.round(this.metrics.timings.total.max)}ms max`;
            const l4 = `Sort: ${Math.round(this.metrics.timings.sort.avg)}ms avg; ${Math.round(this.metrics.timings.sort.min)}ms min; ${Math.round(this.metrics.timings.sort.max)}ms max`;
            const l5 = `Draw: ${Math.round(this.metrics.timings.draw.avg)}ms avg; ${Math.round(this.metrics.timings.draw.min)}ms min; ${Math.round(this.metrics.timings.draw.max)}ms max`;
            ctx.fillRect(4, 8, ctx.measureText(l1).width, 16);
            ctx.fillRect(4, 24, ctx.measureText(l2).width, 16);
            ctx.fillRect(4, 40, ctx.measureText(l3).width, 16);
            ctx.fillRect(4, 56, ctx.measureText(l4).width, 16);
            ctx.fillRect(4, 72, ctx.measureText(l5).width, 16);
            ctx.fillStyle = '#fff';
            ctx.fillText(l1, 6, 10);
            ctx.fillText(l2, 6, 26);
            ctx.fillText(l3, 14, 42);
            ctx.fillText(l4, 14, 58);
            ctx.fillText(l5, 14, 74);
        }
        if (this.graphs) {
            ctx.fillStyle = '#0005';
        }
    }
}

// maybe also need to put rendering on separate thread if possible

if (import.meta.env.DEV) {
    console.info('Development mode enabled, exposing game instances');
    const existing = (window as any).gameInstance;
    if (existing != undefined) gameInstance.value = existing;
    watch(gameInstance, () => {
        (window as any).gameInstance = gameInstance.value;
    });
    (window as any).gameInstance = gameInstance.value;
}