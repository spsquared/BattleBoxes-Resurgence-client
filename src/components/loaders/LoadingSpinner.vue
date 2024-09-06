<script setup lang="ts">
defineProps<{
    color1?: string
    color2?: string
    width?: string
    height?: string
}>();
</script>

<template>
    <div class="uiLoadingSpinner"></div>
</template>

<style scoped>
.uiLoadingSpinner {
    width: v-bind("$props.width ?? '100%'");
    height: v-bind("$props.height ?? '100%'");
    max-width: 100%;
    max-height: 100%;
    aspect-ratio: 1;
    animation: 2000ms cubic-bezier(0.8, -0.7, 0.5, 1.5) -1400ms ui-loading-spinner-spin infinite;
}

@keyframes ui-loading-spinner-spin {

    0%,
    25% {
        transform: rotateZ(0deg);
        background-color: v-bind("$props.color2 ?? '#F00'");
        box-shadow: 0px 0px 8px v-bind("$props.color2 ?? '#F00'");
    }

    50%,
    75% {
        transform: rotateZ(90deg);
        background-color: v-bind("$props.color1 ?? '#0C0'");
        box-shadow: 0px 0px 8px v-bind("$props.color1 ?? '#0C0'");
    }

    100% {
        transform: rotateZ(180deg);
        background-color: v-bind("$props.color2 ?? '#F00'");
        box-shadow: 0px 0px 8px v-bind("$props.color2 ?? '#F00'");
    }
}
</style>