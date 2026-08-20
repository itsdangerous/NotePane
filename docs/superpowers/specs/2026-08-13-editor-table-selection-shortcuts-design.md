# Editor Table Selection Shortcuts Design

## Goal

Make table keyboard navigation and selection deterministic, and return focus to the editor after Escape dismisses an adaptive tooltip.

## Scope

- A `Tab` press in a focused table cell moves to exactly one adjacent cell, including after Korean IME composition.
- Escape that dismisses an adaptive tooltip returns focus to the active editor surface.
- Repeated Command/Ctrl+A inside a table progresses from the current cell, to the table, to the full editor document.

## Design

The existing capture-phase handlers in `StickyEditor` remain the single integration point. The table Tab handler prevents both BlockNote and browser default handling only when its own one-cell movement succeeds. Command/Ctrl+A reads the current ProseMirror selection type: text inside a cell selects that cell, a single-cell `CellSelection` expands to the containing table, and a table selection expands to the editor document.

`AdaptiveTooltipPortal` receives an editor-focus callback from the editor owner. Its Escape handler only restores focus when it actually dismisses a currently displayed adaptive tooltip, leaving other Escape behavior unchanged.

## Testing

Renderer Playwright coverage will verify a Korean cell moves one cell for Tab, Escape closes a visible adaptive tooltip and focuses the BlockNote editor, and three successive Command/Ctrl+A presses select cell, table, then document. Tests assert rendered selection/focus state rather than internal handler calls.
