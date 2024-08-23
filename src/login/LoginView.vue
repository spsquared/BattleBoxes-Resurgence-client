<script setup lang="ts">
import { connectionState } from '@/server';
import LoginBackground from './LoginBackground.vue';
</script>

<template>
    <Transition>
        <div class="loginView" v-if="!connectionState.loggedIn">
            <LoginBackground></LoginBackground>
            <form class="loginForm" onsubmit="">

            </form>
        </div>
    </Transition>
</template>

<style scoped>
.loginView {
    display: flex;
    position: fixed;
    top: 0px;
    left: 0px;
    width: 100vw;
    height: 100vh;
    background-color: white;
    align-items: center;
}

.loginForm {
    display: flex;
    flex-direction: column;
    background-color: lime;
}

.v-enter-active,
.v-leave-active {
    transition: 500ms ease-in-out transform;
}

.v-enter-from,
.v-leave-to {
    transform: translateY(-100%);
}

.v-enter-to,
.v-leave-from {
    transform: translateY(0px);
}
</style>