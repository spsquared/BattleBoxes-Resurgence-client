<script setup lang="ts">
import { ref, watch } from 'vue';
import GameView from './game/GameView.vue';
import GameSelectView from './gameSelect/GameSelectView.vue';
import MenuView from './menu/MenuView.vue';
import LoginView from './login/LoginView.vue';
import FadeTransition from './menu/FadeTransition.vue';
import FullscreenModal from './components/modal/FullscreenModal.vue';
import { modal } from './components/modal';

const modalComponent = ref<InstanceType<typeof FullscreenModal>>();

watch(() => modalComponent.value, () => {
    if (modalComponent.value != undefined) modal.setModal(modalComponent.value);
});
</script>

<template>
    <GameView></GameView>
    <GameSelectView></GameSelectView>
    <MenuView></MenuView>
    <LoginView></LoginView>
    <FadeTransition></FadeTransition>
    <FullscreenModal ref="modalComponent"></FullscreenModal>
</template>

<style scoped>
.v-enter-active,
.v-leave-active {
    transition-duration: 1000ms;
}
</style>