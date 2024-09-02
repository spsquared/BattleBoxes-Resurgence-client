<script setup lang="ts">
defineProps<{
    title?: string
    width?: string
    height?: string
    minWidth?: string
    minHeight?: string
    maxWidth?: string
    maxHeight?: string
    font?: string
    fontSize?: string
    color?: string
    backgroundColor?: string
    placeholder?: string
    resize?: 'vertical' | 'horizontal' | 'both' | 'none'
}>();
const emit = defineEmits<{
    (e: 'input', value: string): any
}>();
const text = defineModel({ default: '' });
function input() {
    emit('input', text.value);
}
defineExpose({
    value: text
});
</script>

<template>
    <textarea class="uiTextArea" @input=input v-model=text :title=$props.title :placeholder=$props.placeholder></textarea>
</template>

<style scoped>
.uiTextArea {
    box-sizing: border-box;
    width: v-bind("$props.width ?? 'unset'");
    height: v-bind("$props.height ?? 'unset'");
    min-width: v-bind("$props.minWidth ?? 'unset'");
    min-height: v-bind("$props.minHeight ?? 'unset'");
    max-width: v-bind("$props.maxWidth ?? 'unset'");
    max-height: v-bind("$props.maxHeight ?? 'unset'");
    margin: 0px 4px;
    padding: 0px 4px;
    border: 4px solid black;
    border-radius: 0px;
    background-color: color-mix(in srgb, v-bind("$props.backgroundColor ?? 'white'") 90%, #808080 10%);
    color: v-bind("$props.color ?? 'black'");
    font: v-bind("$props.font ?? 'inherit'");
    font-size: v-bind("$props.fontSize ?? 'var(--font-16)'");
    font-family: 'Pixel', Arial, sans-serif;
    transition: 50ms linear background-color;
    resize: v-bind("$props.resize ?? 'both'");
}

.uiTextArea:hover,
.uiTextArea:focus {
    background-color: v-bind("$props.backgroundColor ?? 'white'");
}

.uiTextArea:disabled {
    border-color: #555 !important;
    opacity: 1;
    cursor: not-allowed;
    filter: saturate(0.5);
}
</style>