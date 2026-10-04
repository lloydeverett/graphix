import { LitElement, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * The smallest a pane may be, along the split. Registered as a length so its
 * computed value is in pixels, whatever unit the consumer sets it in.
 */
const MIN_SIZE_PROPERTY = '--split-pane-min-size';
try {
  CSS.registerProperty({ name: MIN_SIZE_PROPERTY, syntax: '<length>', inherits: true, initialValue: '40px' });
} catch {
  // Already registered, by another copy of this module.
}

/** How far an arrow key moves a divider, as a fraction of its two panes. */
const KEYBOARD_STEP = 0.05;

/**
 * Neither element has a shadow root, so their styles are added to whichever
 * document or shadow root they're placed in.
 */
const styles = css`
  split-pane {
    display: flex;
    min-width: 0;
    min-height: 0;
  }

  split-pane[orientation='vertical'] {
    flex-direction: column;
  }

  /*
   * Panes share the space by flex-grow, which a divider sets as it's dragged.
   * They keep their minimum as the split-pane shrinks, up to half of it each.
   */
  split-pane > :not(split-divider) {
    flex: 1 1 0;
    min-width: min(var(--split-pane-min-size), 50% - 0.5px);
    min-height: 0;
  }

  split-pane[orientation='vertical'] > :not(split-divider) {
    min-width: 0;
    min-height: min(var(--split-pane-min-size), 50% - 0.5px);
  }

  split-pane[resizing] {
    cursor: col-resize;
    user-select: none;
  }

  split-pane[orientation='vertical'][resizing] {
    cursor: row-resize;
  }

  /* An iframe in a pane would otherwise take the pointer while it passes over. */
  split-pane[resizing] > :not(split-divider) {
    pointer-events: none;
  }

  split-pane > split-divider {
    flex: none;
    position: relative;
    width: 1px;
    background: var(--split-divider-color, currentColor);
    cursor: col-resize;
    touch-action: none;
    outline: none;
  }

  split-pane[orientation='vertical'] > split-divider {
    width: auto;
    height: 1px;
    cursor: row-resize;
  }

  /* A wider target than the 1px line, overlapping the panes either side. */
  split-divider::after {
    content: '';
    position: absolute;
    z-index: 1;
    inset: 0 -4px;
  }

  split-pane[orientation='vertical'] > split-divider::after {
    inset: -4px 0;
  }

  @media (pointer: coarse) {
    split-divider::after {
      inset: 0 -12px;
    }

    split-pane[orientation='vertical'] > split-divider::after {
      inset: -12px 0;
    }
  }

  split-divider:focus-visible,
  split-pane[resizing] > split-divider {
    background: var(--split-divider-active-color, Highlight);
    box-shadow: 0 0 0 1px var(--split-divider-active-color, Highlight);
  }
`;

/** Adds the styles to the document or shadow root `element` is in, once. */
function adoptStyles(element: Element) {
  const root = element.getRootNode();
  const sheet = styles.styleSheet;
  if (!sheet || !(root instanceof Document || root instanceof ShadowRoot)) return;
  if (!root.adoptedStyleSheets.includes(sheet)) {
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
  }
}

const flexGrow = (element: Element) => parseFloat(getComputedStyle(element).flexGrow) || 0;

/**
 * Lays out its children in a row (or a column, if `orientation` is
 * "vertical"), sharing the space evenly. Put a <split-divider> between two
 * children to let the user resize them; the children are the consumer's to
 * manage. A child's starting share can be set with CSS `flex-grow`, and the
 * smallest a child may be along the split with `--split-pane-min-size` (40px
 * by default, and never more than half the split-pane).
 */
@customElement('split-pane')
export class SplitPane extends LitElement {
  @property({ reflect: true }) orientation: 'horizontal' | 'vertical' = 'horizontal';

  protected createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    adoptStyles(this);
  }

  protected updated() {
    for (const child of this.children) {
      if (child instanceof SplitDivider) child.syncAria();
    }
  }
}

/**
 * Resizes the two siblings either side of it within a <split-pane>, by
 * dragging or with the arrow keys. Give it an `aria-label` naming what it
 * resizes.
 */
@customElement('split-divider')
export class SplitDivider extends LitElement {
  /** Where the pointer grabbed the divider, relative to its leading edge. */
  #grabOffset = 0;

