# graphix

A browser-only live HTML editor: you type HTML Source on one side and see its Preview on the other. A `<gx-mermaid>` element in the Source draws its contents as a Mermaid diagram.

## Language

**Source**:
The HTML fragment the user is editing; it becomes the body of the Preview. Nothing in it runs code.
_Avoid_: input, markdown, code, document

**Preview**:
The Source rendered in a sandboxed iframe. It is updated in place as the Source changes, so unchanged parts (and their state) survive each edit.
_Avoid_: output, live view, render

**Refresh**:
Throwing away the Preview's iframe and building it afresh from the current Source, clearing any state left behind by earlier edits.
_Avoid_: reload, reset

**Base Style**:
The stylesheet the Preview starts from, before any styles in the Source: the default (water.css, dark or light to match the user's colour scheme), the browser's defaults ("HTML only"), or one of the classless stylesheets bundled from cssbed.com. Changing it restyles the Preview in place.
_Avoid_: theme, skin

**Diagram**:
A `<gx-mermaid>` element in the Source, drawn from the Mermaid text inside it.
_Avoid_: chart, graph

**Render Error**:
The failure shown on a Diagram whose Mermaid text can't be parsed or rendered; while it's shown, the Diagram keeps its last successful drawing.
_Avoid_: parse error, syntax error
