<script setup lang="ts">
import { currentPage } from '@/menu/nav';
</script>

<template>
    <div class="gameView" v-if="currentPage == 'game'">
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