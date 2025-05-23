<script setup lang="ts">
import { modal } from '@/components/modal';
import transition from '@/menu/nav';
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { checkConnection, httpCodeToMessage, serverFetch } from '@/server';
import * as Inputs from '@/components/inputs';
import GameSelectBackground from './GameSelectBackground.vue';
import { GameInstance, type GameInfo } from '@/game/game';
import LoadingSpinner from '@/components/loaders/LoadingSpinner.vue';

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

const joinGameWait = ref<boolean>(false);

const gameList = ref<GameInfo[]>([]);
const loadGameList = async () => {
    const res = await serverFetch('/games/gameList');
    if (res.status == 200) {
        gameList.value = await res.json();
    } else {
        clearInterval(gameListRefreshTimer);
        await modal.showModal({
            title: 'Could not fetch game list',
            content: httpCodeToMessage(res.status),
            color: 'red'
        }).result;
        checkConnection();
    }
};
let gameListRefreshTimer: NodeJS.Timeout | undefined;
onMounted(async () => {
    if (gameListRefreshTimer != undefined) clearInterval(gameListRefreshTimer);
    gameListRefreshTimer = setInterval(loadGameList, 10000);
    gameList.value = [];
    await loadGameList();
    transition.end();
});
onUnmounted(() => {
    if (gameListRefreshTimer != undefined) clearInterval(gameListRefreshTimer);
});

const joinGame = async (code: string) => {
    joinGameWait.value = true;
    const res = await serverFetch('/games/joinGame/' + code, 'POST');
    if (res.status == 200) {
        const { id, authCode } = await res.json();
        new GameInstance(id, authCode);
    } else {
        joinGameWait.value = false;
        await modal.showModal({
            title: 'Could not join game',
            content: httpCodeToMessage(res.status, 'Account or game'),
            color: 'red'
        }).result;
        checkConnection();
    }
};

const createGame = async () => {
    joinGameWait.value = true;
    const res = await serverFetch('/games/createGame', 'POST', { ...options });
    if (res.status == 200) {
        const { id, authCode } = await res.json();
        new GameInstance(id, authCode);
    } else {
        joinGameWait.value = false;
        await modal.showModal({
            title: 'Could not create game',
            content: httpCodeToMessage(res.status, 'Account'),
            color: 'red'
        }).result;
        checkConnection();
    }
};
</script>

<template>
    <div class="gameSelectView">
        <GameSelectBackground></GameSelectBackground>
        <Transition name="paneSelect">
            <div class="paneWrapper" v-if="pane == 'select'">
                <div class="paneFlow">
                    <Inputs.TextButton text="Create Game" class="forceBorder" title="Create a new game" @click="pane = 'create'" style="margin: 0px;" background-color="#0C0" :disabled="joinGameWait"></Inputs.TextButton>
                    <div class="separatorLine">
                        <div></div>
                        <span>OR</span>
                        <div></div>
                    </div>
                    <form class="joinGameCodeContainer" action="javascript:void(0)">
                        <Inputs.TextBox v-model="joinCode" placeholder="Join Code" style="flex-grow: 1; text-align: center;" title="6-character join code, letters and numbers" maxlength="6" pattern="[A-Za-z0-9]{6}"></Inputs.TextBox>
                        <Inputs.IconButton class="joinCodeButton forceBorder" text="" type="submit" title="Join game" img="/assets/arrow-right.svg" img-only background-color="#0C0" @click="joinGame(joinCode)" :disabled="!joinCodeValid || joinGameWait"></Inputs.IconButton>
                    </form>
                    <div class="gameListWrapper">
                        <div class="gameList">
                            <TransitionGroup name="entry">
                                <div class="gameEntryWrapper" v-for="(entry, index) of gameList" :key="entry.id" :style="{ transitionDelay: (index * 100) + 'ms' }">
                                    <div class="gameEntry" :style="{ transitionDelay: (index * 100) + 'ms' }">
                                        <div class="gameEntryInfo">
                                            <span class="gameEntryId">{{ entry.id }}</span>
                                            <span class="gameEntryHost">Host: <span style="font-weight: bold">{{ entry.host }}</span></span>
                                        </div>
                                        <div class="gameEntryInfo gameEntryInfo2">
                                            <span>
                                                <span :style="{ color: entry.players == (entry.maxPlayers - entry.aiPlayers) ? '#F00' : '#050'}">
                                                    {{ entry.players }}
                                                </span>
                                                /
                                                {{ entry.maxPlayers - entry.aiPlayers }}
                                                Players
                                            </span>
                                            <span>{{ entry.aiPlayers }} AI</span>
                                        </div>
                                        <Inputs.IconButton class="gameEntryJoinButton forceBorder" text="" title="Join game" img="/assets/arrow-right.svg" img-only background-color="#0C0" @click="joinGame(entry.id)" :disabled="joinGameWait"></Inputs.IconButton>
                                    </div>
                                </div>
                            </TransitionGroup>
                        </div>
                    </div>
                    <Transition name="wait">
                        <div class="waitCover" v-if="joinGameWait">
                            <LoadingSpinner class="waitSpinner"></LoadingSpinner>
                        </div>
                    </Transition>
                </div>
            </div>
        </Transition>
        <Transition name="paneCreate">
            <div class="paneWrapper" v-if="pane == 'create'">
                <div class="paneFlow">
                    <Inputs.TextButton text="Cancel" class="forceBorder" title="Back to game select screen" @click="pane = 'select'" style="margin: 0px;" background-color="#F00" :disabled="joinGameWait"></Inputs.TextButton>
                    <div class="separatorLine">
                        <div></div>
                        <span>Create Game</span>
                        <div></div>
                    </div>
                    <div class="gameOptionsWrapper">
                        <div class="gameOptionsTable">
                            <label for="optMaxPlayers" title="Maximum amount of players, including AI players">Max Players:</label>
                            <Inputs.NumberBox v-model="options.maxPlayers" id="optMaxPlayers" title="Maximum amount of players, including AI players" :min="2" :max="8" :step="1" width="8em"></Inputs.NumberBox>
                            <label for="optAIPlayers" title="Amount of AI agents to spawn">AI Players:</label>
                            <Inputs.NumberBox v-model="options.aiPlayers" id="optAIPlayers" title="Amount of AI agents to spawn" :min="0" :max="8" :step="1" width="8em"></Inputs.NumberBox>
                            <label for="optPublic" title="Allow any player to join from game list">Public:</label>
                            <Inputs.ToggleButton v-model="options.public" id="optPublic" title="Allow any player to join from game list"></Inputs.ToggleButton>
                            <!-- <label for="opt">Option:</label>
                            <Inputs.NumberBox id="opt" title="Description" width="8em"></Inputs.NumberBox> -->
                        </div>
                    </div>
                    <Inputs.TextButton text="Create" class="forceBorder" title="Start game and go to lobby!" @click="createGame()" style="margin: 0px;" background-color="dodgerblue" :disabled="joinGameWait"></Inputs.TextButton>
                    <Transition name="wait">
                        <div class="waitCover" v-if="joinGameWait">
                            <LoadingSpinner class="waitSpinner"></LoadingSpinner>
                        </div>
                    </Transition>
                </div>
            </div>
        </Transition>
        <Inputs.IconButton class="closeButton" text="Menu" title="Back to menu" img="/assets/arrow-left.svg" background-color="#F00" @click="transition.startTo('menu')" :disabled="joinGameWait"></Inputs.IconButton>
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
    contain: layout;
    position: relative;
    flex-direction: column;
    box-sizing: border-box;
    min-width: 40vw;
    max-width: 90vw;
    min-height: 60vh;
    max-height: 100vh;
    padding: 8px 8px;
    background-color: #888;
    border: 4px solid white;
    row-gap: 4px;
    overflow-y: auto;
}

