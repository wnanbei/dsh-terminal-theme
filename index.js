/**
 * Host half of the terminal color-theme bundle.
 *
 * Everything this plugin does lives in the browser: the client half scopes
 * color variables to the terminal panel and renders the Settings page. The
 * Host row exists so the bundle is installable and so its client module is
 * served by the Web client; it registers no Host resource.
 */

/** No Host service is required. */
export const inject = []

/**
 * Keep the Host row inert while the client half owns the feature.
 * @returns nothing.
 */
export function apply() {}
