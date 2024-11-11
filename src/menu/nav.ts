import { ref } from 'vue';

export const currentPage = ref<'menu' | 'gameSelect' | 'game'>('menu');
export const showGameTransition = ref<boolean>(false);
export const startTransitionTo = (page: 'menu' | 'gameSelect' | 'game') => {
    showGameTransition.value = true;
    setTimeout(() => currentPage.value = page, 1000);
    // new page will remove fade screen once ready
};