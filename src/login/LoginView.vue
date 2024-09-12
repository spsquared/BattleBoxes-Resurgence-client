<script setup lang="ts">
import { connectionState, httpCodeToMessage, serverFetch } from '@/server';
import LoginBackground from './LoginBackground.vue';
import * as Inputs from '@/components/inputs';
import { ref } from 'vue';
import { modal } from '@/components/modal';
import LoadingSpinner from '@/components/loaders/LoadingSpinner.vue';
import { executeRecaptcha } from './recaptcha';

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
const login = async () => {
    if (!checkValidity()) return;
    waitForLogin.value = true;
    const token = await executeRecaptcha('login');
    const loginUsername = username.value;
    const res = await serverFetch('/login', 'POST', { username: loginUsername, password: password.value, captcha: token });
    if (res.status == 200) {
        connectionState.loggedIn = true;
        connectionState.username = loginUsername;
    } else modal.showModal({
        title: 'Could not log in',
        content: httpCodeToMessage(res.status, 'Account'),
        color: '#F00'
    });
    waitForLogin.value = false;
};
const signup = async () => {
    if (!checkValidity()) return;
    waitForLogin.value = true;
    const token = await executeRecaptcha('signup');
    const signupUsername = username.value;
    const res = await serverFetch('/signup', 'POST', { username: signupUsername, password: password.value, captcha: token });
    if (res.status == 200) {
        connectionState.loggedIn = true;
        connectionState.username = signupUsername;
    } else modal.showModal({
        title: 'Could not sign up',
        content: httpCodeToMessage(res.status, 'Account'),
        color: '#F00'
    });
    waitForLogin.value = false;
};
</script>

<template>
    <Transition>
        <div class="loginView" v-if="!connectionState.loggedIn">
            <LoginBackground></LoginBackground>
            <div class="loginFlowWrapper">
                <div class="loginFlow">
                    <div class="loginHeader">
                        <span style="color: #0C0; font-size: var(--font-title);">BATTLEBOXES</span>
                        <br>
                        <span style="color: #F00; font-size: var(--font-subtitle); line-height: 0.5em;">Resurgence</span>
                    </div>
                    <form :class="{ loginForm: true, loginFormHidden: !connectionState.connected }" action="javascript:void(0)">
                        <Inputs.TextBox v-model="username" placeholder="Username" width="200px" title="Username (alphanumeric and/or dash/underscore)" maxlength="16" autocomplete="username" autocapitalize="off" highlight-invalid required></Inputs.TextBox>
                        <Inputs.TextBox v-model="password" placeholder="Password" type="password" width="200px" title="Password" maxlength="128" autocomplete="current-password" required></Inputs.TextBox>
                        <span style="text-wrap: nowrap;">
                            <Inputs.TextButton text="Log in" @click="login()" width="96px" type="submit" background-color="#0C0" :disabled="waitForLogin"></Inputs.TextButton>
                            <Inputs.TextButton text="Sign Up" @click="signup()" width="96px" type="submit" background-color="dodgerblue" :disabled="waitForLogin"></Inputs.TextButton>
                        </span>
                    </form>
                    <LoadingSpinner :class="{ connectSpinner: true, connectSpinnerHidden: connectionState.connected }"></LoadingSpinner>
                    <span class="loginMsgWrapper">
                        <span class="loginMsg">{{ loginMsg }}</span>
                        <Transition name="connectmsg">
                            <span class="loginConnectMsg" v-if="!connectionState.connected">{{ connectionState.connectionFailed ? 'Error connecting to server, retrying...' : 'Connecting to server...' }}</span>
                        </Transition>
                    </span>
                </div>
            </div>
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

.loginFlowWrapper {
    display: flex;
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100vw;
    height: 100vh;
    align-items: center;
    justify-content: center;
    pointer-events: none;
}

.loginFlow {
    display: grid;
    align-items: center;
    justify-items: center;
}

.loginHeader {
    grid-row: 1;
    grid-column: 1;
    margin-bottom: var(--font-subsubtitle);
    text-align: center;
    pointer-events: none;
}

.loginForm {
    grid-row: 2;
    grid-column: 1;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    row-gap: 8px;
    transition: 500ms linear opacity;
    transition-delay: 250ms;
}

.loginForm>* {
    pointer-events: auto;
}

.loginFormHidden {
    opacity: 0;
}

.loginFormHidden>* {
    pointer-events: none;
}

.connectSpinner {
    grid-row: 2;
    grid-column: 1;
    width: 8em;
    height: 8em;
    transition: 500ms linear opacity;
}

.connectSpinnerHidden {
    opacity: 0;
}

.loginMsgWrapper {
    grid-row: 3;
    grid-column: 1;
    position: relative;
    width: 100%;
    font-size: var(--font-16);
    height: 8em;
    margin-top: 8px;
    pointer-events: none;
}

.loginMsg {
    position: absolute;
    width: 100%;
    color: #F00;
    text-align: center;
}

.loginConnectMsg {
    position: absolute;
    width: 100%;
    color: v-bind("connectionState.connectionFailed ? '#F00' : '#0C0'");
    font-size: var(--font-medium);
    text-align: center;
}

.v-enter-active,
.v-leave-active {
    transition: 500ms ease-in-out transform;
}

.v-enter-from,
.v-leave-to {
    transform: translateY(calc(-100% - 16px));
}

.v-enter-to,
.v-leave-from {
    transform: translateY(0px);
}

.connectmsg-enter-active,
.connectmsg-leave-active {
    transition: 500ms linear opacity;
}

.connectmsg-enter-from,
.connectmsg-leave-to {
    opacity: 0;
}

.connectmsg-enter-to,
.connectmsg-leave-from {
    opacity: 1;
}
</style>