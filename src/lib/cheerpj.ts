type CJ3Library = any;

declare global {
    /**
     * @global
     * @see https://cheerpj.com/docs/reference/cheerpjInit
     */
    function cheerpjInit(options?: {
        version?: number;
        status?: "splash" | "none" | "default";
        logCanvasUpdates?: boolean;
        preloadResources?: { [key: string]: number[] };
        preloadProgress?: (preloadDone: number, preloadTotal: number) => void;
        clipboardMode?: "permission" | "system" | "java";
        beepCallback?: () => void;

        /**
         * "*Receive text input from the input method framework of the platform. Useful 
         * to support text input for languages such as Chinese, Japanese and Korean.*"
         * 
         * @since 3.0
         * @see https://cheerpj.com/docs/reference/cheerpjInit#enableinputmethods
         */
        enableInputMethods?: boolean;

        overrideShortcuts?: (evt: KeyboardEvent) => boolean;
        appletParamFilter?: (originalName: string, paramValue: string) => string;
        natives?: { [method: string]: Function };
        overrideDocumentBase?: string;
        javaProperties?: string[];
        tailscaleControlUrl?: string;
        tailscaleDnsUrl?: string;
        tailscaleAuthKey?: string;
        tailscaleLoginUrlCb?: (url: string) => void;
        tailscaleIpCb?: (ip: string) => void;
        licenseKey?: string;

        /**
         * Enables verbose logging of all exceptions, including caught and 
         * internal exceptions.  
         * 
         * > "With exception logging you should be able to find what the 
         * > problem is. Of course not all exceptions are fatal and Java 
         * > tends to use them quite liberally for various internal 
         * > purposes."
         * > 
         * > Source: https://discord.com/channels/988743885121548329/1103695759779573850/1330607298531299338
         * 
         * @since 3.1
         * @see https://cheerpj.com/docs/reference/cheerpjInit#enabledebug
         * @see https://cheerpj.com/docs/guides/cheerpj-debug
         * @see https://discord.com/channels/988743885121548329/1103695759779573850/1330605962909847663
         */
        enableDebug?: boolean;

        /**
         * Intercepts calls to external programs. Receives name along with 
         * any command line options. 
         * 
         * Officially released in 3.1 but available in earlier builds.
         * @since 3.1
         * @example Intercept a request to launch a browser and use 
         * `window.open` to achieve the same functionality.
         * @see https://cheerpj.com/docs/reference/cheerpjInit#execcallback
         * @see https://cheerpj.com/docs/guides/Intercept-external-commands
         * @see https://discord.com/channels/988743885121548329/1103695759779573850/1325036758114762822
         */
        execCallback?: (cmdPath: string, argsArray: string[]) => void
    }): Promise<void>;

    /**
     * @global
     * @see https://cheerpj.com/docs/reference/cheerpjRunMain
     */
    function cheerpjRunMain(
        className: string,
        classPath: string,
        ...args: string[]
    ): Promise<number>;

    /**
     * @global
     * @see https://cheerpj.com/docs/reference/cheerpjRunJar
     */
    function cheerpjRunJar(
        jarName: string,
        ...args: string[]
    ): Promise<number>;

    /**
     * @global
     * @see https://cheerpj.com/docs/reference/cheerpjRunLibrary
     */
    function cheerpjRunLibrary(classPath: string): Promise<CJ3Library>;

    /**
     * @global
     * @see https://cheerpj.com/docs/reference/cheerpjCreateDisplay
     */
    function cheerpjCreateDisplay(
        width: number,
        height: number,
        parent?: HTMLElement
    ): HTMLElement;

    /**
     * @global
     * @see https://cheerpj.com/docs/reference/cjFileBlob
     */
    function cjFileBlob(path: string): Promise<Blob>;

    /**
     * @global
     * @see https://cheerpj.com/docs/reference/cheerpOSAddStringFile
     */
    function cheerpOSAddStringFile(path: string, data: string | Uint8Array): void;

    /**
     * @global
     * @see https://cheerpj.com/docs/reference/cjGetRuntimeResources
     */
    function cjGetRuntimeResources(): string;

    /**
     * @global
     * @see https://cheerpj.com/docs/reference/cjGetProguardConfiguration
     */
    function cjGetProguardConfiguration(): void;

    /**
     * > It gives you the state of all the threads
     * @internal
     * @global
     * @see https://discord.com/channels/988743885121548329/1103695759779573850/1330613377843597365
     */
    function dumpAllThread(param: null): any;
}


// import * as CheerpJ3 from "https://cjrtnc.leaningtech.com/3_20241017_546/cj3loader.js?url";

// @ts-ignore
// const isBrowser = import.meta.env.SSR === false;
type AnyString = string & {};

export async function getCheerpJLink(version: AnyString | "latest" = "4.3") {
    const url =
        version !== "latest"
            ? `https://cjrtnc.leaningtech.com/${version}/loader.js`
            : await fetch("https://cjrtnc.leaningtech.com/LATEST.txt")
                .then(res => res.text());

    return url;
}

type CheerpJ = Pick<
    typeof window,
    | "cheerpjInit"
    | "cheerpjRunMain"
    | "cheerpjRunJar"
    | "cheerpjRunLibrary"
    | "cheerpjRunLibrary"
    | "cjFileBlob"
    | "cheerpOSAddStringFile"
    | "cjGetRuntimeResources"
    | "cjGetProguardConfiguration"
    | "dumpAllThread"
>;

export default async function loadCheerpJ(): Promise<CheerpJ> {
    const cheerpjUrl: string =
        document.querySelector<HTMLTemplateElement>("[data-cheerpj-url]")
            ?.dataset
            ?.cheerpjUrl 
        // If somehow something went wrong fallback to fetching the version dynamically 
        ?? await getCheerpJLink();

    const script = document.createElement("script");
    script.src = cheerpjUrl;


    const { promise, resolve, reject } = Promise.withResolvers();

    script.onload = () => resolve(undefined);
    script.onerror = () => reject();
    

    document.body.append(script);

    await promise;

    // return {
    //     cheerpjInit,
    //     // cheerpjRunMain,
    //     cheerpjRunJar,
    //     cheerpjRunLibrary,
    //     cheerpjCreateDisplay,
    //     cjFileBlob,
    //     cheerpOSAddStringFile,
    //     cjGetRuntimeResources,
    //     cjGetProguardConfiguration,
    //     dumpAllThread
    // };
    return window;
}

// TODO: This was needed to mark this file as a module. Investigate if this is still needed. 
export { };

