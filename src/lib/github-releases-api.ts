import type { paths as $paths } from "@octokit/openapi-types";

type ReleaseInfo = $paths["/repos/{owner}/{repo}/releases"]["get"];
type PotentialReleasesResponses = ReleaseInfo["responses"];


/** @license Apache-2.0 */
interface TypedHeaders<HeadersRecord extends Record<string, string>> extends Headers {
    append<Header extends keyof HeadersRecord>(name: Header, value: HeadersRecord[Header]): void;
    delete(name: keyof HeadersRecord): void;
    
    get<
        Header extends ((string & {}) | keyof HeadersRecord)
    >(name: Header): 
        Header extends keyof HeadersRecord 
            ? HeadersRecord[Header] 
            : null;
    has(name: keyof HeadersRecord): name is keyof HeadersRecord;
    set<Header extends keyof HeadersRecord>(name: Header, value: HeadersRecord[Header]): void;
    
    forEach(
        callbackfn: <Header extends Exclude<keyof HeadersRecord, symbol | number>>(
            value: HeadersRecord[Header], 
            key: Header, 
            parent: TypedHeaders<HeadersRecord>,
        ) => void, 
        thisArg?: any,
    ): void;


    [Symbol.iterator]<Keys extends keyof HeadersRecord>(): HeadersIterator<[Keys, HeadersRecord[Keys]]>;
    entries<Keys extends keyof HeadersRecord>(): HeadersIterator<[Keys, HeadersRecord[Keys]]>;
    
    keys(): HeadersIterator<Exclude<keyof HeadersRecord, number | symbol>>;
    values(): HeadersIterator<HeadersRecord[keyof HeadersRecord]>;
}


/** @license Apache-2.0 */
interface TypedResponse<
    StatusCode extends Response["status"],
    CustomHeaders extends TypedHeaders<Record<string, string>> = TypedHeaders<Record<string, string>>,
    Url extends Response["url"] = Response["url"],
> extends Response {
    readonly status: StatusCode;
    readonly ok: StatusCode extends 200 | 201 | 202 | 204 | 205 ? true : false;

    readonly url: Url;
    readonly headers: CustomHeaders;

    clone(): this;    
}

interface TypedJsonResponse<
    StatusCode extends Response["status"],
    Data extends unknown,
    CustomHeaders extends TypedHeaders<Record<string, string>> = TypedHeaders<Record<string, string>>,
    Url extends Response["url"] = Response["url"],
> extends TypedResponse<StatusCode, CustomHeaders, Url> {
    json(): Promise<Data>;
}



import type { ResponseHeaders as $ResponseHeaders } from "@octokit/types";

type CleanGithubResponseHeaders = {
    [Header in keyof $ResponseHeaders as string extends Header ? never : Header]: string;
};



export type ReleasesResponse<
    StatusCode extends keyof PotentialReleasesResponses = keyof PotentialReleasesResponses,
    Content extends PotentialReleasesResponses[StatusCode]["content"] = PotentialReleasesResponses[StatusCode]["content"]
> = keyof Content extends "application/json"
    ? TypedJsonResponse<
        StatusCode,
        Content["application/json"],
        TypedHeaders<CleanGithubResponseHeaders>
    >
    : TypedResponse<
        StatusCode,
        TypedHeaders<CleanGithubResponseHeaders>
    >;
