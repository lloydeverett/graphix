/**
 * The colours of the editor's tokens in `theme.css` that a scheme sets, for
 * the Source and the toolbar above it:
 *
 * - `--surface`: the Source's background, and its toolbar's
 * - `--bg`: fields, buttons and folded lines, set off from the background
 * - `--fg`: the text, and the cursor
 * - `--border`: around tooltips and above panels
 * - `--selection`, `--active-line`, `--selection-match`, `--search-match`
 *   and `--search-match-outline`: the highlights, the active line see-through
 * - `--syntax-*`: tags (and their angle brackets), attributes, strings,
 *   comments (and line numbers) and keywords (as in `<!DOCTYPE>`)
 * - `--error-fg`: what can't be parsed
 */
export const EDITOR_COLOR_TOKENS = [
  '--surface',
  '--bg',
  '--fg',
  '--border',
  '--selection',
  '--active-line',
  '--selection-match',
  '--search-match',
  '--search-match-outline',
  '--syntax-tag',
  '--syntax-attribute',
  '--syntax-string',
  '--syntax-comment',
  '--syntax-keyword',
  '--error-fg',
] as const;

type EditorColors = Record<(typeof EDITOR_COLOR_TOKENS)[number], string>;

type EditorColorScheme = {
  id: string;
  label: string;
  /** Whether it's dark or light. Unset, it follows the system, as `theme.css` does. */
  dark?: boolean;
  /** Its colours. Unset, those of `theme.css`. */
  colors?: EditorColors;
};

/**
 * The Editor Color Schemes: Default, `theme.css`'s own, which follows the
 * system's light or dark mode, and others drawn from the palettes, and the
 * choice of colour for each kind of token, of these:
 *
 * - Rosé Pine and Rosé Pine Dawn: https://rosepinetheme.com/palette/
 * - Everforest (dark, medium): https://github.com/sainnhe/everforest
 * - Evergarden (Fall, its default): https://github.com/everviolet/nvim
 * - Gruvbox (dark, medium): https://github.com/morhetz/gruvbox
 * - Solarized: https://ethanschoonover.com/solarized/
 * - Catppuccin Latte: https://catppuccin.com/palette/
 */
