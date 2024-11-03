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
            </div>
        </div>
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
    background-color: v-bind("ControlledPlayer.self?.color");
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
    column-gap: 12px;
    font-size: 12px;
    margin: 0px 16px;
    color: #DDD;
}
</style>