// communications with the server

import { io, Socket } from "socket.io-client";
import { reactive, ref } from "vue";

export const serverHostname = process.env.NODE_ENV == 'production' ? '' : 'https://localhost:9000';

export const createNamespacedSocket = (namespace: string, auth?: string): Socket => {
    return io(`${serverHostname}/${namespace}`, {
        auth: {
            token: auth
        },
        withCredentials: true
    });
};

export const serverFetch = (path: string, body?: string): Promise<Response> => {
    return fetch(serverHostname + (path.startsWith('/') ? path : '/' + path), {
        mode: 'cors',
        credentials: 'include',
        body: body
    });
};

export const connectionState = reactive<{
    loggedIn: boolean
}>({
    loggedIn: false
});

export class TestClass {
    buh: {
        oof: boolean
    } = {
            oof: true
        };
    e: string = 'asdf';
    testtest: {
        u1: string,
        u2: {
            s: number
        },
        u3: boolean
    } = {
        u1: '1',
        u2: {
            s: 8383
        },
        u3: false
    };
    anotherClass: TestSubclass = new TestSubclass(2);
}
export class TestSubclass {
    variable: number;

    constructor(n: number) {
        this.variable = n;
    }
}
export const test = ref(new TestClass());
setInterval(() => {
    test.value.buh.oof = Math.random() < 0.5;
    test.value.e = Math.random().toFixed(2);
    test.value.testtest = {
        u1: Math.random().toFixed(6),
        u2: {
            s: Math.random() * 5
        },
        u3: Math.random() < 0.5
    };
    test.value.anotherClass = new TestSubclass(Math.random());
}, 100)