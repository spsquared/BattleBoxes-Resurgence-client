<script setup lang="ts">
const props = defineProps<{
    min?: number
    max?: number
    step?: number
    highlightInvalid?: boolean
    title?: string
    width?: string
    height?: string
    font?: string
}>();
const emit = defineEmits<{
    (e: 'input', value: number): any
}>();
const number = defineModel({ default: 0 });
function input() {
    emit('input', number.value);
}
defineExpose({
    value: number
});
</script>

<template>
    <input type="number" :class="'uiNumberBox ' + (props.highlightInvalid ? 'uiNumberBoxHighlightInvalid' : '')" @input=input v-model=number :title=props.title :min=props.min :max=props.max :step=props.step>
</template>

<style scoped>
.uiNumberBox {
    box-sizing: border-box;
    width: v-bind("$props.width ?? 'initial'");
    height: v-bind("$props.height ?? '32px'");
    margin: 0px 4px;
    padding: 0px 4px;
    border: 4px solid white;
    border-radius: 0px;
    background-color: black;
    color: white;
    font: v-bind("$props.font ?? '14px inherit'");
    font-family: 'Source Code Pro', Courier, monospace;
    transition: 50ms linear border-color;
}

.uiNumberBox:hover {
    border-color: var(--color-1) !important;
}

.uiNumberBox:focus {
    border-color: var(--color-2) !important;
}

.uiNumberBoxHighlightInvalid.uiNumberBox:invalid {
    border-color: var(--color-3);
}

.uiNumberBox:disabled {
    border-color: #888 !important;
    opacity: 1;
    cursor: not-allowed;
}
</style>