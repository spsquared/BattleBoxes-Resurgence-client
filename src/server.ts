// communications with the server

import { io, Socket } from "socket.io-client";
import { reactive } from "vue";

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