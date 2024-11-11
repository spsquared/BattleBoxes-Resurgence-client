<script setup lang="ts">
import { onMounted, onUpdated, ref } from 'vue';
import './game';
import gameInstance from './game';
import { ControlledPlayer } from './entities/player';

const infoBorder = ref<HTMLDivElement | null>(null);
const height = ref(0);
onUpdated(() => {
    height.value = infoBorder.value?.getBoundingClientRect().height ?? 0;
});
onMounted(() => {
    height.value = infoBorder.value?.getBoundingClientRect().height ?? 0;
});
window.addEventListener('resize', () => {
    height.value = infoBorder.value?.getBoundingClientRect().height ?? 0;
});

function ready() {
    gameInstance.value?.markReady(true);
}
</script>

<template>
    <div class="gameInfoWrapper">
        <div class="gameInfoBorder" ref="infoBorder">
            <div class="gameInfo">
                <span class="gameInfoJoinCode">{{ gameInstance?.gameInfo.id }}</span>
                <span class="gameInfoHost">Host: {{ gameInstance?.gameInfo.host }}</span>
                <div class="gameInfoPlayers">
                    <!-- don't really care about NaN here -->
                    <span>
                        <span :style="{ color: gameInstance?.gameInfo.players == (gameInstance?.gameInfo.maxPlayers! - gameInstance?.gameInfo.aiPlayers!) ? '#F00' : '#0C0' }">
                            {{ gameInstance?.gameInfo.players }}&hairsp;/&hairsp;{{ gameInstance?.gameInfo.maxPlayers! - gameInstance?.gameInfo.aiPlayers! }}
                        </span>
                        Players
                    </span>
                    <span>
                        <span style="color: #F90;">{{ gameInstance?.gameInfo.aiPlayers }}</span>
                        AI
                    </span>
                    <span style="color: #0BF;">
                        {{ gameInstance?.gameInfo.public ? 'Public' : 'Private' }}
                    </span>
                </div>
                <div class="gameInfoPlayers">
                    <span :style="{ color: gameInstance?.gameInfo.playersReady == Math.max(2, gameInstance?.gameInfo.players!) ? '#0F0' : '#FFF' }">
                        {{ gameInstance?.gameInfo.playersReady }}&hairsp;/&hairsp;{{ Math.max(2, gameInstance?.gameInfo.players!) }} Ready
                    </span>
                </div>
            </div>
        </div>
    </div>
    <div :class="['gameReadyWrapper', gameInstance?.playerReady ? 'gameReadyWrapperReady' : '']">
        <button :class="['gameReadyButton', gameInstance?.playerReady ? 'gameReadyButtonReady' : '']" @click="ready">
            <div class="readyButtonPanel p1"></div>
            <div class="readyButtonPanel p2"></div>
            <div class="readyButtonPanel p3"></div>
            <div class="readyButtonPanel p4">READY</div>
            <div class="readyButtonPanel p5">READY</div>
        </button>
    </div>
</template>

<style scoped>
.gameInfoWrapper {
    display: flex;
    position: fixed;
    top: 0px;
    left: 0px;
    width: 100vw;
    flex-direction: row;
    justify-content: center;
    pointer-events: none;
}

.gameInfoBorder {
    position: relative;
    background-color: v-bind("ControlledPlayer.selfRef.value?.color");
    clip-path: polygon(0% 0%, 100% 0%, calc(100% - tan(var(--b-angle)) * var(--height)) 100%, calc(tan(var(--b-angle)) * var(--height)) 100%);
    overflow: clip;
    --height: v-bind("height + 'px'");
    --b-angle: 25deg;
}

.gameInfo {
    display: flex;
    padding: 4px 32px 12px 32px;
    flex-direction: column;
    text-align: center;
    background-color: black;
    color: white;
    clip-path: polygon(var(--width-actual) 0%,
            calc(100% - var(--width-actual)) 0%,
            calc(100% - tan(var(--b-angle)) * (var(--height) - 8px) - var(--width-actual)) calc(100% - 8px),
            calc(tan(var(--b-angle)) * (var(--height) - 8px) + var(--width-actual)) calc(100% - 8px));
    --width-actual: calc(8px / cos(var(--b-angle)));
}

.gameInfoJoinCode {
    font-size: 28px;
}

.gameInfoHost {
    font-size: 12px;
    color: #DDD;
}

.gameInfoPlayers {
    display: flex;
    flex-direction: row;
    justify-content: center;
    column-gap: 12px;
    font-size: 12px;
    margin: 0px 16px;
    color: #DDD;
}

.gameReadyWrapper {
    display: flex;
    position: fixed;
    bottom: 0px;
    left: 0px;
    width: 100vw;
    flex-direction: row;
    justify-content: center;
    perspective: 1000px;
    pointer-events: none;
    --button-size: min(20vw, 20vh);
}

.gameReadyButton {
    appearance: none;
    position: relative;
    top: -2vh;
    width: var(--button-size);
    height: var(--button-size);
    margin: 0px;
    padding: 0px;
    border: none;
    font-family: 'Pixel';
    transform-style: preserve-3d;
    background-color: transparent;
    transition: 200ms ease transform;
    transform: rotateX(25deg);
    user-select: none;
    cursor: pointer;
}

.gameReadyButton:hover {
    transform: rotateX(20deg) translateZ(calc(0.1 * var(--button-size)));
}

.gameReadyButton:active {
    transform: rotateX(25deg) translateZ(calc(-0.2 * var(--button-size)));
}

.gameReadyWrapperReady {
    opacity: 0.8;
    filter: grayscale(0.5);
}

.gameReadyButtonReady {
    transform: rotateX(25deg) translateZ(calc(-0.1 * var(--button-size))) !important;
}

.readyButtonPanel {
    position: absolute;
    pointer-events: auto;
}

.p1,
.p3 {
    bottom: 0%;
    width: calc(sqrt(0.045) * 100%);
    height: 20%;
    background-color: #0A0;
}

.p1 {
    right: 85%;
    transform-origin: 100% 100%;
    transform: rotateX(90deg) rotateY(45deg);
}

.p3 {
    left: 85%;
    transform-origin: 0% 100%;
    transform: rotateX(90deg) rotateY(-45deg);
}

.p2 {
    bottom: 0%;
    left: 15%;
    width: 70%;
    height: 20%;
    transform-origin: 0% 100%;
    background-color: #090;
    transform: rotateX(90deg);
}

.p4,
.p5 {
    box-sizing: border-box;
    top: 0%;
    left: 0%;
    width: 100%;
    height: 100%;
    font-size: calc(0.25 * var(--button-size));
    padding: 0% 0% 0% 4%;
    text-align: center;
    align-content: center;
}

.p4 {
    background-color: #0C0;
    clip-path: polygon(15% 0%, 85% 0%, 100% 15%, 100% 85%, 85% 100%, 15% 100%, 0% 85%, 0% 15%);
    color: #444;
}

.p5 {
    transform: translateZ(calc(0.05 * var(--button-size)));
    color: black;
    pointer-events: none;
}
</style>