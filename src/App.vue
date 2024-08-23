<script setup lang="ts">
import GameView from './game/GameView.vue';
import MenuView from './menu/MenuView.vue';
import LoginView from './login/LoginView.vue';
</script>

<template>
    <GameView></GameView>
    <MenuView></MenuView>
    <LoginView></LoginView>
</template>

<style scoped>
* {
    color: white;
}

.v-enter-active,
.v-leave-active {
    transition-duration: 1000ms;
}
</style>