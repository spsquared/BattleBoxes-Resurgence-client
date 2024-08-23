import { io } from "socket.io-client";

export const serverHostname = process.env.NODE_ENV == 'production' ? '' : 'localhost:9000';

export const socket = io(serverHostname);

export const serverFetch = (path: string, body?: string): Promise<Response> => {
    return fetch(serverHostname + (path.startsWith('/') ? path : '/' + path), {
        mode: 'cors',
        credentials: 'include',
        body: body
    });
};

