import { resolve } from 'node:path'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue({
            template: {
                compilerOptions: {
                    isCustomElement: (tag) => ['codeblock'].includes(tag)
                }
            }
        })
    ],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src/')
        }
    },
    build: {
        target: 'es2021'
    },
    server: {
        port: 5170
    }
})