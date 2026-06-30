// @ts-check
import { defineConfig } from "astro/config";
import Chii from "./src/chii-integration/index.js";
import AstroPWA from "@vite-pwa/astro";


// console.log("ENV", process.env.NODE_ENV);
// const isDevelopmentEnv = process.env.NODE_ENV === "development";
/**
 * @template [T=any]
 * 
 * @param {string} tag 
 * @param {T} param 
 * @returns {T}
 */
// function echo(tag, param) {
//     console.log(`[${tag}]`, param);
//     return param;
// }

// https://astro.build/config
export default defineConfig({
    devToolbar: {
        enabled: false,
    },
    vite: {
        build: {
            sourcemap: true,
        },
        server: {
            strictPort: true,
        },
        // server: isDevelopmentEnv
        //     ? {
        //         // proxy: {
        //         //     '^/chii/target/.*': {
        //         //         target: 'ws://127.0.0.1:8080/',
        //         //         ws: true,
        //         // 
        //         //         changeOrigin: true,
        //         //         rewriteWsOrigin: true,
        //         //         rewrite: (path) => path.replace(/^\/chii/, ''),
        //         //     },
        //         //     '/chii/': {
        //         //         target: 'http://127.0.0.1:8080/',
        //         //         changeOrigin: true,
        //         //         // rewrite: (path) => path.replace(/^\/chii/, ''),
        //         //     },
        //         //     // '^/chii/.*': {
        //         //     //     target: 'http://127.0.0.1:8080/',
        //         //     //     changeOrigin: true,
        //         //     //     rewrite: (path) => path.replace(/^\/chii/, ''),
        //         //     // },
        //         // },
        //     }
        //     : {},
    },
    server: {
        headers: {
            "Service-Worker-Allowed": "/",
        },
    },
    integrations: [
        Chii({ prefix: "/chii" }),
        AstroPWA({
            // Source file: /src/sw.ts
            srcDir: "src/lib",
            filename: "sw.ts",
            
            // Use the custom service worker instead of a generated one
            strategies: "injectManifest",
            // @ts-expect-error: (2375)
            // Disable injecting workbox manifest into the service worker. This 
            // is different than the PWA manifest.
            injectManifest: {
                injectionPoint: undefined,
            },
            // Disable generating a PWA manifest
            manifest: false,
            // Manually register the service worker
            injectRegister: false,


            // Enable SW on development
            devOptions: {
                enabled: true,
                // Using a custom SW switches the default type to 'classic' so we 
                // have to change it back.
                type: "module",
            },
        }),
    ],
});
