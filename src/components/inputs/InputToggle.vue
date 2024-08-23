<script setup lang="ts">
const props = defineProps<{
    title?: string
    disabled?: boolean
}>();
const checked = defineModel({ default: false });
const emit = defineEmits<{
    (e: 'input', checked: boolean): any
}>();
function input() {
    emit('input', checked.value);
}
defineExpose({
    checked
});
</script>

<template>
    <label :class="'uiToggleLabel ' + (props.disabled ? 'uiToggleLabelDisabled' : '')">
        <input class="uiToggleInput" type="checkbox" @change=input v-model=checked :title=title :disabled=props.disabled>
        <span class="uiToggleSlider"></span>
    </label>
</template>

<style scoped>
.uiToggleLabel {
    display: inline-block;
    position: relative;
    bottom: 7px;
    width: 60px;
    height: 32px;
    margin-top: 7px;
}

.uiToggleInput {
    opacity: 0px;
    width: 0px;
    height: 0px;
}

.uiToggleSlider {
    position: absolute;
    top: 6px;
    left: 4px;
    width: 44px;
    height: 12px;
    background-color: red;
    border: 4px solid white;
    transition: 0.1s linear;
    cursor: pointer;
}

.uiToggleSlider::before {
    content: '';
    position: absolute;
    top: -10px;
    left: 0px;
    width: 24px;
    height: 24px;
    border: 4px solid white;
    background-color: black;
    transition: 0.1s linear;
    transform: translateX(-8px);
}

.uiToggleInput:checked+.uiToggleSlider {
    background-color: lime;
}

.uiToggleInput:checked+.uiToggleSlider::before {
    transform: translateX(20px);
}

.uiToggleLabelDisabled {
    border-color: #888 !important;
    opacity: 1;
    cursor: not-allowed;
}

.uiToggleLabelDisabled .uiToggleSlider, .uiToggleLabelDisabled .uiToggleSlider::before {
    border-color: #888 !important;
    opacity: 1;
    filter: saturate(0.5);
}
</style>