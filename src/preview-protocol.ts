import { type BaseStyleId, isBaseStyleId } from './base-style.js';

/**
 * Messages between the editor and the sandboxed Preview iframe.
 *
 * The iframe has an opaque origin, so the editor can't reach into its DOM.
 * Instead, on startup the iframe posts a Ready message carrying the nonce it
 * was given in its URL and a MessagePort; the editor then sends each
 * Source, and the Base Style to show it with, over that port, and the iframe
 * replies with its page's colours whenever they change. If the iframe
 * navigates away, the port dies with the old document, so a foreign page never
 * receives the Source.
 */

export type ReadyMessage = { type: 'graphix:ready'; nonce: string };

export type SourceMessage = { type: 'graphix:source'; source: string };

export type BaseStyleMessage = { type: 'graphix:base-style'; baseStyle: BaseStyleId };

/**
 * The Preview page's colours: its background (its root's, or its body's, or
 * the browser's default) and its body's text.
 */
export type PageColorsMessage = { type: 'graphix:page-colors'; background: string; text: string };

export function isReadyMessage(data: unknown): data is ReadyMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as ReadyMessage).type === 'graphix:ready' &&
    typeof (data as ReadyMessage).nonce === 'string'
  );
}

export function isSourceMessage(data: unknown): data is SourceMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as SourceMessage).type === 'graphix:source' &&
    typeof (data as SourceMessage).source === 'string'
  );
}

export function isBaseStyleMessage(data: unknown): data is BaseStyleMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as BaseStyleMessage).type === 'graphix:base-style' &&
    isBaseStyleId((data as BaseStyleMessage).baseStyle)
  );
}

export function isPageColorsMessage(data: unknown): data is PageColorsMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as PageColorsMessage).type === 'graphix:page-colors' &&
    typeof (data as PageColorsMessage).background === 'string' &&
    typeof (data as PageColorsMessage).text === 'string'
  );
}
