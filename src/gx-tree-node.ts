import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk-api.js';
import { LitElement, css, html, nothing, svg } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

type Point = { x: number; y: number };
type Size = { width: number; height: number };

type Elk = { layout(graph: ElkNode): Promise<ElkNode> };
let elk: Promise<Elk> | undefined;

/** ELK is large, so load it only once a Tree needs laying out. */
function loadElk() {
  elk ??= import('elkjs/lib/elk.bundled.js').then(({ default: ELK }) => new ELK());
  return elk;
}

const DIRECTIONS = { down: 'DOWN', right: 'RIGHT', up: 'UP', left: 'LEFT' } as const;
type Direction = keyof typeof DIRECTIONS;

function isDirection(value: string): value is Direction {
  return Object.hasOwn(DIRECTIONS, value);
}

function isTreeNode(node: Node): node is GxTreeNode {
  return node instanceof Element && node.localName === 'gx-tree-node';
}

/**
 * A Tree Node: a box holding its label and content, with its child
 * `<gx-tree-node>`s drawn beyond it in the Tree's direction and joined to it
 * by edges. The outermost
 * one is the Tree, which lays out every Tree Node in it with ELK. Each one
 * stays a real element, so its content and CSS behave as anywhere else.
 *
 * Tree Nodes are placed from inside their shadow roots, never through
 * attributes or inline styles, which the morph would strip on each edit.
 */
