# graphix

A browser-only live editor for Mermaid diagrams: you type Mermaid Source on one side and see its Preview on the other.

## Language

**Source**:
The Mermaid diagram text the user is editing.
_Avoid_: input, markdown, code, diagram text

**Preview**:
The rendered diagram produced from the most recent Source that rendered successfully.
_Avoid_: output, live view, render

**Render Error**:
The failure shown when the current Source can't be parsed or rendered; while it's shown, the Preview keeps the last successful diagram.
_Avoid_: parse error, syntax error