.separatorLine {
    display: flex;
    font-size: var(--font-18);
    align-items: center;
}

.separatorLine>div {
    flex-grow: 1;
    background-color: black;
    height: 2px;
    margin: 0px 6px;
}

.forceBorder,
.forceBorder:disabled {
    border-color: black !important;
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
    width: calc(4 * var(--font-small));
    filter: v-bind("joinCodeValid ? '' : 'grayscale(1)'");
}

.gameListWrapper {
    contain: layout;
    border: 4px solid black;
    border-bottom: 2px solid black;
    flex-grow: 1;
}

.gameListWrapper::after {
    content: '';
    position: fixed;
    bottom: 0px;
    width: 100%;
    height: 2px;
    background-color: black;
}

.gameList {
    display: flex;
    flex-direction: column;
    max-height: 50vh;
    overflow-y: auto;
}

.gameList::-webkit-scrollbar {
    width: 12px;
    background-color: #555;
    border-bottom: 2px solid black;
}

.gameList::-webkit-scrollbar-thumb {
    background-clip: padding-box;
    background-color: #777;
    border: 3px solid transparent;
}

.gameEntryWrapper {
    position: relative;
    border-bottom: 2px solid black;
    --height: calc(4 * var(--font-18));
    min-height: var(--height);
}

.gameEntry {
    display: flex;
    box-sizing: border-box;
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100%;
    height: var(--height);
    padding: 4px 8px;
    flex-direction: row;
}

.gameEntryInfo {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    justify-content: center;
}

.gameEntryInfo2 {
    align-items: center;
    font-size: var(--font-16);
}

.gameEntryId {
    grid-row: 1;
    grid-column: 1;
    font-size: var(--font-28);
}

.gameEntryHost {
    grid-row: 2;
    grid-column: 1;
    font-size: var(--font-16);
}

.gameEntryJoinButton {
    grid-row: 2;
    grid-column: 3;
    width: calc(3 * var(--font-small));
    margin: 0px 0px;
    align-self: center;
}

.entry-enter-active,
.entry-leave-active {
    transition: 200ms ease-in-out min-height, 200ms linear opacity;
}

.entry-enter-active>.gameEntry,
.entry-leave-active>.gameEntry {
    transition: 300ms ease-in-out transform;
}

.entry-enter-from,
.entry-leave-to {
    min-height: 0px;
    opacity: 0;
}

.entry-enter-from>.gameEntry,
.entry-leave-to>.gameEntry {
    transform: translateX(-100%);
}

.entry-enter-to,
.entry-leave-from {
    min-height: var(--height);
    opacity: 1;
}

.entry-enter-to>.gameEntry,
.entry-leave-from>.gameEntry {
    transform: none;
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
    text-wrap: nowrap;
}

.waitCover {
    display: grid;
    --spinner-size: min(8vw, 8vh);
    grid-template-rows: 1fr var(--spinner-size) 1fr;
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
}

.waitSpinner {
    grid-row: 2;
    grid-column: 2;
    width: var(--spinner-size) !important;
    height: var(--spinner-size) !important;
}

.wait-enter-active,
.wait-leave-active {
    transition: 500ms linear opacity;
}

.wait-enter-from,
.wait-leave-to {
    opacity: 0;
}

.wait-enter-to,
.wait-leave-from {
    opacity: 1;
}

.closeButton {
    position: absolute;
    top: 16px;
    left: 16px;
    margin: 0px;
    border-color: white;
}
</style>