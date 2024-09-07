<script setup lang="ts">
</script>

<template>
    <div class="gameSelectBackground"></div>
</template>

<style>
@keyframes background-scroll {
    from {
        transform: rotate(var(--background-angle)) translate(0px);
    }

    to {
        transform: rotate(var(--background-angle)) translate(-40px, 80px);
    }
}
</style>
<style scoped>
.gameSelectBackground {
    --background-angle: 9deg;
    position: absolute;
    top: 0px;
    left: 0px;
    width: calc(100vw + 40px + (100vh * cos(var(--background-angle))));
    height: calc(100vh + 80px + (100vw * cos(var(--background-angle))));
    background-color: black;
    background-image:
        linear-gradient(black 0%, black 70%, transparent 70%),
        linear-gradient(90deg, black 0%, black 70%, transparent 70%),
        linear-gradient(#333 5%, transparent 5%),
        linear-gradient(90deg, #333 5%, transparent 5%);
    background-size: 40px 40px;
    background-position: 0px 12px, 12px 0px, 0px 5px, 5px 0px;
    animation: 2500ms linear background-scroll infinite;
    transform-origin: 100% 0%;
}
</style>