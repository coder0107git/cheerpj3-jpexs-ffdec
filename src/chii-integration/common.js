// @ts-check

/**
 * Normalize the provided path segment to make it safe for usage.
 * @param {string | URL} pathSegment
 */
export function safePath(pathSegment) {
    return new URL(pathSegment, "file:///").pathname;
}

