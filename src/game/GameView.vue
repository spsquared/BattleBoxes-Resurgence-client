<script setup lang="ts">
import { onMounted, watch } from 'vue';
import './game';
import gameInstance from './game';
import { showFadeScreen } from '@/menu/nav';
import GameChat from './GameChat.vue';
import GameInfo from './GameInfo.vue';

const attachGameInstanceStuff = () => {
    gameInstance.value?.loadPromise.then(() => showFadeScreen.value = false);
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
        <GameInfo></GameInfo>
        <!-- ready button -->
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