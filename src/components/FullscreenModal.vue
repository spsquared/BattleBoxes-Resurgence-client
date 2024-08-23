<!-- oops i used options and composition api -->
<script setup lang="ts">
import { reactive, ref } from 'vue';
import { glitchTextTransition } from '#/text';
import { InputButton, InputTextBox } from '#/inputs';

const modalInput = ref('');
const modal = reactive<{
    title: string
    content: string
    mode: ModalMode
    inputType: 'text' | 'password' | 'email'
    open: boolean
}>({
    title: '',
    content: '',
    mode: ModalMode.NOTIFY,
    inputType: 'text',
    open: false
});
const modalColor = ref('white');

let modalResolve = () => { };
let modalReject = () => { };
const modalQueue: { params: ModalParams, resolve: (v: boolean | string | null) => void, cancel: Promise<void> }[] = [];
const showNextModal = async () => {
    const params = modalQueue.shift();
    if (params === undefined) return;
    const m = showModal(params?.params);
    params.cancel.then(() => m.cancel());
    params.resolve(await m.result);
};
const showModal = (params: ModalParams): { result: Promise<boolean | string | null>, cancel: () => void } => {
    if (modal.open) {
        let res: (v: boolean | string | null) => void;
        let cancelRes: () => void;
        const cancelPromise: Promise<void> = new Promise((resolve) => cancelRes = resolve);
        const promise: Promise<boolean | string | null> = new Promise((resolve) => {
            res = resolve;
            modalQueue.push({ params, resolve, cancel: cancelPromise });
        });
        return {
            result: promise,
            cancel: () => {
                if (params.mode == ModalMode.QUERY) res(null);
                else res(false);
                const i = modalQueue.findIndex((v) => v.resolve === res);
                if (i != -1) modalQueue.splice(i, 1);
                cancelRes();
            }
        };
    }
    const { title, content, mode = ModalMode.NOTIFY, inputType = 'text', color = 'white', glitchTitle = false } = params;
    if (glitchTitle) glitchTextTransition(title, title, (text) => { modal.title = text; return false }, 40, 2, 10, 1, true);
    else modal.title = title;
    modal.content = content;
    modal.mode = mode;
    modalInput.value = '';
    modal.inputType = inputType;
    modalColor.value = color;
    modal.open = true;
    const promise = new Promise<boolean | string | null>((resolve) => {
        if (modal.mode == ModalMode.QUERY) {
            modalResolve = async () => {
                modal.open = false;
                resolve(modalInput.value);
                await showNextModal();
            };
            modalReject = async () => {
                modal.open = false;
                resolve(null);
                await showNextModal();
            };
        } else {
            modalResolve = async () => {
                modal.open = false;
                resolve(true);
                await showNextModal();
            };
            modalReject = async () => {
                modal.open = false;
                resolve(false);
                await showNextModal();
            };
        }
    });
    return {
        result: promise,
        cancel: () => modalReject()
    };
};
const cancelAllModals = () => {
    while (modalQueue.length) modalReject();
    modalReject();
};
defineExpose({ showModal, cancelAllModals });
document.addEventListener('keypress', (e) => {
    if (e.key == 'Enter') {
        if (modalResolve) modalResolve();
    } else if (e.key == ' ') {
        if (modalReject) modalReject();
    }
});
</script>
<script lang="ts">
export const enum ModalMode {
    /**A notification - only an acknowledgement response */
    NOTIFY = 0,
    /**A confirmation - confirm or deny */
    CONFIRM = 1,
    /**A request for text input */
    QUERY = 2,
    /**A request for boolean input - yes or no */
    INPUT = 3
}
export interface ModalParams {
    /**Modal header */
    title: string
    /**Modal body */
    content: string
    /**Modal mode */
    mode?: ModalMode
    /**Input type for `QUERY` mode */
    inputType?: 'text' | 'password' | 'email'
    /**Border color */
    color?: string
    /**Cool title effect? */
    glitchTitle?: boolean
}
</script>

<template>
    <div class="modalContainer" :style="modal.open ? 'opacity: 1; pointer-events: all;' : ''">
        <div class="modalBodyWrapper" :style="modal.open ? 'transform: translateY(calc(50vh + 50%))' : ''">
            <div class="modalBody">
                <h1 v-html=modal.title></h1>
                <p v-html=modal.content></p>
                <span v-if="modal.mode == ModalMode.QUERY">
                    <InputTextBox v-model=modalInput :type=modal.inputType autocomplete="off"></InputTextBox>
                    <br>
                </span>
                <div class="modalButtons">
                    <span v-if="modal.mode == ModalMode.INPUT">
                        <InputButton text="NO" @click=modalReject width="5em" color="red" font="bold var(--font-16) 'Source Code Pro'"></InputButton>
                        <InputButton text="YES" @click=modalResolve width="5em" color="lime" font="bold var(--font-16) 'Source Code Pro'"></InputButton>
                    </span>
                    <span v-else>
                        <span v-if="modal.mode == ModalMode.QUERY || modal.mode == ModalMode.CONFIRM">
                            <InputButton text="CANCEL" @click=modalReject width="5em" color="red" font="bold var(--font-16) 'Source Code Pro'"></InputButton>
                        </span>
                        <InputButton text="OK" @click=modalResolve width="5em" color="lime" font="bold var(--font-16) 'Source Code Pro'"></InputButton>
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.modalContainer {
    display: grid;
    grid-template-rows: 1fr min-content 1fr;
    grid-template-columns: 1fr 50vw 1fr;
    position: fixed;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    opacity: 0;
    transition: 300ms linear opacity;
    backdrop-filter: blur(2px);
    pointer-events: none;
    z-index: 1000;
}

@media (max-width: 500px) {
    .modalContainer {
        grid-template-columns: 1fr 90vw 1fr;
    }
}

.modalBodyWrapper {
    grid-row: 2;
    grid-column: 2;
    display: flex;
    position: relative;
    bottom: calc(50vh + 50%);
    padding: 4px 4px;
    background-color: v-bind("modalColor");
    box-shadow: 0px 0px 8px v-bind("modalColor");
    clip-path: polygon(32px 0%, 100% 0%, 100% calc(100% - 32px), calc(100% - 32px) 100%, 0% 100%, 0% 32px);
    transition: 400ms ease-in-out transform;
}

.modalBody {
    flex-grow: 1;
    display: inline-block;
    min-width: 0px;
    padding: 4px 1em;
    background-color: black;
    clip-path: polygon(30px 0%, 100% 0%, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0% 100%, 0% 30px);
    text-align: center;
}

.modalBody h1 {
    margin: 0px 0px;
    margin-top: 0.5em;
}

.modalBody p {
    text-align: center;
    font-size: var(--font-small);
}

.modalButtons {
    margin: 8px 0px;
    margin-bottom: 16px;
}
</style>