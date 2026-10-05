import { select } from 'd3-selection';
import { type D3ZoomEvent, type ZoomBehavior, type ZoomTransform, zoom, zoomIdentity, zoomTransform } from 'd3-zoom';
import { LitElement, css, html } from 'lit';
import { customElement, query } from 'lit/decorators.js';
import { Maximize, Minus, Plus } from 'lucide';
import { icon } from './icon.js';

const ZOOM_STEP = 1.25;
/** How far the user can zoom out and in; fitting may go further out. */
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 8;
/** How far an arrow key pans, in screen pixels. */
const PAN_STEP = 40;
/** How far the pointer may move during a click before it counts as a drag. */
const CLICK_DISTANCE = 4;
/** The most one wheel event may zoom, as a power of 2 (0.5, about 1.4×). */
const MAX_WHEEL_ZOOM_LOG2 = 0.5;
/** Where a press is the content's own, to select text or move a caret, rather than to pan. */
const FIELDS = 'input, textarea, select, [contenteditable]';

type ZoomEvent = D3ZoomEvent<HTMLElement, unknown>;
type Point = { x: number; y: number };

/** Where a pressed mouse or single finger is, or nothing for any other input. */
function pointOf(event: unknown): Point | undefined {
  // A wheel event is a MouseEvent too, but zooms at once.
  if (event instanceof MouseEvent && !(event instanceof WheelEvent)) return { x: event.clientX, y: event.clientY };
  if (event instanceof TouchEvent && event.touches.length === 1) {
    const [touch] = event.touches;
    return { x: touch.clientX, y: touch.clientY };
  }
  return undefined;
}

/**
 * A Pan View: a fixed-size window onto its content, which can be dragged,
 * zoomed with a pinch or ctrl/⌘-scroll, or moved from the keyboard. It fits
 * the content until the user moves it.
 *
 * The content stays in the light DOM, so the Source's CSS styles it as
 * anywhere else; the view and the pan and zoom live in the shadow root,
 * where the morph can't strip them. A transform scales without changing
 * layout, so zooming never lays out a Tree again.
 */
