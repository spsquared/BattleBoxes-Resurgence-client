<script setup lang="ts">
import { gameInstance } from '@/game/game';

</script>

<template>
    <Transition>
        <div class="menuView" v-if="gameInstance === null">
        </div>
    </Transition>
</template>

<style>
@keyframes menuTransition {
    0% {
        display: block;
    }
}
</style>
<style scoped>
.menuView {
    display: block;
    position: fixed;
    top: 0px;
    left: 0px;
    width: 100vw;
    height: 100vh;
    background-color: white;
    z-index: 1;
}


</style>