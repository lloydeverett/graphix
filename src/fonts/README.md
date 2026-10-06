# Fonts

Fonts the editor and the Preview use, copied here so the built site never
fetches them from elsewhere.

| Folder | Version | Source | License |
| --- | --- | --- | --- |
| `cascadia-mono/` | v5 | [Google Fonts](https://fonts.google.com/specimen/Cascadia+Mono) | SIL OFL 1.1 (`OFL.txt`) |
| `lato/` | v25 | [Google Fonts](https://fonts.google.com/specimen/Lato) | SIL OFL 1.1 (`OFL.txt`) |
| `inter/` | v20 | [Google Fonts](https://fonts.google.com/specimen/Inter) | SIL OFL 1.1 (`OFL.txt`) |

Each folder's stylesheet is the one Google Fonts serves to a current browser,
with each `url()` pointing at a copy of its woff2 file instead, for:

- `cascadia-mono.css`: `family=Cascadia+Mono:ital,wght@0,200..700;1,200..700`
- `lato.css`: `family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900`
- `inter.css`: `family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900`

The editor's `styles.css` imports Cascadia Mono, for the Source, and Inter,
for its controls; the Preview's `preview-fonts.css` imports Lato and Inter. The files are split by
`unicode-range`, so a browser downloads only those it needs.
