// main engine, contains general game logic

import '@/game/renderer';
import '@/game/sound';
import '@/game/entity';


import { Socket } from 'socket.io-client';
import { createNamespacedSocket } from '@/server';
import { ref } from 'vue';
import { startTransitionTo } from '@/menu/nav';

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