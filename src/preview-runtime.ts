import { BASE_STYLE_URLS } from './base-style-urls.js';
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

/** preview.html starts with the graphix Base Style's stylesheet. */
let baseStyleLink = document.querySelector<HTMLLinkElement>('link[rel="stylesheet"]');

/** The Base Style on screen, and the one last asked for, which may be loading. */
let shownStyle: BaseStyleId = DEFAULT_BASE_STYLE;
let wantedStyle: BaseStyleId = DEFAULT_BASE_STYLE;

function settle(id: BaseStyleId, link: HTMLLinkElement | null) {
  baseStyleLink?.remove();
  baseStyleLink = link;
  shownStyle = id;
  document.documentElement.dataset.baseStyle = id;
}

/**
 * Swaps the Base Style's stylesheet for another. The old one stays until the
 * new one loads, so the Preview never shows unstyled in between, and stays
 * if the new one fails.
 */
function showBaseStyle(id: BaseStyleId) {
  if (id === wantedStyle) return;
  wantedStyle = id;
  const url = BASE_STYLE_URLS[id];
  if (!url) return settle(id, null);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  link.addEventListener('load', () => {
    // Another Base Style was chosen while this one loaded.
    if (wantedStyle !== id) return link.remove();
    settle(id, link);
  });
  link.addEventListener('error', () => {
    link.remove();
    if (wantedStyle === id) wantedStyle = shownStyle;
  });
  document.head.append(link);
}

const params = new URLSearchParams(location.search);
document.documentElement.dataset.baseStyle = shownStyle;
const initialStyle = params.get('base-style');
if (isBaseStyleId(initialStyle)) showBaseStyle(initialStyle);

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
