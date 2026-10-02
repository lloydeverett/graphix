/**
 * Stops anything in the Source from running code: inline event handlers,
 * javascript: URLs and scripts. The page's own scripts load from our origin,
 * so allowing only that keeps gx-mermaid and its lazily loaded diagram code
 * working. Added from script because the page's static import map is inline
 * and would be blocked by a policy in the HTML.
 *
 * Parsed <script> elements never run anyway; this covers everything else.
 */
const policy = document.createElement('meta');
policy.httpEquiv = 'Content-Security-Policy';
// location.origin is the URL's origin, even though this document's is opaque.
policy.content = `script-src ${location.origin}`;
document.head.append(policy);
