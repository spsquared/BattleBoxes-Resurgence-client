<script setup lang="ts">
import { modal } from '@/components/modal';
import { showFadeScreen, startTransitionTo } from '@/menu/nav';
import { onMounted, reactive, ref, watch } from 'vue';
import { httpCodeToMessage, serverFetch } from '@/server';
import * as Inputs from '@/components/inputs';
import GameSelectBackground from './GameSelectBackground.vue';
import { executeRecaptcha } from '@/login/recaptcha';
import { GameInstance, gameInstance } from '@/game/game';

onMounted(() => showFadeScreen.value = false);

const pane = ref<'select' | 'create'>('select');

const joinCode = ref<string>('');
const joinCodeValid = ref<boolean>(false);
watch(joinCode, () => {
    joinCodeValid.value = /^[A-Za-z0-9]{6}$/.test(joinCode.value);
});

const options = reactive<{
    maxPlayers: number
    aiPlayers: number
    public: boolean
}>({
    maxPlayers: 8,
    aiPlayers: 0,
    public: true
});

const createGameWait = ref<boolean>(false);

const createGame = async () => {
    createGameWait.value = true;
    const token = await executeRecaptcha('create_game');
    const res = await serverFetch('/games/createGame', 'POST', { ...options, captcha: token });
    if (res.status == 200) {
        const { id, authCode } = await res.json();
        gameInstance.value = new GameInstance(id, authCode);
    } else {
        modal.showModal({
            title: 'Could not create game',
            content: httpCodeToMessage(res.status, 'Account'),
            color: 'red'
        });
        createGameWait.value = false;
    }
};
</script>

<template>
    <div class="gameSelectView">
        <GameSelectBackground></GameSelectBackground>
        <Transition name="paneSelect">
            <div class="paneWrapper" v-if="pane == 'select'">
                <div class="paneFlow">
                    <Inputs.TextButton text="Create Game" title="Create a new game" @click="pane = 'create'" style="margin: 0px;" background-color="#0C0"></Inputs.TextButton>
                    <div class="separatorLine">
                        <div></div>
                        <span>OR</span>
                        <div></div>
                    </div>
                    <form class="joinGameCodeContainer" action="javascript:void(0)">
                        <Inputs.TextBox v-model="joinCode" placeholder="Join Code" style="flex-grow: 1; text-align: center;" title="6-character join code, letters and numbers" maxlength="6" pattern="[A-Za-z0-9]{6}"></Inputs.TextBox>
                        <Inputs.IconButton class="joinCodeButton" text="" type="submit" title="Join game" img="/assets/arrow-right.svg" img-only width="calc(4 * var(--font-small))" background-color="#0C0" :disabled="!joinCodeValid"></Inputs.IconButton>
                    </form>
                    <div class="gameList"></div>
                </div>
            </div>
        </Transition>
        <Transition name="paneCreate">
            <div class="paneWrapper" v-if="pane == 'create'">
                <div class="paneFlow">
                    <Inputs.TextButton text="Cancel" title="Back to game select screen" @click="pane = 'select'" style="margin: 0px;" background-color="#F00" :disabled="createGameWait"></Inputs.TextButton>
                    <div class="separatorLine">
                        <div></div>
                        <span>Create Game</span>
                        <div></div>
                    </div>
                    <div class="gameOptionsWrapper">
                        <div class="gameOptionsTable">
                            <label for="optMaxPlayers">Max Players:</label>
                            <Inputs.NumberBox v-model="options.maxPlayers" id="optMaxPlayers" title="Maximum amount of players, including AI players" :min="0" :max="8" :step="1" width="8em"></Inputs.NumberBox>
                            <label for="optAIPlayers">AI Players:</label>
                            <Inputs.NumberBox v-model="options.aiPlayers" id="optAIPlayers" title="Amount of AI agents to spawn" :min="0" :max="8" :step="1" width="8em"></Inputs.NumberBox>
                            <label for="optPublic">Public:</label>
                            <Inputs.ToggleButton v-model="options.public" id="optPublic" title="Allow any player to join from game list"></Inputs.ToggleButton>
                            <!-- <label for="opt">Option:</label>
                            <Inputs.NumberBox id="opt" title="Description" width="8em"></Inputs.NumberBox> -->
                        </div>
                    </div>
                    <Inputs.TextButton text="Create" title="Start game and go to lobby!" @click="createGame()" style="margin: 0px;" background-color="dodgerblue" :disabled="createGameWait"></Inputs.TextButton>
                </div>
            </div>
        </Transition>
        <Inputs.IconButton class="closeButton" text="Menu" title="Back to menu" img="/assets/arrow-left.svg" background-color="#F00" @click="startTransitionTo('menu')" :disabled="createGameWait"></Inputs.IconButton>
    </div>
</template>

<style scoped>
.gameSelectView {
    position: fixed;
    top: 0px;
    left: 0px;
    width: 100vw;
    height: 100vh;
    z-index: 2;
}

.paneWrapper {
    display: flex;
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100vw;
    height: 100vh;
    align-items: center;
    justify-content: center;
}

.paneSelect-enter-active,
.paneSelect-leave-active,
.paneCreate-enter-active,
.paneCreate-leave-active {
    transition: 500ms ease transform;
}

.paneSelect-enter-from,
.paneSelect-leave-to {
    transform: translateY(-100vh);
}

.paneCreate-enter-from,
.paneCreate-leave-to {
    transform: translateY(100vh);
}

.paneSelect-enter-to,
.paneSelect-leave-from,
.paneCreate-enter-to,
.paneCreate-leave-from {
    transform: translateY(0vh);
}

.paneFlow {
    display: flex;
    position: relative;
    flex-direction: column;
    box-sizing: border-box;
    min-width: 40vw;
    max-width: 90vw;
    min-height: 60vh;
    max-height: 100vh;
    padding: 8px 8px;
    background-color: #555;
    border: 4px solid white;
    row-gap: 4px;
    overflow-y: auto;
}

.separatorLine {
    display: flex;
    font-size: var(--font-18);
    color: white;
    align-items: center;
}

.separatorLine>div {
    flex-grow: 1;
    background-color: white;
    height: 2px;
    margin: 0px 6px;
}

.joinGameCodeContainer {
    display: flex;
    flex-direction: row;
    column-gap: 8px;
}

.joinGameCodeContainer>* {
    margin: 0px 0px;
}

.joinCodeButton {
    border-color: black !important;
    filter: v-bind("joinCodeValid ? '' : 'grayscale(1)'");
}

.createGameHeader {
    font-size: var(--font-16);
    color: white;
    text-align: center;
}

.gameOptionsWrapper {
    display: flex;
    flex-direction: row;
    justify-content: center;
}

.gameOptionsTable {
    display: grid;
    grid-template-columns: min-content 1fr;
    align-items: center;
    text-align: left;
    row-gap: 4px;
}

.gameOptionsTable>*:nth-child(odd) {
    font-size: var(--font-16);
    text-align: right;
    color: white;
    text-wrap: nowrap;
}

.closeButton {
    position: absolute;
    top: 16px;
    left: 16px;
    margin: 0px;
    border-color: white;
}
</style>