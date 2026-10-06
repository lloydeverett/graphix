import { BASE_STYLE_SHEETS } from './base-style-sheets.js';
import { type BaseStyleId, DEFAULT_BASE_STYLE, isBaseStyleId } from './base-style.js';
import './block-source-scripts.js';
import './gx-mermaid.js';
import './gx-pan.js';
import './gx-tree-node.js';
import { morphChildren } from './morph.js';
import { DEFAULT_PREVIEW_FONT, type PreviewFontId, isPreviewFontId } from './preview-font.js';
import {
  type PageColorsMessage,
  type ReadyMessage,
  isBaseStyleMessage,
  isPreviewFontMessage,
  isSourceMessage,
} from './preview-protocol.js';

function showSource(source: string) {
  const template = document.createElement('template');
  template.innerHTML = source;
  morphChildren(document.body, template.content);
  reportPageColors();
}

/** Whether a colour, as getComputedStyle reports it, is fully see-through. */
const isTransparent = (color: string) => color === 'transparent' || /^rgba\(.*,\s*0\)$/.test(color);

/**
 * The colour the page is painted on. As CSS does, it takes the root's
 * background, or else the body's, or else the browser's default background,
 * which follows the page's colour scheme.
 */
function pageBackground() {
  for (const element of [document.documentElement, document.body]) {
    const color = getComputedStyle(element).backgroundColor;
    if (!isTransparent(color)) return color;
  }
  const probe = document.createElement('meta');
  probe.style.backgroundColor = 'Canvas';
  document.head.append(probe);
  const color = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return color;
}

let reported: PageColorsMessage | undefined;

/** Tells the editor the page's colours when they change, from the Base Style, the Source or the colour scheme. */
function reportPageColors() {
  const message: PageColorsMessage = {
    type: 'graphix:page-colors',
    background: pageBackground(),
    text: getComputedStyle(document.body).color,
  };
  if (message.background === reported?.background && message.text === reported.text) return;
  reported = message;
  channel.port1.postMessage(message);
}

/**
 * The Preview Font's stylesheet. The Base Style's go before it, so its rules
 * win over theirs.
 */
const previewFontLink = document.createElement('link');
previewFontLink.rel = 'stylesheet';
previewFontLink.href = new URL('./preview-fonts.css', import.meta.url).href;

function showPreviewFont(id: PreviewFontId) {
  document.documentElement.dataset.previewFont = id;
}

/** The links to the shown Base Style's stylesheets; preview.html starts with none. */
let baseStyleLinks: HTMLLinkElement[] = [];

/** The Base Style on screen, and the one last asked for, which may be loading. */
let shownStyle: BaseStyleId = 'none';
let wantedStyle: BaseStyleId = 'none';

function removeLinks(links: HTMLLinkElement[]) {
  for (const link of links) link.remove();
}

function settle(id: BaseStyleId, links: HTMLLinkElement[]) {
  removeLinks(baseStyleLinks);
  baseStyleLinks = links;
  shownStyle = id;
  document.documentElement.dataset.baseStyle = id;
  reportPageColors();
}

function loaded(link: HTMLLinkElement) {
  return new Promise<void>((resolve, reject) => {
    link.addEventListener('load', () => resolve());
    link.addEventListener('error', reject);
  });
}

/**
 * Swaps the Base Style's stylesheets for another's. The old ones stay until
 * the new ones load, so the Preview never shows unstyled in between, and stay
 * if any of the new ones fail. Resolves once the swap is done or given up.
 */
async function showBaseStyle(id: BaseStyleId) {
  if (id === wantedStyle) return;
  wantedStyle = id;
  const links = BASE_STYLE_SHEETS[id].map(({ href, media }) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    if (media) link.media = media;
    return link;
  });
  // A stylesheet loads even when its media doesn't match, so wait for all.
  const loading = Promise.all(links.map(loaded));
  previewFontLink.before(...links);
  try {
    await loading;
  } catch {
    removeLinks(links);
    if (wantedStyle === id) wantedStyle = shownStyle;
    return;
  }
  // Another Base Style was chosen while these loaded.
  if (wantedStyle !== id) return removeLinks(links);
  settle(id, links);
}

const params = new URLSearchParams(location.search);
document.documentElement.dataset.baseStyle = shownStyle;
const initialStyle = params.get('base-style');
const initialFont = params.get('preview-font');
showPreviewFont(isPreviewFontId(initialFont) ? initialFont : DEFAULT_PREVIEW_FONT);
const previewFontLoading = loaded(previewFontLink);
document.head.append(previewFontLink);

const channel = new MessageChannel();
channel.port1.onmessage = (event) => {
  if (isSourceMessage(event.data)) showSource(event.data.source);
  if (isBaseStyleMessage(event.data)) showBaseStyle(event.data.baseStyle);
  if (isPreviewFontMessage(event.data)) showPreviewFont(event.data.previewFont);
};

// water.css, for one, follows the colour scheme.
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', reportPageColors);

const nonce = params.get('nonce') ?? '';
const ready: ReadyMessage = { type: 'graphix:ready', nonce };
// The editor sends the Source once we're ready, so wait for the starting Base
// Style and the Preview Font's stylesheet, or the Source would show unstyled
// until they load.
Promise.allSettled([
  showBaseStyle(isBaseStyleId(initialStyle) ? initialStyle : DEFAULT_BASE_STYLE),
  previewFontLoading,
]).finally(() => {
  // Our origin is opaque, so the editor's origin can't be named here; the
  // message carries nothing but the nonce the editor already gave us.
  window.parent.postMessage(ready, '*', [channel.port2]);
});
