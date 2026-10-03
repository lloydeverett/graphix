# graphix

A live HTML editor that runs entirely in the browser: type HTML on the left, see it rendered on the right.
Wrap Mermaid in `<gx-mermaid>` to draw a diagram:

```html
<gx-mermaid>
  flowchart LR
    A --> B
</gx-mermaid>
```

The HTML parser reads `<gx-mermaid>`'s contents before Mermaid does, so
Mermaid that looks like HTML must be escaped: write `&lt;&lt;interface&gt;&gt;`
for `<<interface>>`, `A[one&lt;br&gt;two]` for `A[one<br>two]`, and `&amp;` for
a literal `&`.

The preview runs in a sandboxed iframe, and nothing in your HTML runs code:
`<script>` elements, inline event handlers, `javascript:` URLs, `eval` and
plugins are all blocked. (`pnpm dev` allows `eval`, which Parcel's hot reloading
needs; nothing in your HTML can reach it.) Edits update the preview in place; **Refresh** rebuilds it from scratch.

When hosting the built site, serve the preview's scripts with
`Access-Control-Allow-Origin: *`: the sandboxed iframe has an opaque origin,
so its module scripts load as cross-origin requests. If your host can't send
that header, use `pnpm build:same-origin` instead: the Preview then shares the
editor's origin. Your HTML still can't run code, but the origin no longer
separates it from the editor.

## Setup

Requires [nvm](https://github.com/nvm-sh/nvm).

```sh
nvm install          # Node version from .nvmrc
npm install -g pnpm  # pnpm then switches itself to the version in package.json
pnpm install --frozen-lockfile
```

## Scripts

- `pnpm dev`: dev server at http://localhost:1234
- `pnpm build`: static site in `dist/`
- `pnpm build:same-origin`: the same, for hosts that can't send CORS headers
  (see above)
- `pnpm typecheck`: `tsc --noEmit`
- `pnpm test:e2e`: Playwright end-to-end tests, against both the dev server and
  a production build. The first time, run `pnpm exec playwright install
  chromium` (on Linux, also `pnpm exec playwright install-deps chromium`, plus
  fonts if the system has none).

## Dependencies

`pnpm-workspace.yaml` enforces a 7-day minimum release age, blocks provenance
downgrades, and denies dependency install scripts unless listed under
`allowBuilds`. Vet any new dependency before adding it.
