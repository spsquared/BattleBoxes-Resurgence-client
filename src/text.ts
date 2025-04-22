// text transitions (from red pixel simulator)
import { ref, watch } from 'vue';

import type { Ref, WatchSource} from 'vue';

// these support HTML tags but it's very buggy, it's best to not use them (HTML character codes are fine)
function getTags(from: string, to: string) {
    let cleanFrom = from;
    let cleanTo = to;
    const fromTags = from.match(/(&\S*?;)|(<\S*?>)/g) ?? [];
    const toTags = to.match(/(&\S*?;)|(<\S*?>)/g) ?? [];
    fromTags.forEach((tag) => cleanFrom = cleanFrom.replace(tag, '§'));
    toTags.forEach((tag) => cleanTo = cleanTo.replace(tag, '§'));
    return { cleanFrom, cleanTo, fromTags, toTags };
}

export function flipTextTransition(from: string, to: string, update: (text: string) => boolean | void, speed: number, block: number = 1): AsyncTextTransition {
    let cancelled = false;
    const ret: AsyncTextTransition = {
        promise: new Promise((resolve) => {
            const gen = flipTextTransitionGenerator(from, to, block);
            const animate = setInterval(() => {
                const next = gen.next();
                if (cancelled || next.done || update(next.value)) {
                    clearInterval(animate);
                    ret.finished = true;
                    resolve(!cancelled);
                }
            }, 1000 / speed);
        }),
        finished: false,
        cancel: () => cancelled = true
    };
    return ret;
}
export function* flipTextTransitionGenerator(from: string, to: string, block: number): Generator<string, undefined, undefined> {
    const { cleanFrom, cleanTo, fromTags, toTags } = getTags(from, to);
    const addSpaces = to.length < from.length;
    let i = 0;
    while (true) {
        let text = cleanTo.substring(0, i);
        if (addSpaces && i >= cleanTo.length) {
            for (let j = cleanTo.length; j < i; j++) {
                text += ' ';
            }
        }
        for (let j = 0; text.includes('§'); j++) {
            text = text.replace('§', toTags[j]);
        }
        text += cleanFrom.substring(i);
        let k = text.lastIndexOf('§'); // most useless optimization ever
        for (let j = fromTags.length - 1; k >= 0; j--) {
            text = text.substring(0, k) + fromTags[j] + text.substring(k + 1);
            k = text.lastIndexOf('§');
        }
        i += block;
        if (i >= cleanTo.length + block && (!addSpaces || i >= cleanFrom.length + block)) {
            yield to;
            break;
        }
        yield text;
    }
}
export function glitchTextTransition(from: string, to: string, update: (text: string) => boolean | void, speed: number, block: number = 1, glitchLength: number = 5, advanceMod: number = 1, startGlitched?: boolean, letterOverride?: string): AsyncTextTransition {
    let cancelled = false;
    const ret: AsyncTextTransition = {
        promise: new Promise((resolve) => {
            const gen = glitchTextTransitionGenerator(from, to, block, glitchLength, advanceMod, startGlitched ?? false, letterOverride);
            const animate = setInterval(() => {
                const next = gen.next();
                if (cancelled || next.done || update(next.value)) {
                    clearInterval(animate);
                    ret.finished = true;
                    resolve(!cancelled);
                }
            }, 1000 / speed);
        }),
        finished: false,
        cancel: () => cancelled = true
    };
    return ret;
}
export function* glitchTextTransitionGenerator(from: string, to: string, block: number, glitchLength: number, advanceMod: number, startGlitched: boolean, letterOverride?: string): Generator<string, undefined, undefined> {
    const addSpaces = to.length < from.length;
    const letters = letterOverride ?? 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890-=!@#$%^&*()_+`~[]\\{}|;\':",./?';
    const { cleanFrom, cleanTo, fromTags, toTags } = getTags(from, to);
    let a = 0;
    let i = startGlitched ? cleanTo.length : 0;
    while (true) {
        let text = cleanTo.substring(0, i - glitchLength);
        if (addSpaces && i >= cleanTo.length) {
            for (let j = cleanTo.length; j < i - glitchLength; j++) {
                text += ' ';
            }
        }
        for (let j = 0; text.includes('§'); j++) {
            text = text.replace('§', toTags[j]);
        }
        for (let j = Math.max(0, i - glitchLength); j < Math.min(i, Math.max(cleanFrom.length, cleanTo.length)); j++) {
            text += letters.charAt(~~(Math.random() * letters.length));
        }
        text += cleanFrom.substring(i);
        let k = text.lastIndexOf('§'); // most useless optimization ever
        for (let j = fromTags.length - 1; k >= 0; j--) {
            text = text.substring(0, k) + fromTags[j] + text.substring(k + 1);
            k = text.lastIndexOf('§');
        }
        if (a % advanceMod == 0) i += block;
        if (i >= cleanTo.length + block + glitchLength && (!addSpaces || i >= cleanFrom.length + block + glitchLength)) {
            yield to;
            break;
        }
        yield text;
        a++;
    }
}
export function randomFlipTextTransition(from: string, to: string, update: (text: string) => boolean | void, speed: number, gap: number = 2): AsyncTextTransition {
    let cancelled = false;
    const ret: AsyncTextTransition = {
        promise: new Promise((resolve) => {
            const gen = randomFlipTextTransitionGenerator(from, to, gap);
            const animate = setInterval(() => {
                const next = gen.next();
                if (cancelled || next.done || update(next.value)) {
                    clearInterval(animate);
                    ret.finished = true;
                    resolve(!cancelled);
                }
            }, 1000 / speed);
        }),
        finished: false,
        cancel: () => cancelled = true
    };
    return ret;
}
export function* randomFlipTextTransitionGenerator(from: string, to: string, gap: number): Generator<string, undefined, undefined> {
    const text: string[] = Array.from(from.matchAll(/(&\S*?;)|(<\S*?>)|./g), (v) => v[0]);
    const toArray = Array.from(to.matchAll(/(&\S*?;)|(<\S*?>)|./g), (v) => v[0]);
    if (text.length > toArray.length) {
        for (let i = toArray.length; i < text.length; i++) toArray[i] = ' ';
    } else {
        for (let i = text.length; i < toArray.length; i++) text[i] = ' ';
    }
    const unchanged: number[] = [...(new Array(text.length).keys())];
    let a = 0;
    while (true) {
        if (a++ % gap == 0) {
            const modify = unchanged.splice(~~(Math.random() * unchanged.length), 1)[0];
            text[modify] = toArray[modify];
            if (unchanged.length == 0) {
                yield to;
                break;
            }
        }
        yield text.reduce((p, c) => p + c, '');
    }
}
export function randomGlitchTextTransition(from: string, to: string, update: (text: string) => boolean | void, speed: number, gap: number = 2, startGlitched?: boolean, delay?: number, letterOverride?: string): AsyncTextTransition {
    let cancelled = false;
    const ret: AsyncTextTransition = {
        promise: new Promise((resolve) => {
            const gen = randomGlitchTextTransitionGenerator(from, to, gap, startGlitched ?? false, delay ?? 0, letterOverride);
            const animate = setInterval(() => {
                const next = gen.next();
                if (cancelled || next.done || update(next.value)) {
                    clearInterval(animate);
                    ret.finished = true;
                    resolve(!cancelled);
                }
            }, 1000 / speed);
        }),
        finished: false,
        cancel: () => cancelled = true
    };
    return ret;
}
export function* randomGlitchTextTransitionGenerator(from: string, to: string, gap: number, startGlitched: boolean, delay: number, letterOverride?: string): Generator<string, undefined, undefined> {
    const letters = letterOverride ?? 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890-=!@#$%^&*()_+`~[]\\{}|;\':",./?';
    const text: string[] = Array.from(from.matchAll(/(&\S*?;)|(<\S*?>)|./g), (v) => v[0]);
    const toArray: string[] = Array.from(to.matchAll(/(&\S*?;)|(<\S*?>)|./g), (v) => v[0]);
    if (text.length > toArray.length) {
        for (let i = toArray.length; i < text.length; i++) toArray[i] = ' ';
    } else {
        for (let i = text.length; i < toArray.length; i++) text[i] = ' ';
    }
    const unchanged: number[] = startGlitched ? [] : [...(new Array(text.length).keys())];
    const glitching: number[] = startGlitched ? [...(new Array(text.length).keys())] : [];
    const minGlitching = ~~(Math.max(from.length, to.length) / 2);
    let a = -(delay ?? 0);
    while (true) {
        if (a++ % gap == 0 && a > 0) {
            if (glitching.length > minGlitching || unchanged.length == 0) {
                const modify = glitching.splice(~~(Math.random() * glitching.length), 1)[0];
                text[modify] = toArray[modify];
                if (unchanged.length == 0 && glitching.length == 0) {
                    yield to;
                    break;
                }
            }
            if (unchanged.length > 0) {
                glitching.push(unchanged.splice(~~(Math.random() * unchanged.length), 1)[0]);
            }
        }
        for (let i = 0; i < glitching.length; i++) {
            text[glitching[i]] = letters.charAt(~~(Math.random() * letters.length));
        }
        yield text.reduce((p, c) => p + c, '');
    }
}
export interface AsyncTextTransition {
    promise: Promise<boolean>,
    finished: boolean,
    cancel: () => true
}

