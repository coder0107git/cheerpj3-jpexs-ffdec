// @ts-check

import chii from "./chii.js";
/** @import { ViteDevServer } from "vite" */
/** @import { AstroConfig, AstroIntegration } from "astro" */
import { safePath } from "./common.js";
import { updateIntegrationData } from "./integration-data-store.js";

/**
 * @param {Object} params
 * @param {(extraIsDevCondition?: boolean) => boolean} params.notDev
 * @param {{ prefix: string }} params.serverInfo
 * 
 * @returns {AstroIntegration["hooks"]}
 */
export function integrateChiiExposedServer({ notDev, serverInfo }) {
    const { prefix } = serverInfo;
    const TLS_SETTING = process.env.NODE_TLS_REJECT_UNAUTHORIZED;

    /** @type {AstroConfig} */
    let cachedAstroConfig;

    return {
        "astro:config:setup": async ({ logger }) => {
            logger.warn(
                "Using the Chii integration in an unsafe mode! Please don't use this unless " +
                "you really know what you are doing."
            );
        },
        "astro:config:done": ({ config }) => {
            cachedAstroConfig = config;
        },
        "astro:server:setup": async ({ logger, server: vite }) => {
            if(notDev()) {
                logger.info("Skipping Chii integration for non-development environment.");
                return;
            }

            const basePath = safePath(cachedAstroConfig.base + "/" + prefix);
            const { server, serverPromise } = makeViteServerSafeForChii(vite, basePath);
            console.log(basePath);

            await chii.start({
                server,
                basePath,
            });
            await serverPromise;

            process.env.NODE_TLS_REJECT_UNAUTHORIZED = TLS_SETTING;
        },
        "astro:server:start": () => {
            if(notDev()) {
                return;
            }
        
            updateIntegrationData({ disabled: false });
        },
        "astro:server:done": () => {
            if(notDev()) {
                return;
            }

            updateIntegrationData({ disabled: true });
        },
    };
}


const ERROR_UNSUPPORTED = new Error(
    "Chii integration unsupported in Vite Middleware mode."
);


/**
 * Chii wants to handle ALL requests by default, so it overrides all 
 * handling. This fixes that.
 * 
 * @param {ViteDevServer} vite
 * @param {string} basePath
 */
function makeViteServerSafeForChii(vite, basePath) {
    if(!vite.httpServer) 
        throw ERROR_UNSUPPORTED;

    const { 
        proxy: onEventListenerProxy, 
        onRequest, 
        onUpgrade, 
    } = onEventProxyTrap({ vite, basePath });

    const serverProxy = new Proxy(vite.httpServer, {
        get(_target, prop, _receiver) {
            if(prop === "on") {
                return onEventListenerProxy;
            }

            return Reflect.get(_target, prop, _receiver);
        }
    });

    return {
        serverPromise: Promise.all([onRequest.promise, onUpgrade.promise]),
        server: /** @type {import("node:http").Server} */(serverProxy),
    };
}


/**
 * @param {Object} params
 * @param {ViteDevServer} params.vite
 * @param {string} params.basePath
 */
function onEventProxyTrap({ vite, basePath }) {
    if(!vite.httpServer) 
        throw ERROR_UNSUPPORTED;


    /** @returns {PromiseWithResolvers<void>} */
    const voidPromiseResolvers = () => Promise.withResolvers();

    const onRequest = voidPromiseResolvers();
    const onUpgrade = voidPromiseResolvers();


    const proxy = new Proxy(vite.httpServer.on, {
        /** @param {[string, (...args: any[]) => any]} argumentsList */
        apply(target, thisArg, argumentsList) {
            const [event, handler] = argumentsList;

            if(event !== "request" && event !== "upgrade") 
                return Reflect.apply(target, thisArg, argumentsList);


            if(event === "request") {
                return handleOnRequestEvent({
                    vite,
                    basePath,
                    handler,
                    onRequest,
                });
            }


            if(!vite.httpServer) 
                throw ERROR_UNSUPPORTED;

            if(event !== "upgrade")
                throw new Error(
                    "[UNREACHABLE]: Only 'upgrade' and 'request' events are wrapped, " +
                    "all others are supposed to be passed on unmodified. Got '" + event + "'."
                );
            
            return handleOnUpgradeEvent({
                vite,
                basePath,
                handler,
                onUpgrade,
            });
        }
    });

    return {
        onRequest,
        onUpgrade,
        proxy,
    };
}

/** 
 * @param {Object} params
 * @param {ViteDevServer} params.vite
 * @param {string} params.basePath
 * @param {import("node:http").RequestListener<
 *     typeof import("node:http").IncomingMessage, 
 *     typeof import("node:http").ServerResponse<
 *         InstanceType<
 *             typeof import("node:http").IncomingMessage
 *         >
 *     >
 * >} params.handler
 * @param {PromiseWithResolvers<void>} params.onRequest
 */
function handleOnRequestEvent({ vite, basePath, handler, onRequest }) {
    const connectServer = vite.middlewares.use((req, res, next) => {
        if(!req.url?.startsWith(basePath)) {
            // The request isn't for Chii so let some other listener deal with it. 
            return next();
        }

        handler(req, res);
    });

    onRequest.resolve();
    return connectServer;
}

/** 
 * @param {Object} params
 * @param {ViteDevServer} params.vite
 * @param {string} params.basePath
 * @param {(
 *     req: InstanceType<typeof import("node:http").IncomingMessage>, 
 *     socket: import("node:stream").Duplex, 
 *     head: Buffer,
 * ) => void} params.handler
 * @param {PromiseWithResolvers<void>} params.onUpgrade
 */
function handleOnUpgradeEvent({ vite, basePath, handler, onUpgrade }) {
    const httpServer = vite.httpServer?.on("upgrade", (req, socket, head) => {
        if(req.url.startsWith(safePath(`${basePath}/target/`)) !== true) {
            // The request isn't for Chii so let some other listener deal with it. 
            return;
        }

        return handler(req, socket, head);
    });

    onUpgrade.resolve();
    return httpServer;
}
