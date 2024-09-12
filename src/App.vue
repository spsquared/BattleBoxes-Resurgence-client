<script setup lang="ts">
import { ref, watch } from 'vue';
import { currentPage } from './menu/nav';
import { connectionState } from './server';
import GameView from './game/GameView.vue';
import GameSelectView from './gameSelect/GameSelectView.vue';
import MenuView from './menu/MenuView.vue';
import LoginView from './login/LoginView.vue';
import FadeTransition from './menu/FadeTransition.vue';
import FullscreenModal, { ModalMode } from './components/modal/FullscreenModal.vue';
import { modal } from './components/modal';

const modalComponent = ref<InstanceType<typeof FullscreenModal>>();

watch(() => modalComponent.value, () => {
    if (modalComponent.value != undefined) modal.setModal(modalComponent.value);
});

watch(() => connectionState.loggedIn, () => {
    if (!connectionState.loggedIn) modal.showModal({
        title: 'Logged out',
        content: 'You were disconnected or logged out from the server.<br>Press OK to reload.',
        mode: ModalMode.CONFIRM
    }).result.then(() => window.location.reload());
});
</script>

<template>
    <GameView v-if="currentPage == 'game'"></GameView>
    <GameSelectView v-if="currentPage == 'gameSelect'"></GameSelectView>
    <MenuView v-if="currentPage == 'menu'"></MenuView>
    <LoginView></LoginView>
    <FadeTransition></FadeTransition>
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