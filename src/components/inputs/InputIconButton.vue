<script setup lang="ts">
defineProps<{
    text: string
    img: string
    title?: string
    width?: string
    height?: string
    font?: string
    fontSize?: string
    color?: string
    backgroundColor?: string
    noMask?: boolean
    imgColor?: string
    imgHoverColor?: string
    imgOnly?: boolean
    disabled?: boolean
    glitchOnMount?: boolean
}>();
const emit = defineEmits<{
    (e: 'click'): any
}>();
function click() {
    emit('click');
}
</script>

<template>
    <label :class="'uiIconButtonLabel ' + (props.disabled ? 'uiIconButtonLabelDisabled' : '')" :title=title>
        <input type="button" class="uiIconButton" @click=click :disabled=props.disabled>
        <div :class="props.noMask ? 'uiIconButtonImgNoMask' : 'uiIconButtonImage'"></div>
        <span class="uiIconButtonText" v-if="!props.imgOnly">{{ buttonText }}</span>
    </label>
</template>

<style scoped>
.uiIconButtonLabel {
    display: flex;
    box-sizing: border-box;
    width: v-bind("$props.width ?? 'min-content'");
    height: v-bind("$props.height ?? 'min-content'");
    border: 4px solid white;
    margin: 0px 4px;
    padding: 0.125em 0.4em;
    background-color: v-bind("$props.backgroundColor ?? 'black'");
    color: v-bind("$props.color ?? 'white'");
    font: v-bind("$props.font ?? 'inherit'");
    font-size: v-bind("$props.fontSize ?? 'var(--font-16)'");
    font-family: 'Source Code Pro', Courier, monospace;
    transition: 50ms ease background-position, 50ms ease background-color, 50ms ease transform, 50ms ease border-color;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    user-select: none;
}

.uiIconButtonImage {
    width: 1.2em;
    height: 1.2em;
    mask-size: 1.2em;
    mask-repeat: no-repeat;
    mask-position: center;
    mask-image: v-bind("`url('${$props.img}')`");
    background-color: v-bind("$props.imgColor ?? 'white'");
    transition: 50ms linear background-color;
}

.uiIconButtonImgNoMask {
    width: 1.2em;
    height: 1.2em;
    background-size: 1.2em;
    background-repeat: no-repeat;
    background-position: center;
    background-image: v-bind("`url('${$props.img}')`");
}

.uiIconButtonText {
    margin-left: 0.2em;
    text-wrap: nowrap;
    white-space: nowrap;
    font-size: v-bind("$props.fontSize ?? 'var(--font-16)'");
    text-decoration: none;
}

.uiIconButtonLabel:hover {
    transform: translateY(-2px);
    border-color: var(--color-1);
}

.uiIconButtonLabel:active {
    transform: translateY(2px);
    border-color: var(--color-2);
}

.uiIconButtonLabel:hover>.uiIconButtonImage {
    background-color: v-bind("$props.imgHoverColor ?? $props.imgColor ?? 'white'");
}

.uiIconButton {
    display: none;
}

.uiIconButtonLabelDisabled {
    border-color: #888 !important;
    transform: none !important;
    opacity: 1;
    cursor: not-allowed;
}
</style>