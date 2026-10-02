/**
 * Updates a live DOM tree in place to match a freshly parsed one, so unchanged
 * nodes (and their state, such as rendered diagrams) survive each edit.
 */

/** Marks runtime-owned elements that the morph must leave alone. */
export const KEEP_ATTRIBUTE = 'data-graphix-keep';

/** How far ahead to look for a matching sibling before giving up. */
const LOOKAHEAD = 32;

export function morphChildren(target: Node, source: Node) {
  const current = [...target.childNodes].filter((node) => !isKept(node));
  const wanted = [...source.childNodes];
  let i = 0;

  for (let j = 0; j < wanted.length; j++) {
    const next = wanted[j];
    const node = current[i];

    if (!node) {
      target.appendChild(adopt(next));
    } else if (node.isEqualNode(next)) {
      i++;
    } else if (indexOf(node, wanted, j + 1) !== -1) {
      // The current node reappears later, so `next` was inserted before it.
      target.insertBefore(adopt(next), node);
    } else {
      const match = indexOf(next, current, i + 1);
      if (match !== -1) {
        // `next` already exists further on, so the nodes before it were removed.
        while (i < match) current[i++].remove();
        i++;
      } else if (sameKind(node, next)) {
        morphNode(node, next);
        i++;
      } else {
        target.replaceChild(adopt(next), node);
        i++;
      }
    }
  }

  while (i < current.length) current[i++].remove();
}

function morphNode(node: Node, next: Node) {
  if (!(node instanceof Element) || !(next instanceof Element)) {
    if (node.nodeValue !== next.nodeValue) node.nodeValue = next.nodeValue;
    return;
  }

  // A changed script must be a new element to run again; template content
  // lives outside the child list, so just swap the whole thing.
  if (node instanceof HTMLScriptElement || node instanceof HTMLTemplateElement) {
    node.replaceWith(adopt(next));
    return;
  }

  for (const { name } of [...node.attributes]) {
    if (!next.hasAttribute(name)) node.removeAttribute(name);
  }
  for (const { name, value } of next.attributes) {
    if (node.getAttribute(name) !== value) node.setAttribute(name, value);
  }
  morphChildren(node, next);
}

/** Moves a parsed node into the document, with its scripts made runnable. */
function adopt(node: Node): Node {
  const adopted = document.adoptNode(node);
  if (adopted instanceof HTMLScriptElement) return runnable(adopted);
  if (adopted instanceof Element || adopted instanceof DocumentFragment) {
    for (const script of adopted.querySelectorAll('script')) {
      if (script instanceof HTMLScriptElement) script.replaceWith(runnable(script));
    }
  }
  return adopted;
}

/**
 * Parsed scripts are marked as already started and never run, so copy each
 * into a fresh element that runs when inserted.
 */
function runnable(script: HTMLScriptElement) {
  const fresh = document.createElement('script');
  for (const { name, value } of script.attributes) fresh.setAttribute(name, value);
  fresh.text = script.text;
  // Inserted external scripts default to async; keep them in document order.
  if (!script.hasAttribute('async')) fresh.async = false;
  return fresh;
}

function indexOf(node: Node, nodes: Node[], from: number) {
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
