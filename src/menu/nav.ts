import { reactive, ref } from 'vue';

export const currentPage = ref<'menu' | 'gameSelect' | 'game'>('menu');
export type transitions = 'fade' | 'wipe-v' | 'wipe-h' | 'doors';
export const transition = reactive<{
    startTo: (page: 'menu' | 'gameSelect' | 'game', type?: transitions, delay?: number) => void,
    end: () => void,
    running: boolean,
    type: transitions
}>({
    startTo: (page, type = 'fade', delay = 750) => {
        transition.type = type;
        transition.running = true;
        setTimeout(() => currentPage.value = page, delay);
        // new page will remove fade screen once ready
    },
    end: () => {
        transition.running = false;
    },
    running: false,
    type: 'fade'
});

export default transition;

if (process.env.NODE_ENV == 'development') {
    (window as any).transition = transition;
}