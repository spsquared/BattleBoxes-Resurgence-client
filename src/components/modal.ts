import { ref } from 'vue';

import FullscreenModal, { ModalMode, type ModalParams } from './modal/FullscreenModal.vue';

export {
    FullscreenModal,
    ModalMode,
    type ModalParams
}

const modalRef = ref<InstanceType<typeof FullscreenModal>>();
export const modal = {
    setModal(newModal: InstanceType<typeof FullscreenModal>) {
        modalRef.value = newModal;
    },
    showModal(params: ModalParams): { result: Promise<string | boolean | null>, cancel: () => void } {
        if (modalRef.value != null) {
            return modalRef.value.showModal(params);
        } else {
            return { result: new Promise((resolve) => resolve(null)), cancel: () => { } };
        }
    },
    cancelAllModals() {
        modalRef.value?.cancelAllModals();
    }
};