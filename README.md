# graphix

A live Mermaid editor that runs entirely in the browser: type Mermaid on the left, see the diagram on the right.

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
