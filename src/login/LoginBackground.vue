<script setup lang="ts">
import { onMounted, ref } from 'vue';

const tileRows = ref(0);
const tileCols = ref(0);
const tileCount = ref(0);
const randomness = ref<number[]>([]);
const calcTiles = () => {
    tileRows.value = Math.ceil((window.innerHeight) / 48);
    tileCols.value = Math.ceil(window.innerWidth / 48);
    tileCount.value = tileRows.value * tileCols.value;
    randomness.value = Array.from(new Array(tileCount), () => Math.random());
};
window.addEventListener('resize', calcTiles, { passive: true });
onMounted(calcTiles);
</script>

<template>
    <div class="loginBackgroundContainer">
        <div class="loginBackground">
            <div class="loginSquare" v-for="i in tileCount" :key="i"></div>
        </div>
        <div class="loginBorder"></div>
    </div>
</template>

<style>
@keyframes tileGlow {
    from {
        opacity: 0.5;
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
    position: fixed;
    top: 0px;
    left: 0px;
    width: 100vw;
    height: calc(100vh + 16px);
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
    animation-duration: 2000ms;
}

.loginSquare:nth-child(2n + 1) {
    background-color: #DADADA;
    animation-duration: 7261ms;
}

.loginSquare:nth-child(3n + 2) {
    background-color: #EEE;
    animation-duration: 1470ms;
}

.loginSquare:nth-child(7n + 3) {
    background-color: #DADADA;
    animation-duration: 2847ms;
}

.loginSquare:nth-child(5n + 2) {
    background-color: #DDD;
    animation-duration: 4925ms;
}

.loginSquare:nth-child(4n + 3) {
    background-color: #DADADA;
    animation-duration: 3956ms;
}

.loginSquare:nth-child(5n + 1) {
    background-color: #DADADA;
    animation-duration: 8932ms;
}

.loginSquare:nth-child(11n) {
    background-color: #DADADA;
    animation-duration: 3835ms;
}

.loginSquare:nth-child(17n + 9) {
    background-color: #DDD;
    animation-duration: 2872ms;
}

.loginSquare:nth-child(14n + 3) {
    background-color: #EEE;
    animation-duration: 1947ms;
}

.loginSquare:nth-child(3n + 2) {
    animation-duration: 3726ms;
}

.loginSquare:nth-child(5n + 3) {
    animation-duration: 2862ms;
}

.loginSquare:nth-child(4n + 1) {
    animation-duration: 3814ms;
}

.loginSquare:nth-child(7n + 6) {
    animation-duration: 5856ms;
}

.loginSquare:nth-child(11n + 4) {
    animation-duration: 1757ms;
}

.loginSquare:nth-child(14n + 8) {
    animation-duration: 7320ms;
}

.loginSquare:nth-child(6n + 4) {
    animation-duration: 8274ms;
}

.loginSquare::after {
    display: block;
    content: ' ';
    width: 100%;
    height: 100%;
    background-color: #0C0;
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