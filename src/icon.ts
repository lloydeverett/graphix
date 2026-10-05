import { type Check, createElement } from 'lucide';

/**
 * A 16px Lucide icon, hidden from assistive technology: label the control
 * that holds it instead. Make it once and reuse the node, so each render
 * doesn't replace it.
 */
export const icon = (node: typeof Check) => createElement(node, { width: 16, height: 16, 'aria-hidden': 'true' });
