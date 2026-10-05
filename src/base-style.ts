/**
 * The Base Styles the Preview can be rendered with: water.css (the default,
 * dark or light to match the user's colour scheme) and its light and dark
 * variants, the browser's defaults, and the classless stylesheets listed on
 * cssbed.com, bundled from `src/base-styles/`.
 */
export const BASE_STYLES = [
  { id: 'water.css', label: 'water.css' },
  { id: 'water.css-light', label: 'water.css-light' },
  { id: 'water.css-dark', label: 'water.css-dark' },
  { id: 'none', label: 'HTML only' },
  { id: 'awsm.css', label: 'awsm.css' },
  { id: 'bahunya', label: 'bahunya' },
  { id: 'bamboo', label: 'bamboo' },
  { id: 'bootstrap', label: 'bootstrap' },
  { id: 'holiday.css', label: 'holiday.css' },
  { id: 'marx', label: 'marx' },
  { id: 'meyer', label: 'meyer' },
  { id: 'minicss', label: 'minicss' },
  { id: 'mvp.css', label: 'mvp.css' },
  { id: 'no-class', label: 'no-class' },
  { id: 'pico.css', label: 'pico.css' },
  { id: 'sakura', label: 'sakura' },
  { id: 'sakura-vader', label: 'sakura-vader' },
  { id: 'simple.css', label: 'simple.css' },
  { id: 'tacit', label: 'tacit' },
  { id: 'thebestmotherfucking', label: 'thebestmotherfucking' },
  { id: 'writ', label: 'writ' },
  { id: 'yorha', label: 'yorha' },
] as const;

export type BaseStyleId = (typeof BASE_STYLES)[number]['id'];

export const DEFAULT_BASE_STYLE: BaseStyleId = 'water.css';

export function isBaseStyleId(value: unknown): value is BaseStyleId {
  return BASE_STYLES.some((style) => style.id === value);
}
