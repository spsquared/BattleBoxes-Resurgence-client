<script setup lang="ts">
defineProps<{
    color1?: string
    color2?: string
    width?: string
    height?: string
}>();
</script>

<template>
    <div class="uiLoadingBar"></div>
</template>

<style scoped>
.uiLoadingBar {
    width: v-bind("$props.width ?? '100%'");
    height: v-bind("$props.height ?? '12px'");
    background: linear-gradient(v-bind("$props.color1 ?? 'var(--color-2)'") 0 0), linear-gradient(v-bind("$props.color2 ?? 'var(--color-1)'") 0 0), white;
    background-size: 60% 100%;
    background-repeat: no-repeat;
    box-shadow: 0px 0px 0.5vw rgba(255, 255, 255, 0.5);
    animation: 2000ms ease ui-loading-bar-progress infinite;
}

@keyframes ui-loading-bar-progress {
    0% {
        background-position: -150% 0, -150% 0;
    }

    66% {
        background-position: 250% 0, -150% 0;
    }

    100% {
        background-position: 250% 0, 250% 0;
    }
}
</style>