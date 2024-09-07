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

export const serverFetch = async (path: string, method?: 'GET' | 'POST' | 'PUT' | 'DELETE', body?: any): Promise<Response> => {
    try {
        return await fetch(serverHostname + (path.startsWith('/') ? path : '/' + path), {
            method: method ?? 'GET',
            mode: 'cors',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
    } catch (err) {
        return Response.error();
    }
};

export const connectionState = reactive<{
    connected: boolean
    connectionFailed: boolean
    loggedIn: boolean
    username: string
}>({
    connected: false,
    connectionFailed: false,
    loggedIn: false,
    username: 'Not Logged In'
});

export const httpCodeToMessage = (code: number, item?: string): string => {
    switch (code) {
        case 200: return 'Success';
        case 409: return `${item ?? 'Item'} already exists`;
        case 404: return `${item ?? 'Item'} does not exist`;
        case 403: return 'Incorrect credentials';
        case 500: return 'Internal error';
        case 400: return `Malformed request (is this a bug?)`;
        case 401: return `Not logged in`;
        case 0: return 'Fetch failed (are you connected to the internet?)';
        default: return `Unknown response: HTTP code ${code} (is this a bug?)`;
    }
};

const attemptConnect = async () => {
    const res = await serverFetch('/loginTest');
    if (res.ok) connectionState.loggedIn = true;
    if (res.status == 0) {
        connectionState.connectionFailed = true;
        setTimeout(attemptConnect, 5000);
    } else {
        connectionState.connected = true;
        connectionState.connectionFailed = false;
    }
};
window.addEventListener('load', attemptConnect);