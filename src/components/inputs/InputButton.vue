<script setup lang="ts">
defineProps<{
    text: string
    title?: string
    width?: string
    height?: string
    font?: string
    fontSize?: string
    color?: string
    backgroundColor?: string
    type?: 'button' | 'submit'
}>();
const emit = defineEmits<{
    (e: 'click'): any
}>();
function click() {
    emit('click');
}

</script>

<template>
    <input :type="props.type ?? 'button'" class="uiButton" :value=$props.text @click=click :title=props.title>
</template>

<style scoped>
.uiButton {
    box-sizing: border-box;
    width: v-bind("$props.width ?? 'unset'");
    height: v-bind("$props.height ?? 'min-content'");
    margin: 0px 4px;
    padding: 0.125em 0.4em;
    border: 4px solid white;
    border-radius: 0px;
    background-color: v-bind("$props.backgroundColor ?? 'black'");
    color: v-bind("$props.color ?? 'white'");
    font: v-bind("$props.font ?? 'inherit'");
    font-size: v-bind("$props.fontSize ?? 'var(--font-16)'");
    font-family: 'Source Code Pro', Courier, monospace;
    text-decoration: none;
    transition: 50ms ease transform, 50ms ease border-color;
    cursor: pointer;
}

.uiButton:hover {
    transform: translateY(-2px);
    border-color: var(--color-1);
}

.uiButton:active {
    transform: translateY(2px);
    border-color: var(--color-2);
}

.uiButton:disabled {
    border-color: #888 !important;
    transform: none !important;
    opacity: 1;
    cursor: not-allowed;
}
</style>../TextTransitions