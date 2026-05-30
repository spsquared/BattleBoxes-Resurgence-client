<script setup lang="ts">
const props = defineProps<{
    min?: number
    max?: number
    step?: number
    length?: string
    title?: string
    color1?: string
    color2?: string
    vertical?: boolean
    disabled?: boolean
}>();
const value = defineModel({ default: 0 });
</script>

<template>
    <input type="range" :class="'uiSlider ' + (props.vertical ? 'uiSliderVertical' : '')" v-model="value" :title="props.title" :min="props.min" :max="props.max" :step="props.step" :disabled="disabled">
</template>

<style scoped>
.uiSlider {
    appearance: none;
    display: inline-block;
    position: relative;
    top: 5px;
    margin: 6px 4px;
    width: v-bind("$props.length ?? 'unset'");
    height: 12px;
    border: 4px solid black;
    background-color: v-bind("$props.color1 ?? '#777'");
    cursor: grab;
}

.uiSliderVertical {
    writing-mode: vertical-rl;
    direction: rtl;
    top: 8px;
    width: 12px;
    height: v-bind("$props.length ?? 'unset'");
    margin: 4px 6px;
}

.uiSlider::-webkit-slider-thumb {
    appearance: none;
    width: 32px;
    height: 32px;
    border: 4px solid black;
    background-color: v-bind("$props.color2 ?? 'white'");
}

.uiSlider:active {
    cursor: grabbing;
}

.uiSlider:disabled {
    border-color: #555 !important;
    filter: saturate(0.5);
    cursor: not-allowed;
}

.uiSlider:disabled::-webkit-slider-thumb {
    cursor: not-allowed;
    border-color: #555 !important;
    filter: saturate(0.5);
    cursor: not-allowed;
}
</style>