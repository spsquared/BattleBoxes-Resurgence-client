<script setup lang="ts">
import transition from '@/menu/nav';
import LoadingSpinner from '@/components/loaders/LoadingSpinner.vue';
</script>

<template>
    <Transition name="fade">
        <div class="transition fade" v-if="transition.running && transition.type == 'fade'">
            <LoadingSpinner class="fadeSpinner"></LoadingSpinner>
        </div>
    </Transition>
    <!-- maybe WWPPC stream transition but with red rectangles followed by black rectangles, logo + spinner, then green rectangles on out -->
    <Transition name="doors">
        <div class="transition doors" v-if="transition.running && transition.type == 'doors'">
            <div class="door doorLower">
                RESURGENCE
            </div>
            <div class="door doorUpper">
                BATTLEBOXES
                <div class="doorsSpinnerWrapper">
                    <LoadingSpinner class="doorsSpinner"></LoadingSpinner>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.transition {
    display: grid;
    position: fixed;
    top: 0px;
    left: 0px;
    width: 100vw;
    height: 100vh;
    z-index: 1000;
}
</style>
<style scoped>
.fade {
    --spinner-size: min(10vw, 10vh);
    grid-template-rows: 25vh var(--spinner-size) 1fr;
    background-color: black;
    transition: 500ms linear opacity;
}

.fadeSpinner {
    grid-row: 2;
    grid-column: 2;
    width: var(--spinner-size) !important;
    height: var(--spinner-size) !important;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.fade-leave-from,
.fade-enter-to {
    opacity: 1;
}
</style>
<style scoped>
.doors {
    --spinner-size: min(10vw, 10vh);
    backdrop-filter: blur(4px);
    transition: 500ms linear backdrop-filter;
}

.door {
    position: absolute;
    box-sizing: border-box;
    width: 100vw;
    height: 50vh;
    background-color: #222;
    padding: min(5vw, 5vh);
    text-align: center;
    text-shadow: currentColor 0px 0px 3px;
    transition: 500ms cubic-bezier(0.8, 0, 0.5, 0.5) transform;
}

.doorUpper {
    top: calc(-var(--spinner-size));
    border-bottom: 4px solid black;
    font-size: var(--font-subtitle);
    color: #0C0;
    align-content: end;
}

.doorLower {
    top: calc(100vh + var(--spinner-size));
    border-top: 4px solid black;
    transform: translateY(calc(-50vh - var(--spinner-size)));
    font-size: var(--font-subsubtitle);
    color: #F00;
}

.doorsSpinnerWrapper {
    position: absolute;
    bottom: 0px;
    left: 50vw;
    width: var(--spinner-size);
    height: var(--spinner-size);
    transform: translate(-50%, 50%);
    z-index: 1001;
}

.doorsSpinner {
    width: var(--spinner-size) !important;
    height: var(--spinner-size) !important;
}

.doors-enter-from,
.doors-leave-to {
    backdrop-filter: none;
}

.doors-leave-from,
.doors-enter-to {
    backdrop-filter: blur(4px);
}

.doors-enter-from>.doorLower,
.doors-leave-to>.doorLower,
.doors-enter-to>.doorUpper,
.doors-leave-from>.doorUpper {
    transform: translateY(0vh);
}

.doors-enter-to>.doorLower,
.doors-leave-from>.doorLower,
.doors-enter-from>.doorUpper,
.doors-leave-to>.doorUpper {
    transform: translateY(calc(-50vh - var(--spinner-size)));
}
</style>