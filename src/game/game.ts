// main engine, contains general game logic

import '@/game/renderer';
import '@/game/sound';
import '@/game/entity';

import { Socket } from 'socket.io-client';
import { createNamespacedSocket } from '@/server';
import { ref, watch } from 'vue';
import { startTransitionTo } from '@/menu/nav';
import RenderEngine, { CompositeRenderable, CustomRenderable, RectangleRenderable, TextRenderable } from '@/game/renderer';

const canvasRoot = document.getElementById('canvasRoot');
if (canvasRoot === null) throw new Error('Canvas root was not found');
const canvas = canvasRoot.children[0] instanceof HTMLCanvasElement ? canvasRoot.children[0] : document.createElement('canvas');
canvasRoot.appendChild(canvas);

export const gameInstance = ref<GameInstance>();

type renderLayers = ['offscreen2d', 'offscreen2d', 'offscreen2d', 'offscreen2d', '2d'];

export class GameInstance {

    private renderEngine: RenderEngine<renderLayers> | null = null;
    readonly id: string;
    readonly socket: Socket;
    readonly loadPromise: Promise<void>;
    private assetsLoaded: boolean = false;

    constructor(id: string, authCode: string) {
        this.id = id;
        this.socket = createNamespacedSocket(id, authCode);
        this.socket.on('join', () => startTransitionTo('game'));
        this.loadPromise = this.loadRenderer();
    }

    get loaded() {
        return this.assetsLoaded;
    }

    private async loadRenderer() {
        this.renderEngine = new RenderEngine<renderLayers>(canvas, [
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
                target: 1,
                textures: []
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

        this.renderEngine.framerate = 10;
        let a = 0;
        setInterval(() => {
            this.renderEngine?.sendFrame([
                [new TestBox(500, 200)],
                [new SpinnyThing(a++)],
                [new TestText()],
                [],
                []
            ]);
        }, 100);
    }
}

class TestBox extends RectangleRenderable {
    x: number;
    y: number;
    width = 100;
    height = 100;
    angle = -Math.PI / 3;
    color = '#0F0';
    constructor(x: number, y: number) {
        super();
        this.x = x;
        this.y = y;
    }
}

class TestText extends TextRenderable {
    x = 500;
    y = 200;
    angle = -Math.PI / 3;
    text = 'Test';
    color = '#F00';
    size = 20;
}

class SpinnyThing extends CompositeRenderable<CustomRenderable> {
    x = 400;
    y = 5000;
    angle: number;
    components: (RectangleRenderable | TextRenderable | CustomRenderable)[];
    constructor(a: number) {
        super();
        this.angle = a;
        this.components = [new TestBox(-20, -20), new TestBox(20, 20)];
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