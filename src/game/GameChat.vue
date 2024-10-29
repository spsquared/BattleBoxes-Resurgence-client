<script setup lang="ts">
import { onMounted, onUpdated, ref, watch } from 'vue';
import gameInstance, { chatHistory } from './game';

const chatSize = ref(2);
const chatBlock = ref<HTMLDivElement | null>(null);
const chatInput = ref<HTMLInputElement | null>(null);
const scrollToBottom = ref(true);

const attachChatKeybind = () => {
    gameInstance.value?.addKeybind('Enter', () => {
        if (chatInput.value != null) chatInput.value.focus();
    });
    chatBlock.value?.addEventListener('scroll', () => {
        if (chatBlock.value != null) scrollToBottom.value = chatBlock.value.scrollTop + chatBlock.value.clientHeight >= chatBlock.value.scrollHeight - 5;
    }, { passive: true });
    chatInput.value?.addEventListener('blur', () => {
        scrollToBottom.value = true;
        if (chatBlock.value != null) chatBlock.value.scrollTop = chatBlock.value.scrollHeight;
    });
};
onMounted(() => attachChatKeybind());
watch(gameInstance, () => {
    if (gameInstance.value !== undefined) {
        attachChatKeybind();
        console.warn('Game instance changed, this may break things!');
    }
});

onUpdated(() => {
    if (chatBlock.value != null && scrollToBottom.value) chatBlock.value.scrollTop = chatBlock.value.scrollHeight;
});

const chatMessage = ref('');
const onChatKey = (e: KeyboardEvent) => {
    if (e.key == 'Enter') {
        if (chatInput.value != null) chatInput.value.blur();
        if (chatMessage.value != '') {
            gameInstance.value?.sendChatMessage(chatMessage.value);
            chatMessage.value = '';
        }
    }
};
</script>

<template>
    <div class="chatContainer">
        <input type="text" v-model="chatMessage" ref="chatInput" class="chatInput" maxlength="128" placeholder="Press ENTER to chat" @keypress="onChatKey">
        <div class="chatHistory" ref="chatBlock" v-if="gameInstance != null">
            <div class="chatLine" v-for="message in chatHistory" :key="message.id">
                <span v-for="(section, index) in message.message" :key="index" :style="section.style">
                    <span v-if="section.trusted" v-html="section.text"></span>
                    <span v-else>{{ section.text }}</span>
                </span>
            </div>
        </div>
    </div>
</template>

<style>
@keyframes chat-fade {
    from {
        opacity: 1;
    }

    to {
        opacity: 0;
    }
}
</style>
<style scoped>
* {
    --chat-size: v-bind("chatSize");
}

.chatContainer {
    contain: layout;
    display: flex;
    position: fixed;
    bottom: 0px;
    left: 0px;
    width: calc(150px + 120px * var(--chat-size));
    max-height: calc(100px + 60px * var(--chat-size));
    flex-direction: column-reverse;
}

.chatHistory {
    box-sizing: border-box;
    border: 2px solid transparent;
    border-bottom: none;
    transition: 50ms linear background-color;
    overflow-y: scroll;
    pointer-events: none;
}

.chatInput:focus+.chatHistory {
    border-color: #444;
    background-color: #FFFA;
    pointer-events: all;
}

.chatHistory::-webkit-scrollbar {
    width: 0;
    background-color: transparent;
}

.chatHistory::-webkit-scrollbar-thumb {
    background-color: transparent;
}

.chatInput:focus~.chatHistory::-webkit-scrollbar {
    width: 12px;
    background-color: #4445;
}

.chatInput:focus~.chatHistory::-webkit-scrollbar-thumb {
    background-color: #4445;
}

.chatInput {
    box-sizing: border-box;
    border: 2px solid #444;
    border-left: none;
    border-bottom: none;
    background-color: #FFF5;
    font: 12px 'Pixel';
    transition: 50ms linear background-color;
}

.chatInput::placeholder {
    color: #AAA;
}

.chatInput:focus {
    background-color: #FFFA;
}

.chatLine {
    padding: 0px 4px;
    animation: 1s linear chat-fade forwards;
    animation-delay: 5s;
    background-color: #FFF5;
    transition: 50ms linear background-color;
    word-break: break-all;
    word-wrap: break-word;
}

.chatInput:focus+.chatHistory>.chatLine {
    background-color: transparent;
    opacity: 1 !important;
    animation: none;
    animation-delay: 0s;
}
</style>