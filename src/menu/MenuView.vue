<script setup lang="ts">
import { modal } from '@/components/modal';
import { httpCodeToMessage, serverFetch } from '@/server';
import { currentPage, showFadeScreen } from '@/menu/nav';
import * as Inputs from '@/components/inputs';
import MenuPlayButton from './MenuPlayButton.vue';
import { onMounted } from 'vue';

onMounted(() => showFadeScreen.value = false);

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
    <Transition>
        <div class="menuView" v-if="currentPage == 'menu'">
            <div class="menuFlow">
                <MenuPlayButton></MenuPlayButton>
                <div class="menuButtons">
                    <Inputs.TextButton text="Settings" class="menuButton" background-color="dodgerBlue"></Inputs.TextButton>
                    <Inputs.TextButton text="Log Out" class="menuButton" background-color="red" @click="logout()"></Inputs.TextButton>
                </div>
            </div>
        </div>
    </Transition>
    <a class="copyrightNotice" href="https://www.gnu.org/licenses/gpl-3.0-standalone.html" target="_blank">Copyright &copy; 2024 Sampleprovider(sp)</a>
</template>

<style>
@keyframes menu-transition-in {
    0% {
        display: none;
    }

    50% {
        display: none;
    }

    100% {
        display: block;
    }
}

@keyframes menu-transition-out {
    0% {
        display: block;
    }

    50% {
        display: block;
    }

    100% {
        display: none;
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

.menuFlow {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: min(5vw, 5vh);
    padding-top: 8vh;
}

.menuButtons {
    display: flex;
    flex-direction: column;
    align-items: center;
    row-gap: 0.8em;
    margin-top: 1em;
}

.menuButton {
    width: 100%;
    font-size: min(5vw, 4vh);
    border-width: 0.2em;
}

.menuButton:hover {
    transform: translateY(-0.1em);
}

.menuButton:active {
    transform: translateY(0.1em);
}

.copyrightNotice {
    position: absolute;
    bottom: 8px;
    left: 8px;
    color: black;
    opacity: 1;
    z-index: 3;
}

.v-enter-active {
    animation: 1000ms linear menu-transition-in;
}

.v-leave-active {
    animation: 1000ms linear menu-transition-out;
}
</style>