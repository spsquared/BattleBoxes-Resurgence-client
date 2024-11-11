<script setup lang="ts">
import { onMounted, watch } from 'vue';
import './game';
import gameInstance from './game';
import { showGameTransition } from '@/menu/nav';
import GameChat from './GameChat.vue';
import GameLobbyInfo from './GameLobbyInfo.vue';

const attachGameInstanceStuff = () => {
    gameInstance.value?.loadPromise.then(() => showGameTransition.value = false);
};
onMounted(() => {
    document.getElementById('gameView')?.addEventListener('contextmenu', (e) => e.preventDefault());
    attachGameInstanceStuff();
});
watch(gameInstance, () => {
    if (gameInstance.value !== undefined) attachGameInstanceStuff();
});
</script>

<template>
    <div class="gameView" id="gameView">
        <GameChat></GameChat>
        <GameLobbyInfo v-if="!gameInstance?.gameInfo.running"></GameLobbyInfo>
    </div>
</template>

<style scoped>
.gameView {
    position: fixed;
    top: 0px;
    left: 0px;
    width: 100vw;
    height: 100vh;
    background-color: transparent;
    z-index: 2;
}
</style>