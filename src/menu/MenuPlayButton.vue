<script setup lang="ts">
import transition from './nav';
import { checkConnection } from '@/server';
import { reactive } from 'vue';

const button = reactive<{
    rx: number
    ry: number
    rz: number
    dx: number
    dy: number
    dz: number
    sc: number
    time: number
    state: 'bob' | 'hover' | 'click' | 'spin'
    bobStage: number
}>({
    rx: 0,
    ry: 0,
    rz: 0,
    dx: 0,
    dy: 0,
    dz: 0,
    sc: 1,
    time: 3000,
    state: 'bob',
    bobStage: -1
});

let bobTimeout: NodeJS.Timeout | undefined = undefined;
let bobTimeout2: NodeJS.Timeout | undefined = undefined;
const bobStates: { d: [number, number, number], r: [number, number, number] }[] = [
    {
        d: [0.5, 0.2, 0.1],
        r: [-3, 3, -2]
    },
    {
        d: [0.2, 0, 0],
        r: [3, -3, 2]
    },
    {
        d: [-0.5, 0.2, 0.1],
        r: [-3, -3, -2]
    },
    {
        d: [-0.2, 0, 0],
        r: [3, 3, 2]
    },
];
const updateBobAnimation = () => {
    if (button.state != 'bob') return;
    if (bobTimeout !== undefined) clearTimeout(bobTimeout);
    if (bobTimeout2 !== undefined) clearTimeout(bobTimeout2);
    bobTimeout = setTimeout(updateBobAnimation, 3000);
    button.bobStage = (button.bobStage + 1) % bobStates.length;
    const currState = bobStates[button.bobStage];
    bobTimeout2 = setTimeout(() => {
        button.dx = currState.d[0];
        button.dy = currState.d[1];
        button.dz = currState.d[2];
    }, 1500);
    button.rx = currState.r[0];
    button.ry = currState.r[1];
    button.rz = currState.r[2];
};
let popTimeout: NodeJS.Timeout | undefined = undefined;
const updatePopAnimation = () => {
    if (button.sc == 1) button.sc = 1.05;
    else button.sc = 1;
    if (popTimeout !== undefined) clearTimeout(popTimeout);
    popTimeout = setTimeout(updatePopAnimation, button.time * 2);
}
updatePopAnimation();

let timeResetTimeout: NodeJS.Timeout | undefined = undefined;
const mouseenter = () => {
    if (button.state == 'bob') {
        button.state = 'hover';
        button.time = 250;
        if (bobTimeout !== undefined) clearTimeout(bobTimeout);
        if (bobTimeout2 !== undefined) clearTimeout(bobTimeout2);
        button.dx = 0;
        button.dy = 0;
        button.dz = 1;
        button.rx = 5;
        button.ry = 6;
        button.rz = -3;
        if (timeResetTimeout !== undefined) clearTimeout(timeResetTimeout);
        updatePopAnimation();
    }
};
const mouseleave = () => {
    if (button.state == 'hover') {
        button.state = 'bob';
        button.dz = 0;
        button.sc = 1;
        updateBobAnimation();
        updatePopAnimation();
        if (timeResetTimeout !== undefined) clearTimeout(timeResetTimeout);
        timeResetTimeout = setTimeout(() => button.time = 3000, 500);
    }
};
const mousedown = () => {
    button.state = 'click';
    if (bobTimeout !== undefined) clearTimeout(bobTimeout);
    if (bobTimeout2 !== undefined) clearTimeout(bobTimeout2);
    if (popTimeout !== undefined) clearTimeout(popTimeout);
    button.time = 100;
    button.dx = 0.1;
    button.dy = 0;
    button.dz = -1;
    button.rx = 15;
    button.ry = 20;
    button.rz = -5;
    button.sc = 1;
    window.addEventListener('mouseup', mouseup);
    window.addEventListener('mouseleave', mouseup);
};
const mouseup = () => {
    window.removeEventListener('mouseup', mouseup);
    window.removeEventListener('mouseleave', mouseup);
    if (button.state == 'click') {
        button.state = 'spin';
        if (bobTimeout !== undefined) clearTimeout(bobTimeout);
        if (bobTimeout2 !== undefined) clearTimeout(bobTimeout2);
        if (popTimeout !== undefined) clearTimeout(popTimeout);
        button.dx = 0;
        button.dy = 0;
        button.dz = 0;
        button.rx = 0;
        button.ry = 0;
        button.rz = 0;
        button.sc = 1;
        button.time = 250;
        setTimeout(() => transition.startTo('gameSelect'), 1500);
        checkConnection();
    }
};

updateBobAnimation();
</script>

<template>
    <div class="playButtonContainer">
        <div class="playButtonWrapper">
            <button class="playButton" @mousedown="mousedown()" @mouseenter="mouseenter()" @mouseleave="mouseleave()" title="Play">
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
                <!-- big panel to make clicking button more consistent -->
                <div class="p a1"></div>
            </button>
        </div>
    </div>
</template>

<style>
@keyframes menu-play-button-spin {
    0% {
        transform: none;
    }

    10% {
        transform: translate3d(0em, 1em, -4em) rotateY(-15deg) rotateX(-5deg) rotateZ(5deg);
    }

    25% {
        transform: translate3d(0em, -1.5em, -4em) rotateY(360deg) rotateX(20deg);
    }

    50% {
        transform: translate3d(-1em, 0.7em, -6em) rotateY(400deg) rotateX(-30deg) rotateZ(10deg);
    }

    53% {
        transform: translate3d(-1em, 0.6em, -6em) rotateY(420deg) rotateX(0deg) rotateZ(15deg);
    }

    100% {
        transform: translate3d(1em, -15em, -4em) rotateY(1440deg) rotateX(20deg) rotateZ(-5deg);
    }
}
</style>
<style scoped>
.playButtonContainer {
    perspective: 1000px;
    transition: v-bind("(button.time * 2) + 'ms'") ease-in-out transform;
    transform: scale(v-bind("button.sc"));
}

.playButtonWrapper {
    transform-style: preserve-3d;
    transition: v-bind("button.time + 'ms'") cubic-bezier(0.4, 0, 0.6, 1) transform;
    transform: translate3d(v-bind("button.dx + 'em'"), v-bind("button.dy + 'em'"), v-bind("button.dz + 'em'"));
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
    transition: v-bind("button.time + 'ms'") ease-in-out transform;
    transform: rotateX(v-bind("button.rx + 'deg'")) rotateY(v-bind("button.ry + 'deg'")) rotateZ(v-bind("button.rz + 'deg'"));
    animation: 2500ms cubic-bezier(0.2, 0, 0.6, 1) v-bind("button.state == 'spin' ? 'menu-play-button-spin' : ''");
    animation-delay: 150ms;
    animation-fill-mode: forwards;
    user-select: none;
    cursor: pointer;
}

/* all panels */
.p {
    position: absolute;
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

/* big panel to make clicking more consistent */
.a1 {
    top: 0em;
    left: 0em;
    width: 14em;
    height: 9em;
    transform: translateZ(1em);
    background-color: transparent;
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