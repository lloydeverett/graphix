import { css } from 'lit';

/**
 * The toolbar along the top of the Source and the Preview: a `<header>` of
 * controls. Its controls all have one height, so each toolbar is the same
 * height whichever controls it holds.
 */
export const toolbarStyles = css`
  header {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }

  header button,
  header select {
    box-sizing: border-box;
    height: 24px;
    padding: 0 10px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg);
    color: var(--fg);
    font: inherit;
    font-size: 13px;
    cursor: pointer;
  }

  header .icon-button {
    display: inline-flex;
    align-items: center;
    padding: 0 6px;
  }
`;