export const EDITOR_COLOR_SCHEMES = [
  { id: 'default', label: 'Default' },
  {
    id: 'rose-pine',
    label: 'Rosé Pine',
    dark: true,
    colors: {
      '--surface': '#191724', // base
      '--bg': '#1f1d2e', // surface
      '--fg': '#e0def4', // text
      '--border': '#403d52', // highlight med
      '--selection': '#403d52', // highlight med
      '--active-line': '#6e6a861a', // muted
      '--selection-match': '#9ccfd826', // foam
      '--search-match': '#f6c17740', // gold
      '--search-match-outline': '#f6c177', // gold
      '--syntax-tag': '#9ccfd8', // foam
      '--syntax-attribute': '#c4a7e7', // iris
      '--syntax-string': '#f6c177', // gold
      '--syntax-comment': '#6e6a86', // muted
      '--syntax-keyword': '#31748f', // pine
      '--error-fg': '#eb6f92', // love
    },
  },
  {
    id: 'rose-pine-dawn',
    label: 'Rosé Pine Dawn',
    dark: false,
    colors: {
      '--surface': '#faf4ed', // base
      '--bg': '#fffaf3', // surface
      '--fg': '#575279', // text
      '--border': '#dfdad9', // highlight med
      '--selection': '#dfdad9', // highlight med
      '--active-line': '#9893a51a', // muted
      '--selection-match': '#56949f26', // foam
      '--search-match': '#ea9d3440', // gold
      '--search-match-outline': '#ea9d34', // gold
      '--syntax-tag': '#56949f', // foam
      '--syntax-attribute': '#907aa9', // iris
      '--syntax-string': '#ea9d34', // gold
      '--syntax-comment': '#9893a5', // muted
      '--syntax-keyword': '#286983', // pine
      '--error-fg': '#b4637a', // love
    },
  },
  {
    id: 'everforest',
    label: 'Everforest',
    dark: true,
    colors: {
      '--surface': '#2d353b', // bg0
      '--bg': '#343f44', // bg1
      '--fg': '#d3c6aa', // fg
      '--border': '#475258', // bg3
      '--selection': '#543a48', // bg_visual
      '--active-line': '#7a84781f', // grey0
      '--selection-match': '#a7c08026', // green
      '--search-match': '#dbbc7f40', // yellow
      '--search-match-outline': '#dbbc7f', // yellow
      '--syntax-tag': '#e69875', // orange
      '--syntax-attribute': '#83c092', // aqua
      '--syntax-string': '#a7c080', // green
      '--syntax-comment': '#859289', // grey1
      '--syntax-keyword': '#e67e80', // red
      '--error-fg': '#e67e80', // red
    },
  },
  {
    id: 'evergarden',
    label: 'Evergarden',
    dark: true,
    colors: {
      '--surface': '#232a2e', // base
      '--bg': '#2b3337', // surface0
      '--fg': '#f8f9e8', // text
      '--border': '#374145', // surface1
      '--selection': '#374145', // surface1
      '--active-line': '#58686d26', // overlay0
      '--selection-match': '#cbe3b326', // green
      '--search-match': '#afd9e633', // snow
      '--search-match-outline': '#afd9e6', // snow
      '--syntax-tag': '#b3e6db', // skye
      '--syntax-attribute': '#fae6ef', // cherry
      '--syntax-string': '#dbe6af', // lime
      '--syntax-comment': '#839e9a', // overlay2
      '--syntax-keyword': '#f57f82', // red
      '--error-fg': '#f57f82', // red
    },
  },
  {
    id: 'gruvbox',
    label: 'Gruvbox',
    dark: true,
    colors: {
      '--surface': '#282828', // bg0
      '--bg': '#3c3836', // bg1
      '--fg': '#ebdbb2', // fg1
      '--border': '#504945', // bg2
      '--selection': '#504945', // bg2
      '--active-line': '#a899841a', // fg4
      '--selection-match': '#8ec07c26', // aqua
      '--search-match': '#fabd2f40', // yellow
      '--search-match-outline': '#fabd2f', // yellow
      '--syntax-tag': '#8ec07c', // aqua
      '--syntax-attribute': '#83a598', // blue
      '--syntax-string': '#b8bb26', // green
      '--syntax-comment': '#928374', // gray
      '--syntax-keyword': '#fb4934', // red
      '--error-fg': '#fb4934', // red
    },
  },
  {
    id: 'solarized-dark',
    label: 'Solarized Dark',
    dark: true,
    colors: {
      '--surface': '#002b36', // base03
      '--bg': '#073642', // base02
      '--fg': '#839496', // base0
      '--border': '#586e75', // base01
      '--selection': '#274642',
      '--active-line': '#93a1a114', // base1
      '--selection-match': '#2aa19833', // cyan
      '--search-match': '#b5890040', // yellow
      '--search-match-outline': '#b58900', // yellow
      '--syntax-tag': '#268bd2', // blue
      '--syntax-attribute': '#b58900', // yellow
      '--syntax-string': '#2aa198', // cyan
      '--syntax-comment': '#586e75', // base01
      '--syntax-keyword': '#859900', // green
      '--error-fg': '#dc322f', // red
    },
  },
  {
    id: 'solarized-light',
    label: 'Solarized Light',
    dark: false,
    colors: {
      '--surface': '#fdf6e3', // base3
      '--bg': '#eee8d5', // base2
      '--fg': '#657b83', // base00
      '--border': '#e0dac6',
      '--selection': '#e6dfc8',
      '--active-line': '#93a1a11a', // base1
      '--selection-match': '#2aa19826', // cyan
      '--search-match': '#b5890033', // yellow
      '--search-match-outline': '#b58900', // yellow
      '--syntax-tag': '#268bd2', // blue
      '--syntax-attribute': '#b58900', // yellow
      '--syntax-string': '#2aa198', // cyan
      '--syntax-comment': '#93a1a1', // base1
      '--syntax-keyword': '#859900', // green
      '--error-fg': '#dc322f', // red
    },
  },
  {
    id: 'catppuccin-latte',
    label: 'Catppuccin Latte',
    dark: false,
    colors: {
      '--surface': '#eff1f5', // base
      '--bg': '#e6e9ef', // mantle
      '--fg': '#4c4f69', // text
      '--border': '#ccd0da', // surface0
      '--selection': '#ccd0da', // surface0
      '--active-line': '#9ca0b01f', // overlay0
      '--selection-match': '#40a02b26', // green
      '--search-match': '#df8e1d40', // yellow
      '--search-match-outline': '#df8e1d', // yellow
      '--syntax-tag': '#1e66f5', // blue
      '--syntax-attribute': '#df8e1d', // yellow
      '--syntax-string': '#40a02b', // green
      '--syntax-comment': '#7c7f93', // overlay2
      '--syntax-keyword': '#8839ef', // mauve
      '--error-fg': '#d20f39', // red
    },
  },
] as const satisfies readonly EditorColorScheme[];

export type EditorColorSchemeId = (typeof EDITOR_COLOR_SCHEMES)[number]['id'];

export const DEFAULT_EDITOR_COLOR_SCHEME: EditorColorSchemeId = 'default';

export function isEditorColorSchemeId(value: unknown): value is EditorColorSchemeId {
  return EDITOR_COLOR_SCHEMES.some((scheme) => scheme.id === value);
}

export function findEditorColorScheme(id: EditorColorSchemeId): EditorColorScheme {
  return EDITOR_COLOR_SCHEMES.find((scheme) => scheme.id === id)!;
}
