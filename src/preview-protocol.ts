/**
 * Messages between the editor and the sandboxed Preview iframe.
 *
 * The iframe has an opaque origin, so the editor can't reach into its DOM.
 * Instead, on startup the iframe posts a Ready message carrying the nonce it
 * was given in its URL hash and a MessagePort; the editor then sends each
 * Source over that port. If the iframe navigates away, the port dies with the
 * old document, so a foreign page never receives the Source.
 */

export type ReadyMessage = { type: 'graphix:ready'; nonce: string };

export type SourceMessage = { type: 'graphix:source'; source: string };

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
