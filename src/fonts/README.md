# Fonts

Fonts the editor and the Preview use, copied here so the built site never
fetches them from elsewhere.

| Folder | Version | Source | License |
| --- | --- | --- | --- |
| `cascadia-code/` | v5 | [Google Fonts](https://fonts.google.com/specimen/Cascadia+Code) | SIL OFL 1.1 (`OFL.txt`) |
| `cascadia-mono/` | v5 | [Google Fonts](https://fonts.google.com/specimen/Cascadia+Mono) | SIL OFL 1.1 (`OFL.txt`) |
| `fira-code/` | v27 | [Google Fonts](https://fonts.google.com/specimen/Fira+Code) | SIL OFL 1.1 (`OFL.txt`) |
| `jetbrains-mono/` | v24 | [Google Fonts](https://fonts.google.com/specimen/JetBrains+Mono) | SIL OFL 1.1 (`OFL.txt`) |
| `lato/` | v25 | [Google Fonts](https://fonts.google.com/specimen/Lato) | SIL OFL 1.1 (`OFL.txt`) |
| `inter/` | v20 | [Google Fonts](https://fonts.google.com/specimen/Inter) | SIL OFL 1.1 (`OFL.txt`) |
| `ibm-plex-mono/` | v20 | [Google Fonts](https://fonts.google.com/specimen/IBM+Plex+Mono) | SIL OFL 1.1 (`OFL.txt`) |
| `schibsted-grotesk/` | v7 | [Google Fonts](https://fonts.google.com/specimen/Schibsted+Grotesk) | SIL OFL 1.1 (`OFL.txt`) |
| `newsreader/` | v26 | [Google Fonts](https://fonts.google.com/specimen/Newsreader) | SIL OFL 1.1 (`OFL.txt`) |
| `fraunces/` | v38 | [Google Fonts](https://fonts.google.com/specimen/Fraunces) | SIL OFL 1.1 (`OFL.txt`) |
| `literata/` | v40 | [Google Fonts](https://fonts.google.com/specimen/Literata) | SIL OFL 1.1 (`OFL.txt`) |

Each folder's stylesheet is the one Google Fonts serves to a current browser,
with each `url()` pointing at a copy of its woff2 file instead, for:

- `cascadia-code.css`: `family=Cascadia+Code:ital,wght@0,200..700;1,200..700`
- `cascadia-mono.css`: `family=Cascadia+Mono:ital,wght@0,200..700;1,200..700`
- `fira-code.css`: `family=Fira+Code:wght@300..700`
- `jetbrains-mono.css`: `family=JetBrains+Mono:ital,wght@0,100..800;1,100..800`
- `lato.css`: `family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900`
- `inter.css`: `family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900`
- `ibm-plex-mono.css`: `family=IBM+Plex+Mono:ital,wght@0,400;0,700;1,400;1,700`
- `schibsted-grotesk.css`: `family=Schibsted+Grotesk:ital,wght@0,400..900;1,400..900`
- `newsreader.css`: `family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800`
- `fraunces.css`: `family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900`
- `literata.css`: `family=Literata:ital,opsz,wght@0,7..72,200..900;1,7..72,200..900`

The editor's `styles.css` imports Cascadia Code, Cascadia Mono, Fira Code,
JetBrains Mono and IBM Plex Mono, for the Source, and Inter, for its controls;
the Preview's `preview-fonts.css` imports Schibsted Grotesk, Lato, Inter,
Newsreader, Fraunces and Literata. Importing a font doesn't download
it: a browser fetches a font's files only once some text is shown in it, and
only the files whose `unicode-range` that text needs. So only the fonts
chosen are downloaded.
