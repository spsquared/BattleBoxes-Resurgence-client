// main engine, contains general game logic

import '@/game/renderer';
import '@/game/sound';
import '@/game/entity';

import { Socket } from 'socket.io-client';
import { createNamespacedSocket } from '@/server';
import { ref, watch } from 'vue';
import { startTransitionTo } from '@/menu/nav';
import RenderEngine, { CompositeRenderable, CustomRenderable, RectangleRenderable, TextRenderable, type RenderEngineViewport } from '@/game/renderer';

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
        width: window.innerWidth * window.devicePixelRatio,
        height: window.innerHeight * window.devicePixelRatio
    };
    private assetsLoaded: boolean = false;

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
                clear: true
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

        let a = 0;
        setInterval(() => {
            this.renderEngine?.sendFrame(this.camera, [
                [new TestBox(500, 200)],
                [new SpinnyThing(a += 0.1)],
                [new TestText()],
                [],
                []
            ]);
        }, 20);
    }
}

// still need some way to synchronize with the renderer
// like requestAnimationFrame basically
// awaitable function for next frame completion
// function with callback for before next frame
// also i guess allow composite renderables in composite renderables??

class TestBox extends RectangleRenderable {
    constructor(x: number, y: number) {
        super({
            x: x,
            y: y,
            width: 100,
            height: 200,
            color: '#0F0',
            angle: -Math.PI / 3
        });
    }
}

class TestText extends TextRenderable {
    constructor(x?: number, y?: number, a?: number) {
        super({
            x: x ?? 500,
            y: y ?? 200,
            angle: a,
            size: 20,
            color: '#F00',
            text: 'Test'
        });
    }
}

class SpinnyThing extends CompositeRenderable<CustomRenderable> {
    constructor(a: number) {
        super({
            x: 400,
            y: 400,
            angle: a,
            components: [new TestBox(-80, -80), new TestBox(80, 80), new TestText(0, 0, Math.PI / 3)]
        });
    }
}

if (import.meta.env.DEV) {
    console.info('Development mode enabled, exposing game instances');
    const existing = (window as any).gameInstance;
    if (existing != undefined) gameInstance.value = existing;
    watch(gameInstance, () => {
        (window as any).gameInstance = gameInstance.value;
    });
    (window as any).gameInstance = gameInstance.value;
}