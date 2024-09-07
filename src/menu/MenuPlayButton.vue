<script setup lang="ts">

const mouseover = () => {
    console.log('hover')
};
const mouseout = () => {
    console.log('leave')
};
const play = () => {
    console.log('click')
};
</script>

<template>
    <div class="playButtonWrapper">

        <button class="playButton" @click="play()" @mouseover="mouseover()" @mouseout="mouseout()" title="Play">
            <!-- front face panels -->
            <div class="p g p1 f"></div>
            <div class="p g p2 f"></div>
            <div class="p g p3 f"></div>
            <div class="p g p4 f"></div>
            <div class="p g p5 f"></div>
            <div class="p g p6 f"></div>
            <div class="p g p7"></div>
            <div class="p g p8"></div>
            <div class="p g p9 f"></div>
            <div class="p g p10 f"></div>
            <!-- back face panels -->
            <div class="p g p1 b"></div>
            <div class="p g p2 b"></div>
            <div class="p g p3 b"></div>
            <div class="p g p4 b"></div>
            <div class="p g p5 b"></div>
            <div class="p g p6 b"></div>
            <div class="p g p11"></div>
            <div class="p g p12"></div>
            <div class="p g p9 b"></div>
            <div class="p g p10 b"></div>
            <!-- edge panels -->
            <div class="p ddg e1 h"></div>
            <div class="p ddg e2 h"></div>
            <div class="p dg e3 v"></div>
            <div class="p dg e4 v"></div>
            <div class="p llg e5 h"></div>
            <div class="p llg e6 h"></div>
            <div class="p lg e7 v"></div>
            <div class="p lg e8 v"></div>
            <!-- center cutout panels -->
            <div class="p lw c1"></div>
            <div class="p dw c2"></div>
            <div class="p w c3"></div>
            <div class="p w c4"></div>
        </button>
    </div>
</template>

<style>
@keyframes spinnyCarrier {
    0% {
        transform: rotate3d(1, 1, 0, 45deg);
    }

    50% {
        transform: rotate3d(1, 1, 0, -45deg) rotateY(360deg);
    }

    100% {
        transform: rotate3d(1, 1, 0, 45deg) rotateY(720deg);
    }
}
</style>
<style scoped>
.playButtonWrapper {
    perspective: 1000px;
}

.playButton {
    appearance: none;
    position: relative;
    font-size: min(6vw, 4vh);
    width: 14em;
    height: 9em;
    margin: 0px;
    padding: 0px;
    border: none;
    transform-style: preserve-3d;
    pointer-events: none;
    background-color: transparent;
    cursor: pointer;

    animation: 5000ms linear spinnyCarrier infinite;
}

.playButton>* {
    transform-style: preserve-3d;
    pointer-events: auto;
}

/* face panels (front and back same) */
.p1 {
    top: 1em;
    left: 0em;
    width: 1.5em;
    height: 7em;
}

.p2 {
    top: 1em;
    right: 0em;
    width: 1.5em;
    height: 7em;
}

.p3 {
    top: 0em;
    left: 1em;
    width: 4em;
    height: 9em;
}

.p4 {
    top: 0em;
    right: 1em;
    width: 3em;
    height: 9em;
}

.p5 {
    top: 0em;
    left: 4em;
    width: 6.5em;
    height: 2em;
}

.p6 {
    bottom: 0em;
    left: 4em;
    width: 6.5em;
    height: 2em;
}

.p9 {
    top: 1em;
    left: 9em;
    width: 2em;
    height: 3em;
}

.p10 {
    bottom: 1em;
    left: 9em;
    width: 2em;
    height: 3em;
}

/* slanted face panels (front and back different) */

.p7,
.p11 {
    top: 0em;
    left: 5em;
    width: 7em;
    height: 2em;
    transform-origin: 0% 100%;
}

.p8,
.p12 {
    bottom: 0em;
    left: 5em;
    width: 7em;
    height: 2em;
    transform-origin: 0% 0%;
}

.p7 {
    transform: translateZ(1em) rotateZ(calc(atan2(2.5, 5)));
}

.p8 {
    transform: translateZ(1em) rotateZ(calc(-1 * atan2(2.5, 5)));
}

.p11 {
    transform: translateZ(-1em) rotateZ(calc(atan2(2.5, 5)));
}

.p12 {
    transform: translateZ(-1em) rotateZ(calc(-1 * atan2(2.5, 5)));
}

/* edge panels */
.e1 {
    bottom: 0em;
    left: 0em;
    width: 14em;
    height: 2em;
}

.e2 {
    bottom: -1em;
    left: 1em;
    width: 12em;
    height: 2em;
}

.e3 {
    bottom: 0em;
    left: 0em;
    width: 2em;
    height: 9em;
}

.e4 {
    bottom: 1em;
    left: -1em;
    width: 2em;
    height: 7em;
}

.e5 {
    top: 0em;
    left: 0em;
    width: 14em;
    height: 2em;
}

.e6 {
    top: -1em;
    left: 1em;
    width: 12em;
    height: 2em;
}

.e7 {
    bottom: 0em;
    right: 0em;
    width: 2em;
    height: 9em;
}

.e8 {
    bottom: 1em;
    right: -1em;
    width: 2em;
    height: 7em;
}

/* center cutout panels */
.c1 {
    top: 2em;
    left: 5em;
    width: 5em;
    height: 5em;
}

.c2,
.c3 {
    left: 5em;
    width: calc(sqrt(31.25) * 1em);
    height: 2em;
    transform-origin: 0% 50%;
}

.c2 {
    top: 1em;
    transform: rotateX(90deg) rotateY(calc(atan2(2.5, 5)));
}

.c3 {
    bottom: 1em;
    transform: rotateX(90deg) rotateY(calc(-1 * atan2(2.5, 5)));
}

.c4 {
    top: 2em;
    left: 4em;
    width: 2em;
    height: 5em;
    transform: rotateY(90deg);
}

/* colors */
.ddg {
    background-color: #090;
}

.dg {
    background-color: #0A0;
}

.g {
    background-color: #0C0;
}

.lg {
    background-color: #5D5;
}

.llg {
    background-color: #6E6;
}

.dw {
    background-color: #BBB;
}

.w {
    background-color: #CCC;
}

.lw {
    background-color: #EEE;
}

/* all panels */
.p {
    position: absolute;
}

/* front/back/sides */
.f {
    transform: translateZ(1em);
}

.b {
    transform: translateZ(-1em);
}

.h {
    transform: rotateX(90deg);
}

.v {
    transform: rotateY(90deg);
}
</style>