<script setup lang="ts">
import { connectionState } from '@/server';
import LoginBackground from './LoginBackground.vue';
import * as Inputs from '@/components/inputs';
import { ref, watch } from 'vue';
import { modal } from '@/components/modal';

import { test } from '@/server';

const waitForLogin = ref(false);
const username = ref('');
const password = ref('');
const loginMsg = ref('');
const checkValidity = (): boolean => {
    if (username.value.length < 3 || username.value.length > 16 || !/^[a-z0-9\-_]*$/.test(username.value)) {
        loginMsg.value = 'Username must be 3-16 characters long, and only alphanumeric and dashes/underscores';
        return false;
    }
    if (password.value.length == 0 || password.value.length > 128) {
        loginMsg.value = 'Password required and must be less than 128 characters long';
        return false;
    }
    loginMsg.value = '';
    return true;
};
const login = () => {
    if (!checkValidity()) return;
    waitForLogin.value = true;
};
const signup = () => {
    if (!checkValidity()) return;
    waitForLogin.value = true;
    console.log('b')
};

const checks = new Array(11).fill(false);
watch(test, () => checks[0] = true)
watch(() => test.value.buh, () => checks[1] = true)
watch(() => test.value.buh.oof, () => checks[2] = true)
watch(() => test.value.e, () => checks[3] = true)
watch(() => test.value.testtest, () => checks[4] = true)
watch(() => test.value.testtest.u1, () => checks[5] = true)
watch(() => test.value.testtest.u2, () => checks[6] = true)
watch(() => test.value.testtest.u2.s, () => checks[7] = true)
watch(() => test.value.testtest.u3, () => checks[8] = true)
watch(() => test.value.anotherClass, () => checks[9] = true)
watch(() => test.value.anotherClass.variable, () => checks[10] = true)
setInterval(() => console.log(checks), 1000)
</script>

<template>
    <Transition>
        <div class="loginView" v-if="!connectionState.loggedIn">
            <LoginBackground></LoginBackground>
            <form class="loginForm" action="javascript:void(0)">
                <div class="loginHeader">
                    <span style="color: #0C0; font-size: var(--font-title); line-height: 0.6em;">BATTLEBOXES</span>
                    <br>
                    <span style="color: #F00; font-size: var(--font-subtitle);">Resurgence</span>
                </div>
                <br>
                <Inputs.TextBox v-model="username" placeholder="Username" width="200px" style="margin-bottom: 8px;" title="Username (alphanumeric and/or dash/underscore)" maxlength="16" autocomplete="username" autocapitalize="off" highlight-invalid required></Inputs.TextBox>
                <Inputs.TextBox v-model="password" placeholder="Password" type="password" width="200px" style="margin-bottom: 8px;" title="Password" maxlength="128" autocomplete="current-password" required></Inputs.TextBox>
                <span style="text-wrap: nowrap;">
                    <Inputs.TextButton text="Log in" @click="login()" width="96px" type="submit" background-color="#0C0" :disabled="waitForLogin"></Inputs.TextButton>
                    <Inputs.TextButton text="Sign Up" @click="signup()" width="96px" type="submit" background-color="dodgerblue" :disabled="waitForLogin"></Inputs.TextButton>
                </span>
                <span class="loginMsgWrapper">
                    <span class="loginMsg">{{ loginMsg }}</span>
                    {{ test.buh.oof }}
                    {{ test.e }}
                    {{ test.testtest.u1 }}
                    {{ test.testtest.u2 }}
                    {{ test.testtest.u3 }}
                    {{ test.testtest.u2.s }}
                    {{ test.anotherClass }}
                    {{ test.anotherClass.variable }}
                </span>
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

.loginMsgWrapper {
    position: relative;
    width: 40vw;
    height: 2em;
    margin-top: 8px;
    pointer-events: none;
}

.loginMsg {
    position: absolute;
    width: 40vw;
    color: red;
    text-align: center;
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