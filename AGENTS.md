# Agent notes

graphix is a live HTML editor. `README.md` covers what it does and how to run it;
`CONTEXT.md` is the glossary. Use its terms (Source, Preview, Refresh, Diagram,
Render Error) in code, comments and commits.

## Tools

Node and pnpm are pinned in `mise.toml`, and aren't on the PATH otherwise. Every
`pnpm` command in these notes means running it through mise, as
`mise exec -- pnpm <script>`.

## Before calling a change done

Run both, and make sure they pass:

```sh
pnpm typecheck
pnpm test:e2e
```

The e2e tests drive a real Chromium against the dev server and a production
build, which differ (dev serves each module unbundled). A failing test leaves a trace in
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
  `vite.config.ts` inlines at build time to add `allow-same-origin` to the
  Preview's sandbox, and uses relative URLs so the site works from a subpath. The CSP
  still stops the Source from running code, but the Preview is no longer
  isolated from the editor by origin, so never make it the default. The
  `same-origin` e2e project runs `pnpm build:same-origin` and serves the result
  from a subpath without CORS, as an Artifact does.
- The build is Vite, rooted at `src/`, so paths given to Vite (`--outDir`,
  say) resolve from there. `src/preview.html` must stay a separate entry
  (`build.rolldownOptions.input` in `vite.config.ts`), served beside the
  editor. The dev server's CORS is opened to every origin in
  `vite.config.ts`: the Preview's opaque origin sends `Origin: null`, which
  Vite's default refuses.
- `src/source-editor.ts` wraps CodeMirror without a shadow root, and themes it
  through `EditorView.theme` and tokens in `theme.css` (`--syntax-*`,
  `--editor-system-font-family`). Put media queries in `theme.css`: a rule
  nested in `@media` inside `EditorView.theme` didn't take effect. On touch
  screens the editor's text starts at 16px, or mobile browsers zoom in when
  it's focused. Each Editor Color Scheme in `src/editor-color-scheme.ts` sets
  those colour tokens on `<source-editor>` itself, so a colour the editor
  draws from `theme.css` needs a value in every scheme too, or it keeps
  Default's under them all.
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
- Base Styles are copied into `src/base-styles/` and referenced with
  `new URL(..., import.meta.url)`, so the built site never fetches them from
  elsewhere; keep it that way when adding one (see that folder's README).
  Vite copies a file reached that way as it is, so it works only for a
  stylesheet with no `@import` or relative `url()`. One with them, such as
  `src/preview-fonts.css`, is imported with `?url` instead, which builds it
  with what it references.
- The Preview's CSP is added at runtime by `src/block-source-scripts.ts`.
  Nothing in the Source may run code.
