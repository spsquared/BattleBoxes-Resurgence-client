<script setup lang="ts">
import { currentPage } from '@/menu/nav';
</script>

<template>
    <Transition>
        <div class="gameSelectView" v-if="currentPage == 'gameSelect'">
        </div>
    </Transition>
</template>

<style scoped>
.gameSelectView {
    position: fixed;
    top: 0px;
    left: 0px;
    width: 100vw;
    height: 100vh;
    background-color: transparent;
    z-index: 2;
}

/* game select transition fade screen */
/* only fades in, from menu, game view transitions on out */
</style>