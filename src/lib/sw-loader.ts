// import serviceWorkerUrl from "../sw.ts?url";
// import serviceWorkerUrl from "./sw.ts?url";


function joinUrlPaths(...paths: string[]) {
    return paths.reduce((segment1, segment2) => {
        if(segment1.endsWith("/")) {
            return segment2.startsWith("/")
                ? segment1 + segment2.slice(1)
                : segment1 + segment2;
        } else {
            return segment2.startsWith("/")
                ? segment1 + segment2
                : segment1 + "/" + segment2;
        }
    });
}

async function registerServiceWorker() {
    const scope = location.pathname.replace(/\/[^\/]+$/, "/");

    const sw = await navigator.serviceWorker.register(
        joinUrlPaths(
            import.meta.env.BASE_URL,
            import.meta.env.PROD 
                ? "/sw.js"
                : "/dev-sw.js?dev-sw",
        ),
        { 
            scope, 
            type: import.meta.env.DEV 
                ? "module"
                : "classic",
        },
    );

    sw.addEventListener("updatefound", () => {
        const installingWorker = sw.installing!;
        console.info("[SW Loader] A new service worker is being installed:", installingWorker);

        installingWorker.addEventListener("statechange", () => {
            const { state } = installingWorker;

            if(state === "installed") {
                // caches
                //     .keys()
                //     .then((keyList) =>
                //         Promise.all(
                //             keyList.map((key) => caches.delete(key)),
                //         ),
                //     )
                //     .then(() => {
                //         console.log("Deleted all caches");
                //     });
                
                console.info("[SW Loader] Service worker installed"); 
                // location.reload();
            }
        });
    });

    console.info("[SW Loader] Registration succeeded. Scope is " + sw.scope);
}


if ("serviceWorker" in navigator) {
    registerServiceWorker()
        .catch((error) => {
            // registration failed
            console.error("[SW Loader] Registration failed with " + error);
        });

    
    if (navigator.serviceWorker.controller) {
        populateVersionPicker();
    } else {
        navigator.serviceWorker.ready
            .then(() => populateVersionPicker());
    }
}



type VersionInfo = [
    string, 
    {
        url: string,
        slug: string,
    }
];

declare global {
    interface Window {
        versionInfoMap: Map<VersionInfo[0], VersionInfo[1]>
    }
}


import type { ReleasesResponse } from "./github-releases-api.ts";

const NULL = Symbol(`safePromise: null`);
async function safePromise<P extends Promise<unknown>>(promise: P): Promise<[Awaited<P>, typeof NULL] | [typeof NULL, any]> {
    try {
        return [await promise, NULL];
    } catch (e) {
        return [NULL, e];
    }
}


async function populateVersionPicker() {
    const [response, responseError] = await safePromise(
        fetch(
            "https://api.github.com/repos/jindrapetrik/jpexs-decompiler/releases?per_page=20"
        ) as Promise<ReleasesResponse>
    );

    if(responseError !== NULL || response === NULL || !response.ok) {
        alert("Failed to fetch FFDEC versions");
        console.error("Error:", responseError, "Response:", response);

        return;
    }


    const [releasesJson, jsonError] = await safePromise(
        (response as ReleasesResponse<200>).json()
    );

    if(jsonError !== NULL || releasesJson === NULL) {
        alert("Failed to parse GitHub releases API response as JSON.")
        console.error("Error:", jsonError, "JSON:", releasesJson);

        return;
    }


    const versionInfo: VersionInfo[] = releasesJson.map(release => {
        const { name, tag_name } = release;
        const downloadUrl = release.assets
            // Get only the universal zip. Technically "lib" is in the java doc 
            // zip file name, but here anyways for completeness.
            .filter((asset) => /(?<!(mac|lib|javadoc).*)\.zip/.test(asset.name))
            .map((asset) => asset.browser_download_url)
            .at(0)!;

        return [
            name!,
            {
                url: downloadUrl,
                slug: tag_name,
            },
        ];
    });
    window.versionInfoMap = new Map(versionInfo);


    const versionSelect = document.querySelector("select")!;
    const versionSelectOptions: HTMLOptionElement[] = [];

    for (const [name] of versionInfo) {
        const option = document.createElement("option");
        option.textContent = name;

        versionSelectOptions.push(option);
    }

    versionSelect.append(...versionSelectOptions);
}
