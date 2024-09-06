<script setup lang="ts">
import { modal } from '@/components/modal';
import { gameInstance } from '@/game/game';
import { httpCodeToMessage, serverFetch } from '@/server';
import * as Inputs from '@/components/inputs';

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
            oof
            <Inputs.TextButton text="Log Out" @click="logout()"></Inputs.TextButton>
        </div>
    </Transition>
    <span class="copyrightNotice">Copyright &copy; 2024 Sampleprovider(sp)</span>
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

.copyrightNotice {
    position: fixed;
    bottom: 8px;
    left: 8px;
    color: black;
}

/* no transition */
</style>