import serviceWorkerUrl from "../sw.ts?url";
// import serviceWorkerUrl from "./sw.ts?url";

if ("serviceWorker" in navigator) {
    const scope = location.pathname.replace(/\/[^\/]+$/, "/");

    navigator
        .serviceWorker
        .register(serviceWorkerUrl, { scope, type: "module" })
        .then((reg) => {
            reg.addEventListener("updatefound", () => {
                const installingWorker = reg.installing!;

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

                console.info("[SW Loader] A new service worker is being installed:", installingWorker);
            });

            // registration worked
            console.info("[SW Loader] Registration succeeded. Scope is " + reg.scope);
        }).catch((error) => {
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

type ReleasesAPI = {
    assets: [{ 
        name: string; 
        browser_download_url: string 
    }];
    name: string;
    tag_name: string;
};

declare global {
    interface Window {
        versionInfoMap: Map<VersionInfo[0], VersionInfo[1]>
    }
}

async function populateVersionPicker() {
    const releases: ReleasesAPI[] = await fetch(
            "https://api.github.com/repos/jindrapetrik/jpexs-decompiler/releases?per_page=20"
        )
        .then((res) => res.json())
        .catch(() => alert("Failed to fetch FFDEC versions"));

    const versionInfo: VersionInfo[] = releases.map(release => {
        const { name, tag_name } = release;
        const downloadUrl = release.assets
            // Get only the universal zip. Technically "lib" is in the java doc 
            // zip file name, but here anyways for completeness.
            .filter((asset) => /(?<!(mac|lib|javadoc).*)\.zip/.test(asset.name))
            .map((asset) => asset.browser_download_url)
            .at(0)!;

        return [
            name,
            {
                url: downloadUrl,
                slug: tag_name,
            },
        ];
    });
    window.versionInfoMap = new Map(versionInfo);


    const versionSelect = document.querySelector("select")!;

    versionSelect.append(...versionInfo.map(release => {
        const [name] = release;
        const elem = document.createElement("option");

        elem.innerText = name;

        return elem;
    }));
}
