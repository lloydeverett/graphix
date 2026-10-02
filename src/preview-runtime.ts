import './block-source-scripts.js';
import './gx-mermaid.js';
import { morphChildren } from './morph.js';
import { type ReadyMessage, isSourceMessage } from './preview-protocol.js';

function showSource(source: string) {
  const template = document.createElement('template');
  template.innerHTML = source;
  morphChildren(document.body, template.content);
}

const channel = new MessageChannel();
channel.port1.onmessage = (event) => {
  if (isSourceMessage(event.data)) showSource(event.data.source);
};

// The editor names the iframe with the nonce; unlike the URL, the name
// survives the Preview navigating within itself.
const ready: ReadyMessage = { type: 'graphix:ready', nonce: window.name };
// Our origin is opaque, so the editor's origin can't be named here; the
// message carries nothing but the nonce the editor already gave us.
window.parent.postMessage(ready, '*', [channel.port2]);
