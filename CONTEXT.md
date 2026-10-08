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

**Preview Font**:
The font the Preview's text is shown in, over the Base Style's: Lato (the default), Inter, Schibsted Grotesk, Newsreader, Fraunces or Literata, bundled with graphix, or System UI or System Serif, the system's own. Code keeps the Base Style's monospace font, Diagrams keep Mermaid's, and the Source's own styles win over it. Changing it restyles the Preview in place, and while its menu is open, the Preview tries on the font under the pointer or the keyboard's focus, as it does a Base Style.
_Avoid_: typeface, preview theme

**Editor Font**:
The monospace font the Source is shown in: Cascadia Code (the default), Cascadia Mono, Fira Code, JetBrains Mono or IBM Plex Mono, bundled with graphix, or System Mono, the system's own. While the editor's settings menu is open, the Source tries on the font under the pointer or the keyboard's focus.
_Avoid_: code font, system font

**Editor Color Scheme**:
The colours the Source and its toolbar are shown in: Default, the editor's own, light or dark to match the user's colour scheme, or one drawn from a well-known palette (Rosé Pine, Rosé Pine Dawn, Everforest, Evergarden, Gruvbox, Solarized Dark, Solarized Light or Catppuccin Latte), which stays light or dark whatever the system's. The rest of the editor, its menus included, keeps Default's. While the editor's settings menu is open, the Source tries on the scheme under the pointer or the keyboard's focus, as it does an Editor Font.
_Avoid_: theme, editor theme

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
