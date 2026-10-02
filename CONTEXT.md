# graphix

A browser-only live HTML editor: you type HTML Source on one side and see its Preview on the other. A `<gx-mermaid>` element in the Source draws its contents as a Mermaid diagram.

## Language

**Source**:
The HTML fragment the user is editing; it becomes the body of the Preview.
_Avoid_: input, markdown, code, document

**Preview**:
The Source rendered in a sandboxed iframe. It is updated in place as the Source changes, so unchanged parts (and their state) survive each edit.
_Avoid_: output, live view, render

**Refresh**:
Throwing away the Preview's iframe and building it afresh from the current Source, clearing any state left behind by earlier edits or scripts.
_Avoid_: reload, reset

**Diagram**:
A `<gx-mermaid>` element in the Source, drawn from the Mermaid text inside it.
_Avoid_: chart, graph

**Render Error**:
The failure shown on a Diagram whose Mermaid text can't be parsed or rendered; while it's shown, the Diagram keeps its last successful drawing.
_Avoid_: parse error, syntax error
