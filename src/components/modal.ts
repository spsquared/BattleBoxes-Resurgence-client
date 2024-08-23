import { defineStore } from 'pinia';
import { ref } from 'vue';

import FullscreenModal, { ModalMode, type ModalParams } from '#/modal/FullscreenModal.vue';

export {
    FullscreenModal,
    ModalMode,
    type ModalParams
}

const modal = ref<InstanceType<typeof FullscreenModal>>();
export const globalModal = defineStore('globalModal', {
    actions: {
        setModal(newModal: InstanceType<typeof FullscreenModal>) {
            modal.value = newModal;
        },
        showModal(params: ModalParams): { result: Promise<string | boolean | null>, cancel: () => void } {
            if (modal.value != null) {
                return modal.value.showModal(params);
            } else {
                return { result: new Promise((resolve) => resolve(null)), cancel: () => { } };
            }
        },
        cancelAllModals() {
            modal.value?.cancelAllModals();
        }
    }
});