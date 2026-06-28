/// <reference no-default-lib="true"/>
/// <reference lib="ESNext" />
/// <reference lib="webworker" />

// Default type of `self` is `WorkerGlobalScope & typeof globalThis`
// https://github.com/microsoft/TypeScript/issues/14877
declare var self: ServiceWorkerGlobalScope;
declare var clients: ServiceWorkerGlobalScope["clients"];


export const CACHE_KEY_PREFIX = "CheerpJ-FFDEC";

const date = new Date();
const year = date.getUTCFullYear();
const month = date.getUTCMonth();
export const CACHE_KEY = `${CACHE_KEY_PREFIX}-${year}-${month}`;

export const cache = await caches.open(CACHE_KEY);

// export {};

