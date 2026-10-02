/**
 * Stops anything in the Source from running code: inline event handlers,
 * javascript: URLs, scripts, eval (outside development) and plugins. The
 * page's own scripts load from our origin, so allowing only that keeps
 * gx-mermaid and its lazily loaded diagram code working. Added from script because the page's static import map is inline
 * and would be blocked by a policy in the HTML.
 *
 * Parsed <script> elements never run anyway; this covers everything else.
 */

// Parcel's hot reloading applies updates with eval, so allow it in development.
const evalSource = process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'";
const policy = document.createElement('meta');
policy.httpEquiv = 'Content-Security-Policy';
// location.origin is the URL's origin, even though this document's is opaque.
policy.content = `script-src ${location.origin}${evalSource}; object-src 'none'`;
document.head.append(policy);
