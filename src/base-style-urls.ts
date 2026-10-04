import type { BaseStyleId } from './base-style.js';

/**
 * Where each Base Style's stylesheet is served from, if it has one. Parcel
 * builds each into its own file, so the Preview fetches only the one it uses,
 * and only from our origin. Only the Preview imports this: graphix's
 * stylesheet is the one preview.html links to.
 */
export const BASE_STYLE_URLS: Record<BaseStyleId, string | undefined> = {
  graphix: document.querySelector<HTMLLinkElement>('link[rel="stylesheet"]')?.href,
  none: undefined,
  'awsm.css': new URL('./base-styles/awsm.css', import.meta.url).href,
  bahunya: new URL('./base-styles/bahunya.css', import.meta.url).href,
  bamboo: new URL('./base-styles/bamboo.css', import.meta.url).href,
  bootstrap: new URL('./base-styles/bootstrap.css', import.meta.url).href,
  'holiday.css': new URL('./base-styles/holiday.css', import.meta.url).href,
  marx: new URL('./base-styles/marx.css', import.meta.url).href,
  meyer: new URL('./base-styles/meyer.css', import.meta.url).href,
  minicss: new URL('./base-styles/minicss.css', import.meta.url).href,
  'mvp.css': new URL('./base-styles/mvp.css', import.meta.url).href,
  'no-class': new URL('./base-styles/no-class.css', import.meta.url).href,
  'pico.css': new URL('./base-styles/pico.css', import.meta.url).href,
  sakura: new URL('./base-styles/sakura.css', import.meta.url).href,
  'sakura-vader': new URL('./base-styles/sakura-vader.css', import.meta.url).href,
  'simple.css': new URL('./base-styles/simple.css', import.meta.url).href,
  tacit: new URL('./base-styles/tacit.css', import.meta.url).href,
  thebestmotherfucking: new URL('./base-styles/thebestmotherfucking.css', import.meta.url).href,
  tufte: new URL('./base-styles/tufte.css', import.meta.url).href,
  'water.css-dark': new URL('./base-styles/water.css-dark.css', import.meta.url).href,
  'water.css-light': new URL('./base-styles/water.css-light.css', import.meta.url).href,
  writ: new URL('./base-styles/writ.css', import.meta.url).href,
  yorha: new URL('./base-styles/yorha.css', import.meta.url).href,
};
