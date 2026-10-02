import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { keyed } from 'lit/directives/keyed.js';
import { type SourceMessage, isReadyMessage } from './preview-protocol.js';

const PREVIEW_URL = new URL('./preview.html', import.meta.url);

/**
 * Shows a Source as a Preview: the HTML rendered in a sandboxed iframe, which
 * is updated in place as the Source changes and rebuilt only on Refresh.
 */
@customElement('preview-pane')
export class PreviewPane extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    header {
      display: flex;
      justify-content: flex-end;
      padding: 4px 8px;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
    }

    button {
      padding: 2px 10px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--bg);
      color: var(--fg);
      font: inherit;
      font-size: 13px;
      cursor: pointer;
    }

    iframe {
      flex: 1;
      width: 100%;
      border: none;
    }
  `;

  @property() source = '';

  /** Identifies the current iframe; a new one gets a new nonce. */
  @state() nonce = crypto.randomUUID();

  /** Connects to the current iframe's runtime once it reports ready. */
  #port?: MessagePort;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('message', this.#onMessage);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('message', this.#onMessage);
    this.#port?.close();
  }

  /** Throws away the iframe and its state, and builds the Preview afresh. */
  refresh() {
    this.#port?.close();
    this.#port = undefined;
    this.nonce = crypto.randomUUID();
  }

  #onMessage = (event: MessageEvent) => {
    const iframe = this.renderRoot.querySelector('iframe');
    if (event.source !== iframe?.contentWindow) return;
    if (!isReadyMessage(event.data) || event.data.nonce !== this.nonce) return;
    const [port] = event.ports;
    if (!port) return;

    // If the iframe loads our page again, it sends a new port; the old one is dead.
    this.#port?.close();
    this.#port = port;
    this.#send();
  };

  #send() {
    const message: SourceMessage = { type: 'graphix:source', source: this.source };
    this.#port?.postMessage(message);
  }

  protected updated(changed: Map<PropertyKey, unknown>) {
    if (changed.has('source')) this.#send();
  }

  render() {
    return html`
      <header>
        <button type="button" title="Rebuild the Preview from scratch" @click=${this.refresh}>
          Refresh
        </button>
      </header>
      ${keyed(
        this.nonce,
        html`<iframe
          title="Preview"
          name=${this.nonce}
          sandbox="allow-scripts"
          src=${PREVIEW_URL.href}
        ></iframe>`,
      )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'preview-pane': PreviewPane;
  }
}
