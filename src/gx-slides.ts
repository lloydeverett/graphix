import { LitElement, css, html } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';
import { ChevronLeft, ChevronRight } from 'lucide';
import { FIELDS } from './fields.js';
import { icon } from './icon.js';

/** The Slide each key moves to, from the shown one's index and the number of Slides. */
const KEY_TARGETS: Record<string, (index: number, count: number) => number> = {
  ArrowLeft: (index) => index - 1,
  ArrowRight: (index) => index + 1,
  Home: () => 0,
  End: (_, count) => count - 1,
};

function isSlide(node: Node): node is Element {
  return node instanceof Element && node.localName === 'gx-slide';
}

/**
 * A Slide Deck: shows one of its `<gx-slide>` children at a time, with
 * buttons and the arrow keys to move between them, and which one it's on.
 *
 * The Slides stay in the light DOM, so the Source's CSS styles them as
 * anywhere else. The one shown is chosen by assigning it to a slot, never
 * through attributes, which the morph would strip on each edit; so the deck
 * stays on its Slide through edits until a Refresh, following it when Slides
 * before it are added or removed. Anything else in the deck isn't shown.
 */
@customElement('gx-slides')
export class GxSlides extends LitElement {
  static shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, slotAssignment: 'manual' };

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      aspect-ratio: 16 / 9;
      border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
      border-radius: 6px;
    }

    .stage {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 1.5em 2em;
      overflow: auto;
      border-radius: 6px 6px 0 0;
    }

    .stage:focus-visible {
      outline: 2px solid Highlight;
      outline-offset: 2px;
    }

    ::slotted(*) {
      display: block;
    }

    nav {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 6px;
    }

    .counter {
      min-width: 4em;
      font-size: 0.85em;
      font-variant-numeric: tabular-nums;
      text-align: center;
      opacity: 0.65;
    }

    /* Drawn from currentColor, so they suit any Base Style. */
    button {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      margin: 0;
      padding: 0;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: inherit;
      opacity: 0.65;
      cursor: pointer;
    }

    button:hover:not(:disabled) {
      background: color-mix(in srgb, currentColor 10%, transparent);
      opacity: 1;
    }

    button:disabled {
      opacity: 0.25;
      cursor: default;
    }
  `;

  /** The Slide shown, counting from 0; kept within the Slides there are. */
  @state() index = 0;
  /** How many Slides there are. */
  @state() count = 0;

  @query('.stage') stage!: HTMLElement;
  @query('slot') slideSlot!: HTMLSlotElement;

  /** The Slide element shown, followed to its new index when Slides before it come or go. */
  #shown?: Element;

  #previousIcon = icon(ChevronLeft);
  #nextIcon = icon(ChevronRight);

  #mutations = new MutationObserver(() => this.#countSlides());

  connectedCallback() {
    super.connectedCallback();
    this.#mutations.observe(this, { childList: true });
    this.#countSlides();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#mutations.disconnect();
  }

  get slides(): Element[] {
    return [...this.children].filter(isSlide);
  }

  /**
   * Counts the Slides after any are added or removed, and stays on the one
   * shown, or else at its index, within the Slides left.
   */
  #countSlides() {
    const { slides } = this;
    this.count = slides.length;
    const kept = this.#shown ? slides.indexOf(this.#shown) : -1;
    this.#go(kept === -1 ? this.index : kept);
    // The Slide at the index may be another element now, though the index is the same.
    if (this.hasUpdated) this.#showSlide();
  }

  updated() {
    this.#showSlide();
    // A button disabled at either end drops focus; keep it in the deck, so the keys still work.
    const focused = this.shadowRoot!.activeElement;
    if (focused instanceof HTMLButtonElement && focused.disabled) this.stage.focus({ preventScroll: true });
  }

  #showSlide() {
    this.#shown = this.slides[this.index];
    this.slideSlot.assign(...(this.#shown ? [this.#shown] : []));
  }

  #go(index: number) {
    this.index = Math.max(0, Math.min(index, this.count - 1));
  }

  #onKeyDown(event: KeyboardEvent) {
    // Taken already by something in the Slide, such as a Pan View or another deck.
    if (event.defaultPrevented) return;
    if ((event.target as Element).closest(FIELDS)) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (!Object.hasOwn(KEY_TARGETS, event.key)) return;
    event.preventDefault();
    this.#go(KEY_TARGETS[event.key](this.index, this.count));
  }

  render() {
    return html`
      <div
        class="stage"
        tabindex="0"
        role="group"
        aria-roledescription="slides"
        aria-label="Left and right arrow keys change slide"
        @keydown=${this.#onKeyDown}
      >
        <slot></slot>
      </div>
      <nav aria-label="Slides" @keydown=${this.#onKeyDown}>
        <button
          type="button"
          title="Previous slide"
          aria-label="Previous slide"
          ?disabled=${this.index <= 0}
          @click=${() => this.#go(this.index - 1)}
        >
          ${this.#previousIcon}
        </button>
        <span class="counter" aria-live="polite">${this.count ? this.index + 1 : 0} / ${this.count}</span>
        <button
          type="button"
          title="Next slide"
          aria-label="Next slide"
          ?disabled=${this.index >= this.count - 1}
          @click=${() => this.#go(this.index + 1)}
        >
          ${this.#nextIcon}
        </button>
      </nav>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gx-slides': GxSlides;
  }
}
