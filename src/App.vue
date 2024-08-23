<script setup lang="ts">
import { ref } from 'vue';

const buh = ref(0);
setInterval(() => buh.value = (buh.value + 1) % 2, 1000)
</script>

<template name="app">
    omg its bootlebooxes!!
    <button>button so the page doesn't spam reload</button>
</template>

<style scoped>
* {
    color: white;
}

.v-enter-active,
.v-leave-active {
    transition-duration: 1000ms;
}
</style>