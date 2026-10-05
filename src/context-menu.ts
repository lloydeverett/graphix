import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Check } from 'lucide';
import { icon } from './icon.js';

/** The gap between a menu and its anchor, and the least it keeps from the window's edges. */
const GAP = 4;

/** The focused element, looking inside shadow roots. */
function deepActiveElement() {
  let element = document.activeElement;
  while (element?.shadowRoot?.activeElement) element = element.shadowRoot.activeElement;
  return element;
}

/**
 * A menu of `<menu-item>`s that pops up beside its `anchor`, above the rest
 * of the page, and follows it while open. It's a popover, so open it with a
 * button's `popovertarget` (which also lets the button close it again, and
 * makes the button its anchor) or `showPopover()`. It closes
 * when an item is chosen, on Escape, on a click outside it, or when the
 * window loses focus, and returns focus to wherever it was before.
 *
 * Arrow keys, Home and End move between items; Enter or Space chooses one.
 */
@customElement('context-menu')
export class ContextMenu extends LitElement {
  static styles = css`
    :host {
      /* Not display, or the popover would show while closed. */
      box-sizing: border-box;
      min-width: 160px;
      margin: 0;
      inset: auto;
      padding: 4px;
      overflow: auto;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--bg);
      color: var(--fg);
      font-size: 13px;
      box-shadow: 0 4px 16px var(--shadow);
    }
  `;

  /**
   * The element the menu opens beside. Unset, it's the button in the same
   * root whose `popovertarget` is this menu's id.
   */
  @property({ attribute: false }) anchor?: Element;

  /**
   * Which of the anchor's sides the menu lines up with: its `start` (left)
   * edge, its `end` (right) edge, or by default whichever side is nearer the
   * middle of the window, so the menu opens towards it.
   */
  @property() align: 'auto' | 'start' | 'end' = 'auto';

  /** What had focus before the menu opened, to give it back when it closes. */
  #returnFocusTo?: Element | null;

  constructor() {
    super();
    this.addEventListener('beforetoggle', this.#onBeforeToggle);
    this.addEventListener('toggle', this.#onToggle);
    this.addEventListener('keydown', this.#onKeyDown);
    this.addEventListener('menu-select', () => this.hidePopover());
  }

  connectedCallback() {
    super.connectedCallback();
    this.popover ??= 'auto';
    this.setAttribute('role', 'menu');
  }

  get #anchor() {
    if (this.anchor) return this.anchor;
    if (!this.id) return null;
    const root = this.getRootNode() as Document | ShadowRoot;
    return root.querySelector(`[popovertarget="${CSS.escape(this.id)}"]`);
  }

  get #items() {
    return [...this.querySelectorAll('menu-item')];
  }

  #onBeforeToggle = (event: Event) => {
    if ((event as ToggleEvent).newState === 'open') {
      this.#returnFocusTo = deepActiveElement();
      this.#place();
    } else if (this.contains(deepActiveElement())) {
      // Not if the menu closed because the user clicked away to something else.
      if (this.#returnFocusTo instanceof HTMLElement) this.#returnFocusTo.focus();
    }
  };

  /**
   * Places the menu below the anchor, or above it if the anchor is low in the
   * window, and lined up with the side of it that `align` picks.
   * Done before the menu shows, so it never shows anywhere else, and again
   * as the window resizes or (on iOS) the page follows the visible area.
   */
  #place = () => {
    const anchor = this.#anchor;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const below = rect.top + rect.bottom < innerHeight;
    const fromLeft = this.align === 'auto' ? rect.left + rect.right < innerWidth : this.align === 'start';
    Object.assign(this.style, {
      top: below ? `${rect.bottom + GAP}px` : '',
      bottom: below ? '' : `${innerHeight - rect.top + GAP}px`,
      left: fromLeft ? `${rect.left}px` : '',
      right: fromLeft ? '' : `${innerWidth - rect.right}px`,
      maxHeight: `${(below ? innerHeight - rect.bottom : rect.top) - 2 * GAP}px`,
    });
  };

  #onToggle = (event: Event) => {
    const open = (event as ToggleEvent).newState === 'open';
    if (open) this.#items[0]?.focus();
    const listen = open ? 'addEventListener' : 'removeEventListener';
    window[listen]('blur', this.#onWindowBlur);
    window[listen]('resize', this.#place);
    window.visualViewport?.[listen]('resize', this.#place);
    window.visualViewport?.[listen]('scroll', this.#place);
  };

  /**
   * A click in an iframe never reaches this page, so the popover can't tell
   * it's outside; but it takes focus from the window, as does switching away.
   */
  #onWindowBlur = () => {
    if (this.matches(':popover-open')) this.hidePopover();
  };

  #onKeyDown = (event: KeyboardEvent) => {
    const items = this.#items;
    const current = items.indexOf(deepActiveElement() as MenuItem);
    const next = {
      ArrowDown: (current + 1) % items.length,
      ArrowUp: (current - 1 + items.length) % items.length,
      Home: 0,
      End: items.length - 1,
    }[event.key];
    if (next !== undefined) {
      event.preventDefault();
      items[next]?.focus();
    } else if (event.key === 'Tab') {
      event.preventDefault();
      this.hidePopover();
    }
  };

  render() {
    return html`<slot></slot>`;
  }
}

/**
 * An item in a `<context-menu>`. Give it `type="checkbox"` to make it a
 * setting that's on or off: choosing it flips `checked`.
 *
 * @fires menu-select - when the user chooses the item, after any change to `checked`. Bubbles.
 */
@customElement('menu-item')
export class MenuItem extends LitElement {
  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 12px 4px 8px;
      border-radius: 4px;
      cursor: default;
      user-select: none;
      outline: none;
    }

    :host(:hover),
    :host(:focus-visible) {
      background: var(--active-line);
    }

    :host(:focus-visible) {
      outline: 2px solid var(--syntax-attribute);
      outline-offset: -2px;
    }

    .check {
      display: inline-flex;
      width: 16px;
      height: 16px;
    }
  `;

  /** A plain item does something; a checkbox item turns a setting on or off. */
  @property({ reflect: true }) type: 'normal' | 'checkbox' = 'normal';

  /** Whether a checkbox item's setting is on. */
  @property({ type: Boolean, reflect: true }) checked = false;

  #checkIcon = icon(Check);

  constructor() {
    super();
    this.addEventListener('click', this.#choose);
    // So the arrow keys carry on from the item under the pointer.
    this.addEventListener('pointermove', () => this.focus());
    this.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      this.#choose();
    });
  }

  connectedCallback() {
    super.connectedCallback();
    // Focusable, but out of the tab order: the menu's arrow keys move between items.
    this.tabIndex = -1;
  }

  #choose = () => {
    if (this.type === 'checkbox') this.checked = !this.checked;
    this.dispatchEvent(new Event('menu-select', { bubbles: true }));
  };

  protected willUpdate() {
    const checkbox = this.type === 'checkbox';
    this.setAttribute('role', checkbox ? 'menuitemcheckbox' : 'menuitem');
    if (checkbox) this.setAttribute('aria-checked', String(this.checked));
    else this.removeAttribute('aria-checked');
  }

  render() {
    return html`
      ${this.type === 'checkbox'
        ? html`<span class="check">${this.checked ? this.#checkIcon : nothing}</span>`
        : nothing}
      <slot></slot>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'context-menu': ContextMenu;
    'menu-item': MenuItem;
  }
}
