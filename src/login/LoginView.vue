<script setup lang="ts">
import { connectionState } from '@/server';
import LoginBackground from './LoginBackground.vue';
import * as Inputs from '@/components/inputs';
</script>

<template>
    <Transition>
        <div class="loginView" v-if="!connectionState.loggedIn">
            <LoginBackground></LoginBackground>
            <form class="loginForm" onsubmit="">
                <div class="loginHeader">
                    <span style="color: #0C0; font-size: var(--font-title); line-height: 0.6em;">BATTLEBOXES</span>
                    <br>
                    <span style="color: #F00; font-size: var(--font-subtitle);">Resurgence</span>
                </div>
                <Inputs.TextBox></Inputs.TextBox>
            </form>
        </div>
    </Transition>
</template>

<style scoped>
.loginView {
    position: fixed;
    top: 0px;
    left: 0px;
    width: 100vw;
    height: 100vh;
    background-color: white;
    align-items: center;
    z-index: 2;
}

.loginForm {
    display: flex;
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100vw;
    height: 100vh;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: none;
}

.loginForm>* {
    pointer-events: auto;
}

.loginHeader {
    text-align: center;
    pointer-events: none;
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