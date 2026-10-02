/**
 * Updates a live DOM tree in place to match a freshly parsed one, so unchanged
 * nodes (and their state, such as drawn Diagrams) survive each edit.
 *
 * Parsed <script> elements are marked as already started, so moving them into
 * the document never runs them.
 */

/** Marks runtime-owned elements that the morph must leave alone. */
export const KEEP_ATTRIBUTE = 'data-graphix-keep';

/** How far ahead to look for a matching sibling before giving up. */
const LOOKAHEAD = 32;

export function morphChildren(target: Node, parsed: Node) {
  const current = [...target.childNodes].filter((node) => !isKept(node));
  const wanted = [...parsed.childNodes];
  let i = 0;

  for (let j = 0; j < wanted.length; j++) {
    const want = wanted[j];
    const node = current[i];

    if (!node) {
      target.appendChild(want);
    } else if (node.isEqualNode(want)) {
      i++;
    } else if (findEqualAhead(node, wanted, j + 1) !== -1) {
      // The current node reappears later, so `want` was inserted before it.
      target.insertBefore(want, node);
    } else {
      const match = findEqualAhead(want, current, i + 1);
      if (match !== -1) {
        // `want` already exists further on, so the nodes before it were removed.
        while (i < match) current[i++].remove();
        i++;
      } else if (sameKind(node, want)) {
        morphNode(node, want);
        i++;
      } else {
        target.replaceChild(want, node);
        i++;
      }
    }
  }

  while (i < current.length) current[i++].remove();
}

function morphNode(node: Node, want: Node) {
  if (!(node instanceof Element) || !(want instanceof Element)) {
    if (node.nodeValue !== want.nodeValue) node.nodeValue = want.nodeValue;
    return;
  }

  // Template content lives outside the child list, so swap the whole thing.
  if (node instanceof HTMLTemplateElement) {
    node.replaceWith(want);
    return;
  }

  for (const { name } of [...node.attributes]) {
    if (!want.hasAttribute(name)) node.removeAttribute(name);
  }
  for (const { name, value } of want.attributes) {
    if (node.getAttribute(name) !== value) node.setAttribute(name, value);
  }
  morphChildren(node, want);
}

/** Index of the first node from `from` (within LOOKAHEAD) equal to `node`, or -1. */
function findEqualAhead(node: Node, nodes: Node[], from: number) {
  const end = Math.min(nodes.length, from + LOOKAHEAD);
  for (let k = from; k < end; k++) {
    if (nodes[k].isEqualNode(node)) return k;
  }
  return -1;
}

function sameKind(a: Node, b: Node) {
  if (a.nodeType !== b.nodeType) return false;
  if (a instanceof Element && b instanceof Element) {
    return a.namespaceURI === b.namespaceURI && a.localName === b.localName;
  }
  return true;
}

function isKept(node: Node) {
  return node instanceof Element && node.hasAttribute(KEEP_ATTRIBUTE);
}
