// main engine, contains general game logic

import '@/game/renderer';
import '@/game/sound';
import '@/game/entity';
import { ref } from 'vue';

export const gameInstance = ref<GameInstance | null>(null);

export class GameInstance {
    
}