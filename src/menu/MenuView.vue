<script setup lang="ts">
import { modal } from '@/components/modal';
import { gameInstance } from '@/game/game';
import { httpCodeToMessage, serverFetch } from '@/server';
import * as Inputs from '@/components/inputs';
import MenuPlayButton from './MenuPlayButton.vue';

const logout = async () => {
    const res = await serverFetch('/logout', 'POST');
    console.log(res)
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
        <div class="menuView" v-if="gameInstance === null">
            <div class="menuFlow">
                <MenuPlayButton></MenuPlayButton>
                <Inputs.TextButton text="Log Out" class="menuButton" @click="logout()"></Inputs.TextButton>
            </div>
        </div>
    </Transition>
    <a class="copyrightNotice" href="https://www.gnu.org/licenses/gpl-3.0-standalone.html" target="_blank">Copyright &copy; 2024 Sampleprovider(sp)</a>
</template>

<style>
@keyframes menuTransition {
    0% {
        display: block;
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
    row-gap: 0.8em;
    padding-top: 8vh;
}

.menuButton {
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

/* no transition */
</style>