@customElement('gx-tree-node')
export class GxTreeNode extends LitElement {
  // Content and child Tree Nodes go to separate slots without `slot`
  // attributes, which would be stripped by the morph too.
  static shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, slotAssignment: 'manual' };

  static styles = css`
    :host {
      display: block;
    }

    .canvas {
      position: relative;
      margin: 1em auto;
    }

    .edges {
      --edge-color: var(--gx-tree-edge-color, color-mix(in srgb, currentColor 55%, transparent));
      position: absolute;
      inset: 0;
      overflow: visible;
      pointer-events: none;
    }

    .edges path {
      fill: none;
      stroke: var(--edge-color);
      stroke-width: 1.5;
    }

    .edges marker path {
      fill: var(--edge-color);
      stroke: none;
    }

    /* Hidden until laid out, so it never flashes at the top left. */
    .node {
      position: absolute;
      visibility: hidden;
    }

    .node.placed {
      visibility: visible;
    }

    .card {
      box-sizing: border-box;
      /* Unaffected by where the node is placed, so placing never resizes it. */
      width: max-content;
      max-width: var(--gx-tree-node-max-width, 16em);
      padding: 0.5em 1em;
      border: 1px solid color-mix(in srgb, currentColor 40%, transparent);
      border-radius: 6px;
      background: color-mix(in srgb, currentColor 6%, transparent);
      text-align: center;
    }

    .label {
      font-weight: 600;
    }
  `;

  /** Text shown at the top of the node, before its content. */
  @property() label = '';

  /** Which way the Tree grows from its root; only read on the outermost node. */
  @property() direction = 'down';

  /** Where this node goes, relative to its parent node (or to the Tree, for the root). */
  @state() position?: Point;

  /** The Tree's size and edge paths; only set on the root. */
  @state() size?: Size;
  @state() edges: string[] = [];

  @query('.card') card!: HTMLElement;
  @query('slot.content') contentSlot!: HTMLSlotElement;
  @query('slot.children') childrenSlot!: HTMLSlotElement;

  #isRoot = false;
  #layoutPending = false;
  /** Results of any layout older than this are stale and dropped. */
  #latestLayoutId = 0;

  #mutations = new MutationObserver(() => this.#scheduleLayout());
  #resizes = new ResizeObserver(() => this.#scheduleLayout());
  /** Observing a card again would report its size again, and lay out forever. */
  #observedCards = new Set<Element>();

  connectedCallback() {
    this.#isRoot = !isTreeNode(this.parentElement ?? document.body);
    super.connectedCallback();
    if (!this.#isRoot) return;
    this.#mutations.observe(this, { childList: true, subtree: true, attributes: true });
    this.#scheduleLayout();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#mutations.disconnect();
    this.#resizes.disconnect();
    this.#observedCards.clear();
  }

  /** The child Tree Nodes, in order. */
  get treeChildren(): GxTreeNode[] {
    return [...this.children].filter(isTreeNode);
  }

  /** Sends content to the card and child Tree Nodes out of it. */
  #assignSlots() {
    const content = [...this.childNodes].filter(
      (node): node is Element | Text => (node instanceof Element || node instanceof Text) && !isTreeNode(node),
    );
    this.contentSlot.assign(...content);
    this.childrenSlot.assign(...this.treeChildren);
  }

  #scheduleLayout() {
    if (this.#layoutPending) return;
    this.#layoutPending = true;
    // A morph makes all its changes at once, so lay out once after them.
    queueMicrotask(() => {
      this.#layoutPending = false;
      void this.#layout();
    });
  }

  async #layout() {
    const layoutId = ++this.#latestLayoutId;

    const nodes: GxTreeNode[] = [];
    const visit = (node: GxTreeNode) => {
      nodes.push(node);
      node.treeChildren.forEach(visit);
    };
    visit(this);

    await Promise.all(nodes.map((node) => node.updateComplete));
    if (layoutId !== this.#latestLayoutId || !this.isConnected) return;

    for (const node of nodes) node.#assignSlots();
    this.#observeCards(nodes.map((node) => node.card));

    const ids = new Map(nodes.map((node, i) => [node, `n${i}`]));
    const direction = isDirection(this.direction) ? this.direction : 'down';
    const graph: ElkNode = {
      id: 'tree',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': DIRECTIONS[direction],
        'elk.edgeRouting': 'ORTHOGONAL',
        'elk.spacing.nodeNode': '24',
        'elk.layered.spacing.nodeNodeBetweenLayers': '40',
        'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
        // Siblings' edges share a trunk from their parent.
        'elk.layered.mergeEdges': 'true',
        // Keep children in the order they're written.
        'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
        'elk.padding': '[top=2,left=2,bottom=2,right=2]',
      },
      children: nodes.map((node) => ({
        id: ids.get(node)!,
        width: node.card.offsetWidth,
        height: node.card.offsetHeight,
      })),
      edges: nodes.flatMap((node) =>
        node.treeChildren.map(
          (child): ElkExtendedEdge => ({
            id: `${ids.get(node)}-${ids.get(child)}`,
            sources: [ids.get(node)!],
            targets: [ids.get(child)!],
          }),
        ),
      ),
    };

    const result = await (await loadElk()).layout(graph);
    if (layoutId !== this.#latestLayoutId || !this.isConnected) return;

    const placed = new Map(result.children!.map(({ id, x, y }) => [id, { x: x!, y: y! }]));
    const place = (node: GxTreeNode, parentAt: Point) => {
      const at = placed.get(ids.get(node)!)!;
      node.position = { x: at.x - parentAt.x, y: at.y - parentAt.y };
      for (const child of node.treeChildren) place(child, at);
    };
    place(this, { x: 0, y: 0 });

    this.size = { width: result.width!, height: result.height! };
    this.edges = (result.edges ?? []).flatMap((edge) =>
      (edge.sections ?? []).map(({ startPoint, bendPoints = [], endPoint }) =>
        [startPoint, ...bendPoints, endPoint].map(({ x, y }, i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' '),
      ),
    );
  }

  #observeCards(cards: Element[]) {
    const current = new Set(cards);
    for (const card of this.#observedCards) {
      if (!current.has(card)) this.#resizes.unobserve(card);
    }
    for (const card of current) {
      if (!this.#observedCards.has(card)) this.#resizes.observe(card);
    }
    this.#observedCards = current;
  }

  render() {
    const node = html`
      <div
        class="node ${this.position ? 'placed' : ''}"
        style=${styleMap({ left: `${this.position?.x ?? 0}px`, top: `${this.position?.y ?? 0}px` })}
      >
        <div part="card" class="card">
          ${this.label ? html`<div part="label" class="label">${this.label}</div>` : nothing}<slot class="content"></slot>
        </div>
        <slot class="children"></slot>
      </div>
    `;
    if (!this.#isRoot) return node;

    const { width = 0, height = 0 } = this.size ?? {};
    return html`
      <div class="canvas" style=${styleMap({ width: `${width}px`, height: `${height}px` })}>
        <svg class="edges" width=${width} height=${height} aria-hidden="true">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto">
              <path d="M0 0 L10 5 L0 10 z"></path>
            </marker>
          </defs>
          ${this.edges.map((d) => svg`<path d=${d} marker-end="url(#arrow)"></path>`)}
        </svg>
        ${node}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gx-tree-node': GxTreeNode;
  }
}
