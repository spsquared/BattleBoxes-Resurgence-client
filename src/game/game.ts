// main engine, contains general game logic

import '@/game/renderer';
import '@/game/sound';
import '@/game/entity';

import { Socket } from 'socket.io-client';
import { createNamespacedSocket } from '@/server';
import { ref, watch } from 'vue';
import { startTransitionTo } from '@/menu/nav';
import RenderEngine, { CircleRenderable, RectangleRenderable, TextRenderable, type RenderEngineViewport } from '@/game/renderer';

const canvasRoot = document.getElementById('canvasRoot');
if (canvasRoot === null) throw new Error('Canvas root was not found');
const canvas = canvasRoot.children[0] instanceof HTMLCanvasElement ? canvasRoot.children[0] : document.createElement('canvas');
canvasRoot.appendChild(canvas);

export const gameInstance = ref<GameInstance>();

type renderLayers = ['2d', 'offscreen2d', 'offscreen2d', 'offscreen2d', '2d'];

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
        this.id = id;
        this.socket = createNamespacedSocket(id, authCode);
        this.socket.on('join', () => startTransitionTo('game'));
        this.loadPromise = this.loadRenderer();
        this.onresize();
        window.addEventListener('resize', () => this.onresize());
        // I IWLL FORGET TO REMOVE THIS LISTENER
        // I IWLL FORGET TO REMOVE THIS LISTENER
        // I IWLL FORGET TO REMOVE THIS LISTENER
    }

    private onresize() {
        this.camera.width = window.innerWidth * window.devicePixelRatio;
        this.camera.height = window.innerHeight * window.devicePixelRatio;
    }

    get loaded() {
        return this.assetsLoaded;
    }

    private async loadRenderer() {
        this.renderEngine = new RenderEngine<renderLayers>(canvas, [
            {
                type: '2d',
                canvas: 0,
                target: 0,
                textures: [],
                clear: true,
                culling: false
            },
            {
                type: 'offscreen2d',
                canvas: 1,
                target: 1,
                textures: [],
                clear: true
            },
            {
                type: 'offscreen2d',
                canvas: 1,
                target: 0,
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
                clear: true
            },
            {
                type: '2d',
                canvas: 0,
                target: 0,
                textures: []
            }
        ]);
        this.assetsLoaded = true;

        const colors = ['red', 'lime', 'blue', 'green', 'gold', 'yellow', 'magenta', 'orange', 'dodgerblue', 'violet', 'gray', 'white'];
        setInterval(() => {
            const metrics = this.renderEngine?.metrics;
            this.renderEngine?.sendFrame(this.camera, [
                [],
                [...Array.from(new Array(100), (): RectangleRenderable => new RectangleRenderable({
                    x: (Math.random() - 0.5) * this.camera.width,
                    y: (Math.random() - 0.5) * this.camera.height,
                    width: Math.random() * 50 + 10,
                    height: Math.random() * 50 + 10,
                    color: colors[~~(Math.random() * colors.length)],
                    // color: `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)})`
                    // angle: Math.random() * 2 * Math.PI
                }))],
                [
                    new CircleRenderable({
                        r: 100,
                        fill: 'red',
                        stroke: 'blue',
                        lineWidth: 20
                    }),
                    new CircleRenderable({
                        x: 300,
                        r: 100,
                        fill: 'blue',
                        stroke: 'red',
                        lineWidth: -20
                    })
                ],
                [],
                [
                    new TextRenderable({
                        x: -this.camera.width / 2 + 8,
                        y: -this.camera.height / 2 + 20,
                        align: 'left',
                        size: 14,
                        color: 'white',
                        text: `FPS: ${metrics!.fps} (${Math.round(metrics!.fpsHistory.avg)} avg; ${metrics!.fpsHistory.min} min; ${metrics!.fpsHistory.max} max)`
                    }),
                    new TextRenderable({
                        x: -this.camera.width / 2 + 8,
                        y: -this.camera.height / 2 + 36,
                        align: 'left',
                        size: 14,
                        color: 'white',
                        text: 'Timings:'
                    }),
                    new TextRenderable({
                        x: -this.camera.width / 2 + 24,
                        y: -this.camera.height / 2 + 52,
                        align: 'left',
                        size: 14,
                        color: 'white',
                        text: `Total: ${Math.round(metrics!.timings.total.avg)}ms avg; ${Math.round(metrics!.timings.total.min)}ms min; ${Math.round(metrics!.timings.total.max)}ms max`
                    }),
                    new TextRenderable({
                        x: -this.camera.width / 2 + 24,
                        y: -this.camera.height / 2 + 68,
                        align: 'left',
                        size: 14,
                        color: 'white',
                        text: `Sort: ${Math.round(metrics!.timings.sort.avg)}ms avg; ${Math.round(metrics!.timings.sort.min)}ms min; ${Math.round(metrics!.timings.sort.max)}ms max`
                    }),
                    new TextRenderable({
                        x: -this.camera.width / 2 + 24,
                        y: -this.camera.height / 2 + 84,
                        align: 'left',
                        size: 14,
                        color: 'white',
                        text: `Draw: ${Math.round(metrics!.timings.draw.avg)}ms avg; ${Math.round(metrics!.timings.draw.min)}ms min; ${Math.round(metrics!.timings.draw.max)}ms max`
                    }),
                ]
            ]);
        }, 20);
    }
}

// still need some way to synchronize with the renderer
// like requestAnimationFrame basically
// awaitable function for next frame completion
// function with callback for before next frame
// also need metrics and stuff

if (import.meta.env.DEV) {
    console.info('Development mode enabled, exposing game instances');
    const existing = (window as any).gameInstance;
    if (existing != undefined) gameInstance.value = existing;
    watch(gameInstance, () => {
        (window as any).gameInstance = gameInstance.value;
    });
    (window as any).gameInstance = gameInstance.value;
}