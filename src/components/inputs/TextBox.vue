<script setup lang="ts">
defineProps<{
    highlightInvalid?: boolean
    title?: string
    width?: string
    height?: string
    font?: string
    fontSize?: string
    color?: string
    backgroundColor?: string
    type?: 'text' | 'password' | 'email'
    placeholder?: string
    autocomplete?: 'username' | 'current-password' | 'new-password' | 'email' | 'name' | 'honorific-prefix' | 'given-name' | 'additional-name' | 'family-name' | 'honorific-suffix' | 'nickname' | 'off'
}>();
const emit = defineEmits<{
    (e: 'input', value: string): any
    (e: 'keypress', ev: KeyboardEvent): any
}>();
const text = defineModel({ default: '' });
function input() {
    emit('input', text.value);
}
function keypress(e: KeyboardEvent) {
    emit('keypress', e);
}
defineExpose({
    value: text
});
</script>

<template>
    <input :type="$props.type ?? 'text'" :class="'uiTextBox ' + (($props.highlightInvalid && text.length > 0) ? 'uiTextBoxHighlightInvalid' : '')" @input="input" @keypress="keypress" v-model=text :title=$props.title :placeholder=$props.placeholder :autocomplete="$props.autocomplete ?? 'off'">
</template>

<style scoped>
.uiTextBox {
    box-sizing: border-box;
    width: v-bind("$props.width ?? 'unset'");
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
    transition: 50ms linear background-color;
}

.uiTextBoxHighlightInvalid.uiTextBox:invalid {
    background-color: #FE8;
}

.uiTextBox:hover,
.uiTextBox:focus {
    background-color: v-bind("$props.backgroundColor ?? 'white'");
}

.uiTextBox:disabled {
    border-color: #555 !important;
    background-color: #CCC;
    opacity: 1;
    cursor: not-allowed;
}
</style>