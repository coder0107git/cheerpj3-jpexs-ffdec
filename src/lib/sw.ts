/// <reference no-default-lib="true"/>
/// <reference lib="ESNext" />
/// <reference lib="webworker" />

// See <https://web.dev/articles/service-worker-lifecycle> for tips and
// tricks when dealing with service workers.

// Default type of `self` is `WorkerGlobalScope & typeof globalThis`. We
// don't want `globalThis` because this isn't a regular window.
// https://github.com/microsoft/TypeScript/issues/14877
declare var self: ServiceWorkerGlobalScope;
declare var clients: ServiceWorkerGlobalScope["clients"];


// @ts-expect-error the lack of types for Wayne
import { Wayne, FileSystem } from "@jcubic/wayne/index.js";
import mime from "mime";
import fsPath from "path-browserify";
import parseRange from "range-parser";

import { configure, fs, resolveMountConfig, /*InMemory*/ } from "@zenfs/core";
import { Zip } from "@zenfs/archives";
//import streamToBlob from "https://esm.sh/stream-to-blob";
import { IndexedDB } from "@zenfs/dom";

import { 
    CACHE_KEY, 
    CACHE_KEY_PREFIX,
    cache,
} from "./sw-cache-utils.ts";


self.addEventListener("install", () => {
    // Automatically start service worker
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    // Force all pages in scope to use this service worker
    event.waitUntil(clients.claim());

    // Delete old caches
    event.waitUntil((async () => {
        const cacheList = await caches.keys();
        const deletionResults = await Promise.allSettled(
            cacheList.map(async (key) => {
                if(
                    key.startsWith(CACHE_KEY_PREFIX) !== true || 
                    key !== CACHE_KEY
                ) {
                    return;
                }
                
                await caches.delete(key);
            })
        );

        for (const result of deletionResults) {
            if(result.status === "rejected") {
                console.error(result.reason);
            }
        }
    })());
});


const app = new Wayne();

// TODO: Investigate if this should be moved to `event.waitUntil`.
const fsConfigured = configure({
    mounts: {
        "/mnt": IndexedDB, //InMemory,
    },
}).then(() => {
    //fs.mkdirSync("/mnt");
    fs.writeFileSync("/mnt/hello.txt", "Hello from SW!", { flag: "w" });
    app.use(async (req: any, res: any, next: any) => {
        const url = new URL(req.url);
        const extension = fsPath.extname(url.pathname);
        const fileName = fsPath.basename(url.pathname);

        // Only catch URLs for this site
        if (url.origin !== location.origin) {
            next();
            return;
        }
        
        const range: string = req.headers.get("Range");
        
        if(url.pathname.startsWith("/__fs__/") === false || !range) {
            next();
            return;
        }
        console.log(url.pathname, range);

        
        const virtualFilePath = url.pathname.replace("/__fs__", "");
        
        const { size, fileExists } = await fs.promises
            .stat(virtualFilePath, { bigint: false })
            .then(stats => ({
                ...stats, 
                fileExists: true 
            }))
            .catch(() => ({ 
                size: 0, 
                fileExists: false 
            }));

        if(fileExists === false) {
            return res.send(null, {
                status: 404,
                statusText: "Not Found",
            });
        }

        const rangeResult = parseRange(size, range);

        // If invalid range then return error
        if(typeof rangeResult !== "object" || rangeResult.type !== "bytes") {
            return res.send(null, {
                status: 416,
                statusText: "Range Not Satisfiable",
                headers: new Headers({
                    "Content-Range": `bytes */${size}`,
                }),
            });
        }

        const { start, end } = rangeResult[0]!;
        console.log(virtualFilePath, [start, end]);

        
        /*const stream: Blob = await streamToBlob(  
            fs.createReadStream(virtualFilePath, { start, end })
        );*/
        // TODO: Replace this with `fs.createReadStream(virtualFilePath, { start, end })`
        // once https://github.com/zen-fs/core/issues/175 is resolved.
        // TODO: The above issue has been resolved. Do the above todo.
        const file = await fs.openAsBlob(virtualFilePath);
        const stream = file.slice(
            start, 
            // End is not inclusive unlike `fs.createReadStream` so `+1` is needed
            end + 1
        );
        // @\ts-expect-error
        console.log(file.size, stream.size, end - start + 1);//await new Response(stream).text(), await streamToBlob(stream))
        console.log((await stream.text()).slice(0, 50));

        return res.send(stream, {
            status: 206,
            statusText: "Partial Content",
            type: mime.getType(extension),
            headers: new Headers({
                "Accept-Ranges": "bytes",
                "Content-Range": `bytes ${start}-${end}/${size}`,
                "Content-Length": `${end - start + 1}`,
                "Content-Disposition": `inline; filename="${fileName}"`,
                "Date": new Date().toUTCString(),
            }),
        });

            //next();
        //} else {
        //    //res.fetch(req);
        //    next();
        //}
        
        // const extension = path.extname(url.pathname);
        // const accept = req.headers.get("Range");
    
        // console.log(url, extension, accept, [...req.headers.entries()]);
    
        // // if (extension === '.js' && accept.match(/text\/html/)) {
        // //     res.text('// Sorry no source code for you');
        // // } else {
        // //     res.fetch(req);
        // // }
    
        // return next();
    });

    app.use(
        FileSystem({ 
            path: fsPath, 
            fs: fs.promises, 
            mime,
            prefix: "__fs__",
        })
    );
});


app.post("/loadFs", async (req: any, res: any) => {
    const { slug, url } = await req.json();

    const mountedFile = await fs.promises
        .access(`/mnt/${slug}/ffdec.sh`, fs.constants.R_OK)
        .then(() => true)
        .catch(() => false);
    if (!mountedFile) {
        await fsConfigured;

        const cacheResponse = await cache.match(url);
        let zipFile = cacheResponse;

        if(!cacheResponse) {
            if(!navigator.onLine) {
                return res.text("File not cached and disconnected from the internet. Please try again when you reconnect to the internet.", {
                    status: 503,
                    statusText: "Service Unavailable",
                });
            }
            
            // If not in cache, cache it
            zipFile = await fetch("https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(url));

            cache.put(url, zipFile.clone());
        }

        const zipFs = await resolveMountConfig(
            { backend: Zip, data: await zipFile!.arrayBuffer() }
        );
        fs.mount(`/mnt/${slug}`, zipFs);
    }

    return res.text(`__fs__/mnt/${slug}/`);
});


app.get("/example.swf", async (_req: any, res: any) => {
    const cache = await caches.open("example-swf");
    const cacheResponse = await cache.match("example.swf");
    let exampleSwf = cacheResponse;

    // If not in cache, cache it. If not online, tough luck.
    if (!cacheResponse && navigator.onLine) {
        exampleSwf = await fetch(
            // CORS Proxy
            // "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(
            //     "http://web.archive.org/web/20200730061016oe_/https://media.scouting.org/boyslife/onlinegames/tankz2/tankz2.swf"
            // )
            "/ffdec_20-1-0/libsrc/ffdec_lib/testdata/as3/as3.swf"
        );

        cache.put("example.swf", exampleSwf.clone());
    }

    res.respond(exampleSwf);
});

// const res = await fetch(
//     "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(
//         "https://github.com/jindrapetrik/jpexs-decompiler/releases/download/nightly2955/ffdec_21.1.1_nightly2955.zip"
//     )
// );

// await configure({
//     mounts: {
//         "/mnt/zip": { backend: Zip, data: await res.arrayBuffer() },
//     },
// });

// app.use(FileSystem({ path, fs: fs.promises, mime, prefix: "__fs__" }));
