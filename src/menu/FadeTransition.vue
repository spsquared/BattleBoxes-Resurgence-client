<script setup lang="ts">
import { showFadeScreen } from '@/menu/nav';
import LoadingSpinner from '@/components/loaders/LoadingSpinner.vue';
</script>

<template>
    <Transition>
        <div class="fadeTransition" v-if="showFadeScreen">
            <LoadingSpinner class="fadeTransitionSpinner"></LoadingSpinner>
        </div>
    </Transition>
</template>

<style scoped>
.fadeTransition {
    display: grid;
    --spinner-size: min(10vw, 10vh);
    grid-template-rows: 25vh var(--spinner-size) 1fr;
    position: fixed;
    top: 0px;
    left: 0px;
    width: 100vw;
    height: 100vh;
    background-color: black;
    z-index: 1000;
}

.fadeTransitionSpinner {
    grid-row: 2;
    grid-column: 2;
    width: var(--spinner-size) !important;
    height: var(--spinner-size) !important;
}

.v-enter-active,
.v-leave-active {
    transition: 500ms linear opacity;
}

.v-enter-from,
.v-leave-to {
    opacity: 0;
}

.v-leave-from,
.v-enter-to {
    opacity: 1;
}
</style>