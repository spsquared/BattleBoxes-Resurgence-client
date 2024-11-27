<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { currentPage } from './menu/nav';
import { connectionState } from './server';
import GameView from './game/GameView.vue';
import GameSelectView from './gameSelect/GameSelectView.vue';
import MenuView from './menu/MenuView.vue';
import LoginView from './login/LoginView.vue';
import PageTransition from './menu/PageTransition.vue';
import FullscreenModal, { ModalMode } from './components/modal/FullscreenModal.vue';
import { modal } from './components/modal';
import { hideRecaptcha } from './login/recaptcha';

const modalComponent = ref<InstanceType<typeof FullscreenModal>>();

watch(() => modalComponent.value, () => {
    if (modalComponent.value != undefined) modal.setModal(modalComponent.value);
});

window.addEventListener('error', (err) => {
    modal.showModal({ title: 'An error occured', content: `<span style="color: red;">${err.message}<br>${err.filename} ${err.lineno}:${err.colno}</span>`, color: 'red' });
});

watch(() => connectionState.loggedIn, () => {
    if (!connectionState.loggedIn) modal.showModal({
        title: 'Logged out',
        content: 'You were disconnected or logged out from the server.<br>Press OK to reload.',
        mode: ModalMode.CONFIRM
    }).result.then((confirmation) => {
        if (confirmation) window.location.reload();
    });
});

onMounted(() => hideRecaptcha());
</script>

<template>
    <GameView v-if="currentPage == 'game'"></GameView>
    <GameSelectView v-if="currentPage == 'gameSelect'"></GameSelectView>
    <MenuView v-if="currentPage == 'menu'"></MenuView>
    <LoginView></LoginView>
    <PageTransition></PageTransition>
    <a class="copyrightNotice" href="https://www.gnu.org/licenses/gpl-3.0-standalone.html" target="_blank" v-if="currentPage == 'menu' || !connectionState.loggedIn">Copyright &copy; 2024 Sampleprovider(sp)</a>
    <FullscreenModal ref="modalComponent"></FullscreenModal>
</template>

<style scoped>
.copyrightNotice {
    position: absolute;
    bottom: 8px;
    left: 8px;
    color: black !important;
    opacity: 1;
    z-index: 3;
}
</style>