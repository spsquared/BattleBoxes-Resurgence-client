// main engine, contains general game logic

import '@/game/renderer';
import '@/game/sound';
import '@/game/entity';

import { reactive } from 'vue';

export const gameState = reactive<{
    inGame: boolean
}>({
    inGame: false
});