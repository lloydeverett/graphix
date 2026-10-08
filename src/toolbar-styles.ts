import { css } from 'lit';

/**
 * The toolbar along the top of the Source and the Preview: a `<header>` of
 * controls. Its controls all have one height, so each toolbar is the same
 * height whichever controls it holds. It's in the colours of what it sits
 * on, given as `--toolbar-background` and `--toolbar-text` (else the
 * editor's), with its controls and border drawn from that text, so they
 * suit any colours.
 */
export const toolbarStyles = css`
  header {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 6px;
    padding: 4px;
    border-bottom: 1px solid color-mix(in srgb, currentColor 20%, transparent);
    background: var(--toolbar-background, var(--surface));
    color: var(--toolbar-text, var(--fg));
  }

  header button,
  header select {
    box-sizing: border-box;
    height: 24px;
    padding: 0 10px;
    border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
    border-radius: 6px;
    background: color-mix(in srgb, currentColor 6%, transparent);
    color: inherit;
    font: inherit;
    font-size: var(--control-font-size);
    cursor: pointer;
    transition:
      background-color 120ms ease,
      border-color 120ms ease;
  }

  /* Only where there's a pointer to hover with, or a tap leaves it stuck on. */
  @media (hover: hover) {
    header button:hover,
    header select:hover {
      border-color: color-mix(in srgb, currentColor 45%, transparent);
      background: color-mix(in srgb, currentColor 12%, transparent);
    }
  }

  header button:active {
    background: color-mix(in srgb, currentColor 18%, transparent);
  }

  header .icon-button {
    display: inline-flex;
    align-items: center;
    padding: 0 6px;
  }
`;
