# Agent notes

graphix is a live HTML editor. `README.md` covers what it does and how to run it;
`CONTEXT.md` is the glossary. Use its terms (Source, Preview, Refresh, Diagram,
Render Error) in code, comments and commits.

## Before calling a change done

Run both, and make sure they pass:

```sh
pnpm typecheck
pnpm test:e2e
```

The e2e tests drive a real Chromium against the dev server and a production
build, which differ (only dev allows `eval`). A failing test leaves a trace in
`test-results/`; open it with `pnpm exec playwright show-trace <trace.zip>`.

When you change behaviour, add or update a test in `e2e/` that would have
caught the change. A test fails on any console error it doesn't expect, from the
editor or the Preview; tests that expect some declare them with
`test.use({ allowedErrors: [...] })`.

## Things that have bitten us

- The Preview iframe is sandboxed with an opaque origin and talks to the editor
  only over a MessagePort. Its scripts load as cross-origin requests, so servers
  must send `Access-Control-Allow-Origin: *`. Without it the Preview stays empty,
  with CORS errors in the console.
- For hosts that can't send that header (a claude.ai Artifact, say), build with
  `pnpm build:same-origin`. It sets `GRAPHIX_SAME_ORIGIN_PREVIEW=1`, which
  Parcel inlines at build time to add `allow-same-origin` to the Preview's
  sandbox, and uses relative URLs so the site works from a subpath. The CSP
  still stops the Source from running code, but the Preview is no longer
  isolated from the editor by origin, so never make it the default. The
  `same-origin` e2e project runs `pnpm build:same-origin` and serves the result
  from a subpath without CORS, as an Artifact does.
- `src/preview.html` must stay a separate Parcel entry (`source` in
  `package.json`). Reached through `new URL(..., import.meta.url)` instead,
  Parcel bundles its runtime without ever running it, and the Preview stays
  empty without any error.
- Parcel strips TypeScript with SWC, which drops `import { type X } from './m.js'`
  entirely, though `tsc` keeps it as a side-effect import. If you need the
  module's side effects (a custom element defining itself), add a plain
  `import './m.js'`, or the element silently never upgrades.
- `src/source-editor.ts` wraps CodeMirror without a shadow root, and themes it
  through `EditorView.theme` and tokens in `theme.css` (`--syntax-*`,
  `--editor-font-size`). Put media queries in `theme.css`: a rule nested in
  `@media` inside `EditorView.theme` didn't take effect. The editor's text
  stays at least 16px on touch screens, or mobile browsers zoom in when it's
  focused.
- `src/split-pane.ts` (`<split-pane>`, `<split-divider>`) has no shadow root
  either; it adds its styles to the root it's placed in. The consumer lays out
  the children and puts a `<split-divider>` between two of them. While
  dragging, panes get `pointer-events: none`, or the Preview's iframe would
  take the pointer.
- iOS ignores `interactive-widget` and `dvh` for its on-screen keyboard: it
  covers the page and slides the whole page to keep the cursor in view. So
  `graphix-app` is `position: fixed` and follows `window.visualViewport`
  (except when zoomed), and `html` and `body` never scroll. Emulation has no
  on-screen keyboard; `e2e/mobile.spec.ts` fakes `visualViewport` instead, and
  only a real iPhone shows whether it works.
- Parcel's cache can keep a stale copy of an edited module, so a production
  build (and the `prod` and `same-origin` e2e projects) runs old code while
  `dev` runs the new. If they disagree for no reason, `rm -rf .playwright`
  and run the tests again.
- Base Styles are copied into `src/base-styles/` and referenced with
  `new URL(..., import.meta.url)`, so the built site never fetches them from
  elsewhere; keep it that way when adding one (see that folder's README).
  (Parcel's `url:` imports work too, but its CSS optimizer warns about them
  as if they were CSS modules.)
- The Preview's CSP is added at runtime by `src/block-source-scripts.ts`.
  Nothing in the Source may run code.