  protected createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    adoptStyles(this);
    this.setAttribute('role', 'separator');
    this.setAttribute('aria-valuemin', '0');
    this.setAttribute('aria-valuemax', '100');
    this.tabIndex = 0;
    this.addEventListener('pointerdown', this.#onPointerDown);
    this.addEventListener('pointermove', this.#onPointerMove);
    this.addEventListener('lostpointercapture', this.#onPointerEnd);
    this.addEventListener('keydown', this.#onKeyDown);
    this.syncAria();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('pointerdown', this.#onPointerDown);
    this.removeEventListener('pointermove', this.#onPointerMove);
    this.removeEventListener('lostpointercapture', this.#onPointerEnd);
    this.removeEventListener('keydown', this.#onKeyDown);
  }

  get #vertical() {
    return this.parentElement instanceof SplitPane && this.parentElement.orientation === 'vertical';
  }

  /** The panes either side, if both exist. */
  get #panes(): [HTMLElement, HTMLElement] | undefined {
    const before = this.previousElementSibling;
    const after = this.nextElementSibling;
    if (before instanceof HTMLElement && after instanceof HTMLElement) return [before, after];
    return undefined;
  }

  /** Updates the ARIA attributes to match the orientation and the panes' sizes. */
  syncAria() {
    // A divider between side-by-side panes is a vertical line, and vice versa.
    this.setAttribute('aria-orientation', this.#vertical ? 'horizontal' : 'vertical');
    const panes = this.#panes;
    if (!panes) return;
    const [before, after] = panes.map(flexGrow);
    const total = before + after;
    if (total > 0) this.setAttribute('aria-valuenow', String(Math.round((before / total) * 100)));
  }

  /** The leading pane's start and size, and the two panes' combined size, in pixels. */
  #measure([before, after]: [HTMLElement, HTMLElement]) {
    const leading = before.getBoundingClientRect();
    const trailing = after.getBoundingClientRect();
    return this.#vertical
      ? { start: leading.top, size: leading.height, combined: leading.height + trailing.height }
      : { start: leading.left, size: leading.width, combined: leading.width + trailing.width };
  }

  /** Makes the leading pane `size` pixels, within limits, taking the space from its neighbour. */
  #resizeTo(size: number) {
    const panes = this.#panes;
    if (!panes) return;
    const { combined } = this.#measure(panes);
    if (combined <= 0) return;
    const minSize = parseFloat(getComputedStyle(this).getPropertyValue(MIN_SIZE_PROPERTY)) || 0;
    const min = Math.min(minSize, combined / 2);
    const fraction = Math.min(Math.max(size, min), combined - min) / combined;
    // Keep the pair's total flex-grow, so other panes keep their share.
    const total = flexGrow(panes[0]) + flexGrow(panes[1]);
    panes[0].style.flexGrow = String(total * fraction);
    panes[1].style.flexGrow = String(total * (1 - fraction));
    this.syncAria();
  }

  #position(event: PointerEvent) {
    return this.#vertical ? event.clientY : event.clientX;
  }

  #onPointerDown = (event: PointerEvent) => {
    const panes = this.#panes;
    if (event.button !== 0 || !panes) return;
    event.preventDefault();
    const { start, size } = this.#measure(panes);
    this.#grabOffset = this.#position(event) - (start + size);
    this.setPointerCapture(event.pointerId);
    this.parentElement?.toggleAttribute('resizing', true);
  };

  #onPointerMove = (event: PointerEvent) => {
    const panes = this.#panes;
    if (!panes || !this.hasPointerCapture(event.pointerId)) return;
    const { start } = this.#measure(panes);
    this.#resizeTo(this.#position(event) - this.#grabOffset - start);
  };

  #onPointerEnd = () => {
    this.parentElement?.removeAttribute('resizing');
  };

  #onKeyDown = (event: KeyboardEvent) => {
    const panes = this.#panes;
    if (!panes) return;
    const [shrink, grow] = this.#vertical ? ['ArrowUp', 'ArrowDown'] : ['ArrowLeft', 'ArrowRight'];
    const direction = event.key === grow ? 1 : event.key === shrink ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    const { size, combined } = this.#measure(panes);
    this.#resizeTo(size + direction * KEYBOARD_STEP * combined);
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'split-pane': SplitPane;
    'split-divider': SplitDivider;
  }
}
