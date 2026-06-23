// @ts-check

import { x } from "tinyexec";
/** @import { AstroConfig, AstroIntegration } from "astro" */
/** @import {ChiiIntegrationConfig} from "./integration-data-store.js" */
import { setIntegrationData, updateIntegrationData } from "./integration-data-store.js";
import { safePath } from "./common.js";


/**
 * @template {ChiiIntegrationConfig} Config
 * @param {Config} params
 * @returns {Config["UNSAFE_incorporateChiiIntoTheViteServerProcessAllowingTheCompromiseOfProcessIntegrity"] extends true 
 *     ? Promise<AstroIntegration>
 *     : AstroIntegration
 * }
 */
export default function ChiiIntegration(params) {
    params ??= /** @type {Config} */({});
    params.port ??= 8080;
    params.prefix ??= "/chii";
    params.prefix = safePath(params.prefix);
    params.UNSAFE_incorporateChiiIntoTheViteServerProcessAllowingTheCompromiseOfProcessIntegrity ??= false;

    const { port, prefix } = params;
    const UNSAFE_incorporateChiiIntoTheViteServerProcess = params.UNSAFE_incorporateChiiIntoTheViteServerProcessAllowingTheCompromiseOfProcessIntegrity;


    let isDev = process.env.NODE_ENV === "development";
    const notDev = (/** @type {boolean | undefined} */ extraIsDevCondition) => {
        if(extraIsDevCondition) {
            isDev = isDev && extraIsDevCondition;
        }

        return isDev !== true;
    };

    setIntegrationData({ port, prefix, disabled: true });
    console.log(`[Chii Integration]: will use a subprocess: ${UNSAFE_incorporateChiiIntoTheViteServerProcess !== true}`)


    if(UNSAFE_incorporateChiiIntoTheViteServerProcess !== true) {
        // @ts-expect-error: (2322)
        return {
            name: "astro-chii",
            hooks: integrateChiiWithASubprocess({ 
                notDev,
                serverInfo: { prefix, port },
            }),
        };
    }


    // @ts-expect-error: (2322)
    return new Promise(async () => {
        const { integrateChiiExposedServer } = await import("./chii-on-vite-server.js");

        return {
            name: "astro-chii",
            hooks: integrateChiiExposedServer({ 
                notDev,
                serverInfo: { prefix },
            }),
        };
    });
}


/** @typedef {ReturnType<typeof x>} ProcessResult */

/**  @type {ProcessResult | null} */
let chiiProcess = null;

/** @param {ProcessResult} process */
const processToPromise = (process) => {
    return new Promise((resolve, reject) => {
        process.then(resolve, reject);
    });
};


/**
 * @param {Object} params
 * @param {(extraIsDevCondition?: boolean) => boolean} params.notDev
 * @param {{ prefix: string, port: number }} params.serverInfo
 * 
 * @returns {AstroIntegration["hooks"]}
 */
function integrateChiiWithASubprocess({ notDev, serverInfo }) {
    const { prefix, port } = serverInfo;

    /** @type {AstroConfig} */
    let cachedAstroConfig;

    return {
        "astro:config:setup": ({ command, logger, config, updateConfig }) => {
            if(notDev(command === "dev")) {
                logger.info("Skipping Chii configuration for non-development environment");
                return;
            }

            cachedAstroConfig = config;
            const basePath = safePath(`${config.base}/${prefix}/`);

            updateConfig({
                vite: {
                    server: {
                        proxy: {
                            [`^${basePath}.*`]: {
                                target: `ws://127.0.0.1:${port}/`,
                                ws: true,

                                // changeOrigin: true,
                                // rewriteWsOrigin: true,
                                // rewrite: (path) => path.replace(prefix, ""),
                            },
                            [basePath]: {
                                target: `http://127.0.0.1:${port}/`,
                                // changeOrigin: true,
                            },
                        },
                    }
                }
            });
        },
        "astro:config:done": ({ config }) => {
            if(cachedAstroConfig.base !== config.base) {
                throw new Error(
                    "Mismatch between site base at config start and config end. Started " +
                    `with '${cachedAstroConfig.base}' and ended with '${config.base}'. ` +
                    "Ensure no plugins are modifying this path."
                );
            }
        },
        "astro:server:setup": async ({ logger }) => {
            const serverLogger = logger.fork(logger.label + "/server");

            // If somehow a Chii server already exists, kill it
            if(chiiProcess) {
                chiiProcess.kill();
            }

            if(notDev()) {
                return;
            }


            const basePath = safePath(`${cachedAstroConfig.base}/${prefix}/`);

            chiiProcess = x("chii", ["start",
                "-p", `${port}`,
                "--base-path", basePath,
            ]);
            await waitForChiiOutput(chiiProcess);

            // If Chii failed to start
            if(chiiProcess.exitCode) {
                logger.error(`Unable to start Chii. Verify that the specified port (${port}) is available.`);

                chiiProcess = null;
                return;
            }

            updateIntegrationData({ disabled: false });
            serverLogger.info("Chii has successfully started");
        },
        "astro:server:done": async ({ logger }) => {
            const serverLogger = logger.fork(logger.label + "/server");
            
            updateIntegrationData({ disabled: true });

            if(chiiProcess) {
                chiiProcess.kill();
                await processToPromise(chiiProcess);
                chiiProcess = null;

                serverLogger.info("Chii has successfully shut down.");
            }
        }
    };
}

/**
 * Wait for Chii output (indicating Chii was started)
 * 
 * @param {Exclude<typeof chiiProcess, null>} chiiProcess 
 */
async function waitForChiiOutput(chiiProcess) {
    for await (const _ of chiiProcess) {
        return;
    }
}
