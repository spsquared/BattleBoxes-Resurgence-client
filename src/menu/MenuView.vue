<script setup lang="ts">
import { modal } from '@/components/modal';
import { httpCodeToMessage, serverFetch } from '@/server';
import transition from '@/menu/nav';
import * as Inputs from '@/components/inputs';
import MenuPlayButton from './MenuPlayButton.vue';
import { onMounted } from 'vue';

onMounted(() => transition.end());

const openSettings = () => {
    modal.showModal({ title: 'oof', content: 'lol that doesn\'t do anything'})
};
const logout = async () => {
    const res = await serverFetch('/logout', 'POST');
    if (res.status == 200) window.location.reload();
    else modal.showModal({
        title: 'Unexpected error logging out',
        content: httpCodeToMessage(res.status),
        color: '#F00'
    });
};

</script>

<template>
    <div class="menuView">
        <div class="menuFlow">
            <MenuPlayButton></MenuPlayButton>
            <div class="menuButtons">
                <Inputs.TextButton text="Settings" title="Settings" @click="openSettings()" class="menuButton" background-color="dodgerBlue"></Inputs.TextButton>
                <Inputs.TextButton text="Log Out" title="Log Out" @click="logout()" class="menuButton" background-color="red"></Inputs.TextButton>
            </div>
        </div>
    </div>
</template>

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

.menuFlow {
    display: grid;
    grid-template-rows: 1fr min-content;
    height: 100vh;
    align-items: center;
    justify-content: center;
    font-size: min(5vw, 5vh);
}

.menuButtons {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    row-gap: 0.8em;
    margin-bottom: 1em;
}

.menuButton {
    width: 100%;
    font-size: min(5vw, 4vh);
    border-width: 0.2em;
    transition-duration: 100ms;
}

.menuButton:hover {
    transform: translateY(-0.2em);
}

.menuButton:active {
    transform: translateY(0.2em);
}
</style>