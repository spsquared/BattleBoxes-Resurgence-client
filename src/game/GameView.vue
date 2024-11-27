<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { modal, ModalMode } from '@/components/modal';
import './game';
import gameInstance from './game';
import transition from '@/menu/nav';
import * as Inputs from '@/components/inputs';
import GameChat from './GameChat.vue';
import GameLobbyInfo from './GameLobbyInfo.vue';

const attachGameInstanceStuff = () => {
    gameInstance.value?.loadPromise.then(() => {
        transition.end();
        gameInstance.value?.addKeybind('escape', () => {
            menuOpen.value = !menuOpen.value;
            if (gameInstance.value) gameInstance.value.acceptInputs = !menuOpen.value;
            // play sound
        });
    });
};
onMounted(() => {
    document.getElementById('gameView')?.addEventListener('contextmenu', (e) => e.preventDefault());
    attachGameInstanceStuff();
});
watch(gameInstance, () => {
    if (gameInstance.value !== undefined) attachGameInstanceStuff();
});

const menuOpen = ref(false);
const closeMenu = () => {
    menuOpen.value = false;
    if (gameInstance.value) gameInstance.value.acceptInputs = true;
};
const openSettings = () => {
    modal.showModal({ title: 'oof', content: 'lol that doesn\'t do anything' })
};
const leaveGame = () => {
    modal.showModal({
        title: 'Leave game?',
        content: 'You won\'t be able to rejoin if the game already started!',
        mode: ModalMode.INPUT,
        color: 'red'
    }).result.then((value) => {
        if (value) gameInstance.value?.destroy();
    });
};
</script>

<template>
    <div class="gameView" id="gameView">
        <GameChat></GameChat>
        <GameLobbyInfo v-if="!gameInstance?.gameInfo.running"></GameLobbyInfo>
        <Transition name="menu">
            <div class="gameMenu" v-if="menuOpen">
                <div class="gameMenuFlow">
                    <Inputs.TextButton text="Resume" class="menuButton" @click="closeMenu" background-color="#0C0"></Inputs.TextButton>
                    <Inputs.TextButton text="Settings" class="menuButton" @click="openSettings" background-color="dodgerblue"></Inputs.TextButton>
                    <Inputs.TextButton text="Leave" class="menuButton" @click="leaveGame" background-color="red"></Inputs.TextButton>
                </div>
            </div>
        </Transition>
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

.gameMenu {
    display: grid;
    position: fixed;
    top: 0px;
    left: 0px;
    width: 100vw;
    height: 100vh;
    backdrop-filter: blur(4px);
    transition: 100ms linear backdrop-filter;
    align-items: center;
    justify-content: center;
}

.gameMenuFlow {
    display: flex;
    flex-direction: column;
    min-width: 20vw;
    row-gap: min(1vw, 1vh);
    transition: 250ms ease transform;
}

.menuButton {
    width: 100%;
    font-size: min(4vw, 3vh);
    border-width: 0.2em;
    transition-duration: 100ms;
}

.menuButton:hover {
    transform: translateY(-0.2em);
}

.menuButton:active {
    transform: translateY(0.2em);
}

.menu-enter-from,
.menu-leave-to {
    backdrop-filter: blur(0px);
}

.menu-enter-to,
.menu-leave-from {
    backdrop-filter: blur(4px);
}

.menu-enter-from>.gameMenuFlow,
.menu-leave-to>.gameMenuFlow {
    transform: translateY(-100vh);
}

.menu-enter-to>.gameMenuFlow,
.menu-leave-from>.gameMenuFlow {
    transform: translateY(0vh);
}
</style>