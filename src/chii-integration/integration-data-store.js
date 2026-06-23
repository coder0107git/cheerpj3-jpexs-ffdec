// @ts-check
import { version as chiiVersion } from "chii/package.json" with { type: "json" };

const __internalIntegrationDataKey = Symbol.for(`__chiiAstroIntegration [Chii ${chiiVersion}]`);

/** 
 * @typedef {Object} ChiiIntegrationConfig
 * @prop {string} [prefix="/chii"] The path for Chii to listen on. **This is relative to the site base.** Defaults to `/chii`.
 * @prop {number} [port=8080] Defaults to `8080`. An error is thrown if the specified port is unavailable.
 * @prop {boolean} [UNSAFE_incorporateChiiIntoTheViteServerProcessAllowingTheCompromiseOfProcessIntegrity=false] **UNSAFE!** 
 * Don't use unless you really know what you are doing. Integrating Chii in this manner compromises the integrity of the server 
 * process. You really should reconsider using this option!
 */



/**
 * @typedef {Required<Omit<
 *     ChiiIntegrationConfig, 
 *     "UNSAFE_incorporateChiiIntoTheViteServerProcessAllowingTheCompromiseOfProcessIntegrity"
 * >> & { disabled: boolean }} IntegrationData
 * 
 * @typedef {typeof globalThis & {
 *     [__internalIntegrationDataKey]: IntegrationData
 * }} ExtendedGlobal
 */

/**
 * @param {IntegrationData} data 
 */
export function setIntegrationData(data) {
    (/** @type {ExtendedGlobal} */(globalThis))[__internalIntegrationDataKey] = data;
}

/**
 * @param {Partial<IntegrationData>} data 
 */
export function updateIntegrationData(data) {
    (/** @type {ExtendedGlobal} */(globalThis))[__internalIntegrationDataKey] = {
        ...getIntegrationData(),
        ...data,
    };
}

/**
 * @returns {IntegrationData}
 */
export function getIntegrationData() {
    return (/** @type {ExtendedGlobal} */(globalThis))[__internalIntegrationDataKey] ?? {
        disabled: true,
    };
}
