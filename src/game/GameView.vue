<script setup lang="ts">
import { gameInstance } from './game';
</script>

<template>
    <Transition>
        <div class="gameView" v-if="gameInstance !== null">
        </div>
    </Transition>
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

/* game transition fade screen */
</style>