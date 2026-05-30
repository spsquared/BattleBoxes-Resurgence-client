<script setup lang="ts">
const props = defineProps<{
    min?: number
    max?: number
    step?: number
    strict?: boolean
    highlightInvalid?: boolean
    title?: string
    width?: string
    height?: string
    font?: string
    fontSize?: string
    color?: string
    backgroundColor?: string
    disabled?: boolean
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
function blur() {
    if (props.strict) {
        const clamped = Math.max(props.min ?? -Infinity, Math.min(number.value, props.max ?? Infinity));
        if (props.step != undefined && props.step > 0) {
            number.value = Number((Math.round(clamped / props.step) * props.step).toFixed((props.step.toString().split('.')[1] ?? '').length));
        } else {
            number.value = clamped;
        }
        input();
    }
}
</script>

<template>
    <input type="number" :class="'uiNumberBox ' + (props.highlightInvalid ? 'uiNumberBoxHighlightInvalid' : '')" @input="input" @keypress="keypress" @blur="blur" v-model=number :title="props.title" :min="props.min" :max="props.max" :step="props.step" :disabled="props.disabled">
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
    background-color: #CCC;
    cursor: not-allowed;
}
</style>