// main engine, contains general game logic

import '@/game/renderer';
import '@/game/sound';
import '@/game/entity';


import { Socket } from 'socket.io-client';
import { createNamespacedSocket } from '@/server';
import { ref } from 'vue';
import { startTransitionTo } from '@/menu/nav';
import RenderingEngine, { type CanvasLayerDescriptors } from '@/game/renderer';

export const gameInstance = ref<GameInstance>();

export class GameInstance {
    readonly id: string;
    readonly socket: Socket;
    readonly loadPromise: Promise<void>;
    private assetsLoaded: boolean = false;

    constructor(id: string, authCode: string) {
        this.id = id;
        this.socket = createNamespacedSocket(id, authCode);
        this.socket.on('join', () => startTransitionTo('game'));
        this.loadPromise = new Promise((resolve) => {
            // idk load the game or sometihng
            resolve();
            this.assetsLoaded = true;
        });
    }
}

const canvasRoot = document.getElementById('canvasRoot');
if (canvasRoot === null) throw new Error('Canvas root was not found');
Array.from(canvasRoot.childNodes).forEach((node) => canvasRoot.removeChild(node));
const canvas = document.createElement('canvas');
canvasRoot.appendChild(canvas);

type TestLayers = [
    {
        type: 'direct',
        textures: []
    },
    {
        type: 'offscreen',
        textures: [ImageBitmap, ImageBitmap]
    },
    {
        type: 'webgl',
        textures: []
    }
];

export const renderer = new RenderingEngine<TestLayers>(canvas, [
    {
        type: 'direct',
        textures: []
    },
    {
        type: 'offscreen',
        textures: [new ImageBitmap(), new ImageBitmap()]
    },
    {
        type: 'webgl',
        textures: []
    }
]);

renderer.sendFrame([
    [],
    [],
    []
])