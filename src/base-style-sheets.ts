import type { BaseStyleId } from './base-style.js';

/** A stylesheet to link to, for screens matching `media` if it's given. */
export type Stylesheet = { href: string; media?: string };

const WATER_DARK = new URL('./base-styles/water.css-dark.css', import.meta.url).href;
const WATER_LIGHT = new URL('./base-styles/water.css-light.css', import.meta.url).href;
const DARK_SCHEME = '(prefers-color-scheme: dark)';

/**
 * The stylesheets each Base Style links to. Parcel builds each into its own
 * file, so the Preview fetches only the ones it uses, and only from our
 * origin. Only the Preview imports this.
 */
export const BASE_STYLE_SHEETS: Record<BaseStyleId, Stylesheet[]> = {
  // Follows the user's colour scheme as it changes.
  'water.css': [
    { href: WATER_DARK, media: DARK_SCHEME },
    { href: WATER_LIGHT, media: `not all and ${DARK_SCHEME}` },
  ],
  'water.css-light': [{ href: WATER_LIGHT }],
  'water.css-dark': [{ href: WATER_DARK }],
  none: [],
  'awsm.css': [{ href: new URL('./base-styles/awsm.css', import.meta.url).href }],
  bahunya: [{ href: new URL('./base-styles/bahunya.css', import.meta.url).href }],
  bamboo: [{ href: new URL('./base-styles/bamboo.css', import.meta.url).href }],
  bootstrap: [{ href: new URL('./base-styles/bootstrap.css', import.meta.url).href }],
  'holiday.css': [{ href: new URL('./base-styles/holiday.css', import.meta.url).href }],
  marx: [{ href: new URL('./base-styles/marx.css', import.meta.url).href }],
  meyer: [{ href: new URL('./base-styles/meyer.css', import.meta.url).href }],
  minicss: [{ href: new URL('./base-styles/minicss.css', import.meta.url).href }],
  'mvp.css': [{ href: new URL('./base-styles/mvp.css', import.meta.url).href }],
  'no-class': [{ href: new URL('./base-styles/no-class.css', import.meta.url).href }],
  'pico.css': [{ href: new URL('./base-styles/pico.css', import.meta.url).href }],
  sakura: [{ href: new URL('./base-styles/sakura.css', import.meta.url).href }],
  'sakura-vader': [{ href: new URL('./base-styles/sakura-vader.css', import.meta.url).href }],
  'simple.css': [{ href: new URL('./base-styles/simple.css', import.meta.url).href }],
  tacit: [{ href: new URL('./base-styles/tacit.css', import.meta.url).href }],
  thebestmotherfucking: [{ href: new URL('./base-styles/thebestmotherfucking.css', import.meta.url).href }],
  writ: [{ href: new URL('./base-styles/writ.css', import.meta.url).href }],
  yorha: [{ href: new URL('./base-styles/yorha.css', import.meta.url).href }],
};
