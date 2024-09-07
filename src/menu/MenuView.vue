<script setup lang="ts">
import { modal } from '@/components/modal';
import { connectionState, httpCodeToMessage, serverFetch } from '@/server';
import { currentPage, showFadeScreen } from '@/menu/nav';
import * as Inputs from '@/components/inputs';
import MenuPlayButton from './MenuPlayButton.vue';
import { watch } from 'vue';

watch(currentPage, (p) => {
    if (p == 'menu') showFadeScreen.value = false;
});

// delete this later, just set a ref to true
const settingsnowork = () => {
    modal.showModal({ title: 'oof', content: 'lol that doesn\'t do anything'})
}

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
    <div class="menuView" v-if="currentPage == 'menu'">
        <div class="menuFlow">
            <MenuPlayButton></MenuPlayButton>
            <div class="menuButtons">
                <Inputs.TextButton text="Settings" title="Settings" @click="settingsnowork()" class="menuButton" background-color="dodgerBlue"></Inputs.TextButton>
                <Inputs.TextButton text="Log Out" title="Log Out" @click="logout()" class="menuButton" background-color="red"></Inputs.TextButton>
            </div>
        </div>
    </div>
    <a class="copyrightNotice" href="https://www.gnu.org/licenses/gpl-3.0-standalone.html" target="_blank" v-if="currentPage == 'menu' || !connectionState.loggedIn">Copyright &copy; 2024 Sampleprovider(sp)</a>
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

.copyrightNotice {
    position: absolute;
    bottom: 8px;
    left: 8px;
    color: black;
    opacity: 1;
    z-index: 3;
}
</style>