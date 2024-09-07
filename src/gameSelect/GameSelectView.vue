<script setup lang="ts">
import { currentPage, showFadeScreen, startTransitionTo } from '@/menu/nav';
import { watch } from 'vue';
import * as Inputs from '@/components/inputs';
import GameSelectBackground from './GameSelectBackground.vue';

watch(currentPage, (p) => {
    if (p == 'gameSelect') showFadeScreen.value = false;
});
</script>

<template>
    <div class="gameSelectView" v-if="currentPage == 'gameSelect'">
        <GameSelectBackground></GameSelectBackground>
        <div class="gameSelectWrapper">
            <div class="gameSelectFlow">
                <Inputs.TextButton text="Create Game" title="Create a new game" style="margin: 0px;" background-color="#0C0"></Inputs.TextButton>
                <div class="createJoinSeparator">
                    <div></div>
                    <span>OR</span>
                    <div></div>
                </div>
                <form class="joinGameCodeContainer" action="javascript:void(0)">
                    <Inputs.TextBox placeholder="Join Code" style="flex-grow: 1; text-align: center;" title="6-character join code, letters and numbers" maxlength="6" pattern="[A-Za-z0-9]{6}"></Inputs.TextBox>
                    <Inputs.IconButton text="" type="submit" title="Join game" img="/assets/arrow-right.svg" img-only width="calc(4 * var(--font-small))" background-color="#0C0"></Inputs.IconButton>
                </form>
            </div>
        </div>
        <Inputs.IconButton class="closeButton" text="Menu" title="Back to menu" img="/assets/arrow-left.svg" background-color="#F00" @click="startTransitionTo('menu')"></Inputs.IconButton>
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

.gameSelectWrapper {
    display: flex;
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100vw;
    height: 100vh;
    align-items: center;
    justify-content: center;
}

.gameSelectFlow {
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
}

.createJoinSeparator {
    display: flex;
    font-size: var(--font-16);
    color: white;
    align-items: center;
}

.createJoinSeparator>div {
    flex-grow: 1;
    background-color: white;
    height: 2px;
    margin: 0px 6px;
}

.joinGameCodeContainer {
    display: flex;
    flex-direction: row;
}

.closeButton {
    position: absolute;
    top: 16px;
    left: 16px;
    margin: 0px;
    border-color: white;
}
</style>