# graphix

A browser-only live HTML editor: you type HTML Source on one side and see its Preview on the other. A `<gx-mermaid>` element in the Source draws its contents as a Mermaid diagram, nested `<gx-tree-node>` elements draw a Tree, and a `<gx-pan>` element shows its contents in a Pan View.

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
The stylesheet the Preview starts from, before any styles in the Source: water.css (the default, dark or light to match the user's colour scheme), the browser's defaults ("HTML only"), or one of the classless stylesheets bundled from cssbed.com. Changing it restyles the Preview in place. While its menu is open, the Preview tries on the Base Style under the pointer or the keyboard's focus, without changing the one chosen.
_Avoid_: theme, skin; "previewing" a Base Style (say "trying it on")

**Diagram**:
A `<gx-mermaid>` element in the Source, drawn from the Mermaid text inside it.
_Avoid_: chart, graph

**Tree**:
An outermost `<gx-tree-node>` in the Source, with the Tree Nodes nested in it, laid out as a node-link diagram. Unlike a Diagram, its nodes stay real elements in the Preview.
_Avoid_: graph, org chart

**Tree Node**:
A `<gx-tree-node>`: a box showing its label and content, joined by edges to the Tree Nodes nested directly inside it.
_Avoid_: vertex, item

**Pan View**:
A `<gx-pan>` element: a fixed-size window onto the Source inside it, which the user can pan and zoom. Its content is fitted to it until the user moves it, and keeps its pan and zoom through edits until a Refresh.
_Avoid_: viewport, canvas, scroller

**Render Error**:
The failure shown on a Diagram whose Mermaid text can't be parsed or rendered; while it's shown, the Diagram keeps its last successful drawing.
_Avoid_: parse error, syntax error