export function autoFlipTextTransition(source: WatchSource, speed: number, block = 1): Ref<string> {
    const textRef = ref(typeof source == 'function' ? source() : source.value);
    let runningTransition: AsyncTextTransition;
    const run = () => {
        if (runningTransition != undefined) runningTransition.cancel();
        runningTransition = flipTextTransition(textRef.value, typeof source == 'function' ? source() : source.value, (t) => { textRef.value = t }, speed, block);
    };
    watch(source, run);
    run();
    return textRef;
}
export function autoGlitchTextTransition(source: WatchSource, speed: number, block: number = 1, glitchLength: number = 5, advanceMod: number = 1, startGlitched?: boolean, letterOverride?: string): Ref<string> {
    const textRef = ref(typeof source == 'function' ? source() : source.value);
    let runningTransition: AsyncTextTransition;
    const run = () => {
        if (runningTransition != undefined) runningTransition.cancel();
        runningTransition = glitchTextTransition(textRef.value, typeof source == 'function' ? source() : source.value, (t) => { textRef.value = t }, speed, block, glitchLength, advanceMod, startGlitched, letterOverride);
    };
    watch(source, run);
    run();
    return textRef;
}
export function autoRandomFlipTextTransition(source: WatchSource, speed: number, gap: number = 2): Ref<string> {
    const textRef = ref(typeof source == 'function' ? source() : source.value);
    let runningTransition: AsyncTextTransition;
    const run = () => {
        if (runningTransition != undefined) runningTransition.cancel();
        runningTransition = randomFlipTextTransition(textRef.value, typeof source == 'function' ? source() : source.value, (t) => { textRef.value = t }, speed, gap);
    };
    watch(source, run);
    run();
    return textRef;
}
export function autoRandomGlitchTextTransition(source: WatchSource, speed: number, gap: number = 2, startGlitched?: boolean, delay?: number, letterOverride?: string): Ref<string> {
    const textRef = ref(typeof source == 'function' ? source() : source.value);
    let runningTransition: AsyncTextTransition;
    const run = () => {
        if (runningTransition != undefined) runningTransition.cancel();
        runningTransition = randomGlitchTextTransition(textRef.value, typeof source == 'function' ? source() : source.value, (t) => { textRef.value = t }, speed, gap, startGlitched, delay, letterOverride);
    };
    watch(source, run);
    run();
    return textRef;
}