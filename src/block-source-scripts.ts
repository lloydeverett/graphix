/**
 * Stops anything in the Source from running code: inline event handlers,
 * javascript: URLs, scripts, eval and plugins. The page's own scripts load
 * from our origin, so allowing only that keeps gx-mermaid and its lazily
 * loaded diagram code working. It's added once the page's own scripts are
 * running, so nothing they need is blocked by it.
 *
 * Parsed <script> elements never run anyway; this covers everything else.
 */
const policy = document.createElement('meta');
policy.httpEquiv = 'Content-Security-Policy';
// location.origin is the URL's origin, even though this document's is opaque.
policy.content = `script-src ${location.origin}; object-src 'none'`;
document.head.append(policy);
