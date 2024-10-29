<script setup lang="ts">
defineProps<{
    min?: number
    max?: number
    step?: number
    highlightInvalid?: boolean
    title?: string
    width?: string
    height?: string
    font?: string
    fontSize?: string
    color?: string
    backgroundColor?: string
}>();
const emit = defineEmits<{
    (e: 'input', value: number): any
    (e: 'keypress', ev: KeyboardEvent): any
}>();
const number = defineModel({ default: 0 });
function input() {
    emit('input', number.value);
}
function keypress(e: KeyboardEvent) {
    emit('keypress', e);
}
defineExpose({
    value: number
});
</script>

<template>
    <input type="number" :class="'uiNumberBox ' + ($props.highlightInvalid ? 'uiNumberBoxHighlightInvalid' : '')" @input="input" @keypress="keypress" v-model=number :title=$props.title :min=$props.min :max=$props.max :step=$props.step>
</template>

<style scoped>
.uiNumberBox {
    box-sizing: border-box;
    width: v-bind("$props.width ?? 'initial'");
    height: v-bind("$props.height ?? '32px'");
    margin: 0px 4px;
    padding: 0px 4px;
    border: 4px solid black;
    border-radius: 0px;
    background-color: color-mix(in srgb, v-bind("$props.backgroundColor ?? 'white'") 90%, #808080 10%);
    color: v-bind("$props.color ?? 'black'");
    font: v-bind("$props.font ?? 'inherit'");
    font-size: v-bind("$props.fontSize ?? 'var(--font-16)'");
    font-family: 'Pixel', Arial, sans-serif;
    transition: 50ms linear border-color;
}

.uiNumberBox:hover,
.uiNumberBox:focus {
    background-color: v-bind("$props.backgroundColor ?? 'white'");
}

.uiNumberBoxHighlightInvalid.uiNumberBox:invalid {
    background-color: #FE8;
}

.uiNumberBox:disabled {
    border-color: #555 !important;
    opacity: 1;
    cursor: not-allowed;
    filter: saturate(0.5);
}
</style>