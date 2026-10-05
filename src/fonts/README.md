# Fonts

Fonts the editor uses, copied here so the built site never fetches them from
elsewhere.

| Folder | Version | Source | License |
| --- | --- | --- | --- |
| `cascadia-mono/` | v5 | [Google Fonts](https://fonts.google.com/specimen/Cascadia+Mono) | SIL OFL 1.1 (`OFL.txt`) |

`cascadia-mono.css` is the stylesheet Google Fonts serves for
`family=Cascadia+Mono:ital,wght@0,200..700;1,200..700` to a current browser,
with each `url()` pointing at a copy of its woff2 file instead. The files are
split by `unicode-range`, so a browser downloads only those it needs.