@customElement('gx-pan')
export class GxPan extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: relative;
      height: 24em;
      border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
      border-radius: 6px;
    }

    .view {
      position: absolute;
      inset: 0;
      overflow: hidden;
      border-radius: inherit;
      cursor: grab;
      touch-action: none;
    }

    .view.dragging {
      cursor: grabbing;
    }

    .view:focus-visible {
      outline: 2px solid Highlight;
      outline-offset: 2px;
    }

    /* No width, so it shrinks to fit within the view, as an absolute box
       does: text and tables wrap at its width, while anything wider that
       can't shrink (a Tree) widens the content, which is then fitted. Not
       max-content, which leaves prose on one long line, and gives a table
       that is 100% wide with a fixed layout (as water.css's are) a million
       pixels. */
    .content {
      position: absolute;
      top: 0;
      left: 0;
      transform-origin: 0 0;
    }

    .controls {
      position: absolute;
      right: 8px;
      bottom: 8px;
      display: flex;
      gap: 4px;
    }

    /* Drawn from currentColor, so they suit any Base Style. */
    button {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      padding: 0;
      border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
      border-radius: 6px;
      background: color-mix(in srgb, currentColor 8%, transparent);
      /* Keeps the icons readable over content panned beneath them. */
      backdrop-filter: blur(6px);
      color: inherit;
      cursor: pointer;
    }

    button:hover {
      background: color-mix(in srgb, currentColor 16%, transparent);
    }
  `;

  @query('.view') view!: HTMLElement;
  @query('.content') content!: HTMLElement;

  #zoom: ZoomBehavior<HTMLElement, unknown> = zoom<HTMLElement, unknown>()
    .scaleExtent([MIN_ZOOM, MAX_ZOOM])
    .clickDistance(CLICK_DISTANCE)
    .filter((event: MouseEvent) => {
      // A plain scroll scrolls the page; only ctrl/⌘-scroll (or a pinch) zooms.
      if (event.type === 'wheel') return event.ctrlKey || event.metaKey;
      if (event.ctrlKey || event.button) return false;
      // d3 stops the browser selecting text from any press it takes, so leave
      // it the second press of a double-click, which selects a word as
      // anywhere else, and presses in a field.
      if (event.type === 'mousedown' && event.detail > 1) return false;
      return !(event.target as Element).closest(FIELDS);
    })
    // d3's own scaling, times 10 for a ctrl-scroll, as a pinch's small steps
    // need; but capped, so a mouse wheel's large ones don't zoom in many times
    // over at once.
    .wheelDelta((event: WheelEvent) => {
      const delta = -event.deltaY * (event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002) * 10;
      return Math.max(-MAX_WHEEL_ZOOM_LOG2, Math.min(MAX_WHEEL_ZOOM_LOG2, delta));
    })
    .on('start', (event: ZoomEvent) => {
      const point = pointOf(event.sourceEvent);
      this.#press = point && { ...point, transform: event.transform };
    })
    .on('zoom', (event: ZoomEvent) => {
      // d3 pans from the first pixel; hold that back until it's a drag, so a
      // click that wobbles a little moves nothing.
      if (this.#press) {
        const point = pointOf(event.sourceEvent);
        if (point && Math.hypot(point.x - this.#press.x, point.y - this.#press.y) <= CLICK_DISTANCE) return;
        this.#press = undefined;
        this.view.classList.add('dragging');
      }
      if (event.sourceEvent) this.#moved = true;
      // Not transform.toString(), which is SVG's syntax: CSS needs units.
      const { x, y, k } = event.transform;
      this.content.style.transform = `translate(${x}px, ${y}px) scale(${k})`;
    })
    .on('end', () => {
      this.view.classList.remove('dragging');
      const press = this.#press;
      this.#press = undefined;
      // Only a click: put back the transform d3 moved without showing it.
      if (press) select(this.view).call(this.#zoom.transform, press.transform);
    });

  #zoomInIcon = icon(Plus);
  #zoomOutIcon = icon(Minus);
  #fitIcon = icon(Maximize);

  /** Whether the user has panned or zoomed since the content was last fitted. */
  #moved = false;

  /** A press that hasn't moved far enough to be a drag, and the transform before it. */
  #press?: Point & { transform: ZoomTransform };

  #resizes = new ResizeObserver(() => {
    if (!this.#moved) this.#fit();
  });

  connectedCallback() {
    super.connectedCallback();
    // After a reconnect, observe the view and content kept from before.
    if (this.hasUpdated) this.#observe();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#resizes.disconnect();
  }

  firstUpdated() {
    // Double-clicking (or double-tapping) selects a word, rather than zooming.
    select(this.view).call(this.#zoom).on('dblclick.zoom', null);
    this.#observe();
  }

  #observe() {
    this.#resizes.observe(this.view);
    this.#resizes.observe(this.content);
  }

  /** Scales the content to fit the view, never beyond its natural size, and centres it. */
  #fit() {
    const width = this.content.offsetWidth;
    const height = this.content.offsetHeight;
    if (!width || !height) return;
    const scale = Math.min(1, this.view.clientWidth / width, this.view.clientHeight / height);
    const x = (this.view.clientWidth - width * scale) / 2;
    const y = (this.view.clientHeight - height * scale) / 2;
    this.#moved = false;
    // Content too big to fit within MIN_ZOOM may still be zoomed out to its fit.
    this.#zoom.scaleExtent([Math.min(MIN_ZOOM, scale), MAX_ZOOM]);
    select(this.view).call(this.#zoom.transform, zoomIdentity.translate(x, y).scale(scale));
  }

  #zoomBy(factor: number) {
    this.#moved = true;
    select(this.view).call(this.#zoom.scaleBy, factor);
  }

  #panBy(x: number, y: number) {
    this.#moved = true;
    // translateBy works in content units, so divide out the zoom.
    const { k } = zoomTransform(this.view);
    select(this.view).call(this.#zoom.translateBy, x / k, y / k);
  }

  #onKeyDown(event: KeyboardEvent) {
    // Keys pressed in the content, such as in an <input>, are its own.
    if (event.target !== event.currentTarget) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const actions: Record<string, () => void> = {
      '+': () => this.#zoomBy(ZOOM_STEP),
      '=': () => this.#zoomBy(ZOOM_STEP),
      '-': () => this.#zoomBy(1 / ZOOM_STEP),
      '0': () => this.#fit(),
      ArrowLeft: () => this.#panBy(PAN_STEP, 0),
      ArrowRight: () => this.#panBy(-PAN_STEP, 0),
      ArrowUp: () => this.#panBy(0, PAN_STEP),
      ArrowDown: () => this.#panBy(0, -PAN_STEP),
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  }

  render() {
    return html`
      <div
        class="view"
        tabindex="0"
        role="group"
        aria-roledescription="pan view"
        aria-label="Drag to pan, ctrl or ⌘ and scroll to zoom; + and − zoom, 0 fits, arrow keys pan"
        @keydown=${this.#onKeyDown}
      >
        <div class="content"><slot></slot></div>
      </div>
      <div class="controls">
        <button type="button" title="Zoom in" aria-label="Zoom in" @click=${() => this.#zoomBy(ZOOM_STEP)}>
          ${this.#zoomInIcon}
        </button>
        <button type="button" title="Zoom out" aria-label="Zoom out" @click=${() => this.#zoomBy(1 / ZOOM_STEP)}>
          ${this.#zoomOutIcon}
        </button>
        <button type="button" title="Fit" aria-label="Fit" @click=${() => this.#fit()}>${this.#fitIcon}</button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gx-pan': GxPan;
  }
}
