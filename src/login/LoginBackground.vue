<script setup lang="ts">
import { onMounted, ref } from 'vue';

const tileRows = ref(0);
const tileCols = ref(0);
const tileCount = ref(0);
const calcTiles = () => {
    tileRows.value = Math.ceil((window.innerHeight) / 48);
    tileCols.value = Math.ceil(window.innerWidth / 48);
    tileCount.value = tileRows.value * tileCols.value;
};
window.addEventListener('resize', calcTiles, { passive: true });
onMounted(calcTiles);

// ALSO IT MOVES AROUND
</script>

<template>
    <div class="loginBackgroundContainer">
        <div class="loginBackground">
            <div class="loginSquare" v-for="i in tileCount" :key="i" :style="{
                animationDuration: `${Math.round(Math.random() * 5000) + 1000}ms`
            }"></div>
        </div>
        <div class="loginBorder"></div>
    </div>
</template>

<style>
@keyframes tileGlow {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}
</style>
<style scoped>
.loginBackgroundContainer {
    display: flex;
    flex-direction: column;
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100vw;
    height: calc(100vh + 16px);
    z-index: 0;
}

.loginBackground {
    display: grid;
    grid-template-rows: repeat(v-bind("tileRows"), 48px);
    grid-template-columns: repeat(v-bind("tileCols"), 48px);
    grid-auto-columns: 16px;
}

.loginSquare {
    width: 48px;
    height: 48px;
    background-color: #EEE;
    animation-name: tileGlow;
    animation-iteration-count: infinite;
    animation-direction: alternate;
}

.loginSquare::after {
    display: block;
    content: ' ';
    width: 100%;
    height: 100%;
    background-color: #AEA;
    opacity: 0;
    transition: 200ms linear opacity;
}

.loginSquare:hover::after {
    opacity: 1;
    transition-duration: 0ms;
}

.loginBorder {
    height: 16px;
    background-image: repeating-linear-gradient(-35deg, black, black 16px, gold 16px, gold 32px);
}
</style>