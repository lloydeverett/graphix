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

Nest `<gx-tree-node>` elements to draw a tree, laid out as a Mermaid
flowchart would be (by [ELK](https://github.com/kieler/elkjs)):

```html
<gx-tree-node label="Root">
  <gx-tree-node label="Child A"></gx-tree-node>
  <gx-tree-node label="Child B"><a href="#b">more</a></gx-tree-node>
</gx-tree-node>
```

Each node shows its `label` and any other content, which stays real HTML: links
work, and your CSS can style it. Style the boxes themselves with
`gx-tree-node::part(card)` and their labels with `::part(label)`; set
`--gx-tree-edge-color` for the edges and `--gx-tree-node-max-width` (16em by
default) for where long content wraps. Set `direction="right"` (or `up`, `left`) on the
outermost node to grow the tree another way.

Wrap anything, such as a tree or a diagram, in `<gx-pan>` to view it through a
window you can pan and zoom:

```html
<gx-pan style="height: 400px">
  <gx-tree-node label="Root">…</gx-tree-node>
</gx-pan>
```

Drag, or swipe on a touch screen, to pan; pinch, or scroll with ctrl or ⌘ held,
to zoom (a plain scroll still scrolls the page, but a swipe over the window
pans it). Once focused, `+` and `-` zoom, `0` fits, and the arrow keys pan; the
buttons in the corner zoom and fit too. The content is fitted to the window,
never enlarged, until you move it. It's 24em tall unless you set a height.
Links in it still work: only a drag doesn't follow them. Double-clicking
selects a word, as anywhere else, rather than zooming, and text fields in it
work as usual.

The preview runs in a sandboxed iframe, and nothing in your HTML runs code:
`<script>` elements, inline event handlers, `javascript:` URLs, `eval` and
plugins are all blocked. (`pnpm dev` allows `eval`, which Parcel's hot reloading
needs; nothing in your HTML can reach it.) Edits update the preview in place; **Refresh** rebuilds it from scratch.
The menu beside Refresh picks the preview's base stylesheet, from the classless
ones on [cssbed.com](https://www.cssbed.com/). They're bundled with graphix;
`src/base-styles/README.md` lists their sources and licenses. It starts on
**default**: water.css, dark or light to match your colour scheme.
The gear above the editor opens its settings: turn **Word wrap** off to scroll
long lines sideways instead. Settings are kept in the browser, like your HTML.

When hosting the built site, serve the preview's scripts with
`Access-Control-Allow-Origin: *`: the sandboxed iframe has an opaque origin,
so its module scripts load as cross-origin requests. If your host can't send
that header, use `pnpm build:same-origin` instead: the Preview then shares the
editor's origin. Your HTML still can't run code, but the origin no longer
separates it from the editor.

## Setup

Requires [mise](https://mise.jdx.dev).

```sh
mise trust && mise install  # Node and pnpm, as pinned in mise.toml
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
