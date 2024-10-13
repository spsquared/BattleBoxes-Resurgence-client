<script setup lang="ts">
import { onMounted, watch } from 'vue';
import './game';
import gameInstance from './game';
import { showFadeScreen } from '@/menu/nav';

onMounted(() => {
    gameInstance.value?.loadPromise.then(() => showFadeScreen.value = false);
    document.getElementById('gameView')?.addEventListener('contextmenu', (e) => e.preventDefault());
});
watch(gameInstance, () => {
    gameInstance.value?.loadPromise.then(() => showFadeScreen.value = false);
});
</script>

<template>
    <div class="gameView" id="gameView">
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