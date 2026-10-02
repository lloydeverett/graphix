# graphix

A live HTML editor that runs entirely in the browser: type HTML on the left, see it rendered on the right.
Wrap Mermaid in `<gx-mermaid>` to draw a diagram:

```html
<gx-mermaid>
  flowchart LR
    A --> B
</gx-mermaid>
```

The preview runs in a sandboxed iframe (`allow-scripts` only), so scripts in
your HTML run without access to the editor. Edits update the preview in place;
**Refresh** rebuilds it from scratch.

When hosting the built site, serve the preview's scripts with
`Access-Control-Allow-Origin: *`: the sandboxed iframe has an opaque origin,
so its module scripts load as cross-origin requests.

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
- `pnpm typecheck`: `tsc --noEmit`

## Dependencies

`pnpm-workspace.yaml` enforces a 7-day minimum release age, blocks provenance
downgrades, and denies dependency install scripts unless listed under
`allowBuilds`. Vet any new dependency before adding it.
