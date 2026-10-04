import { BASE_STYLE_SHEETS } from './base-style-urls.js';
import { type BaseStyleId, DEFAULT_BASE_STYLE, isBaseStyleId } from './base-style.js';
import './block-source-scripts.js';
import './gx-mermaid.js';
import { morphChildren } from './morph.js';
import { type ReadyMessage, isBaseStyleMessage, isSourceMessage } from './preview-protocol.js';

function showSource(source: string) {
  const template = document.createElement('template');
  template.innerHTML = source;
  morphChildren(document.body, template.content);
}

/** The links to the shown Base Style's stylesheets; preview.html starts with none. */
let baseStyleLinks: HTMLLinkElement[] = [];

/** The Base Style on screen, and the one last asked for, which may be loading. */
let shownStyle: BaseStyleId = 'none';
let wantedStyle: BaseStyleId = 'none';

function settle(id: BaseStyleId, links: HTMLLinkElement[]) {
  for (const link of baseStyleLinks) link.remove();
  baseStyleLinks = links;
  shownStyle = id;
  document.documentElement.dataset.baseStyle = id;
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
 * if any of the new ones fail.
 */
function showBaseStyle(id: BaseStyleId) {
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
  Promise.all(links.map(loaded)).then(
    () => {
      // Another Base Style was chosen while these loaded.
      if (wantedStyle !== id) return links.forEach((link) => link.remove());
      settle(id, links);
    },
    () => {
      links.forEach((link) => link.remove());
      if (wantedStyle === id) wantedStyle = shownStyle;
    },
  );
  document.head.append(...links);
}

const params = new URLSearchParams(location.search);
document.documentElement.dataset.baseStyle = shownStyle;
const initialStyle = params.get('base-style');
showBaseStyle(isBaseStyleId(initialStyle) ? initialStyle : DEFAULT_BASE_STYLE);

const channel = new MessageChannel();
channel.port1.onmessage = (event) => {
  if (isSourceMessage(event.data)) showSource(event.data.source);
  if (isBaseStyleMessage(event.data)) showBaseStyle(event.data.baseStyle);
};

const nonce = params.get('nonce') ?? '';
const ready: ReadyMessage = { type: 'graphix:ready', nonce };
// Our origin is opaque, so the editor's origin can't be named here; the
// message carries nothing but the nonce the editor already gave us.
window.parent.postMessage(ready, '*', [channel.port2]);
