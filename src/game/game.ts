// main engine, contains general game logic

import '@/game/renderer';
import '@/game/sound';
import '@/game/entity';
import { ref } from 'vue';

// VERY IMPORTANT: TEST TEST TEST MAY NOT BE REACTIVE
export const gameInstance = ref<GameInstance | null>(null);

export class GameInstance {
    
}