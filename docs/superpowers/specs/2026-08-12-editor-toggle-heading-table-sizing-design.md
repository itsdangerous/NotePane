# Editor Toggle, Heading Scale, and Table Auto-Fit Design

## Goal

Improve three focused editor interactions without replacing BlockNote or changing unrelated editing behavior:

1. Pressing Enter at the end of a toggle heading creates and focuses its first child paragraph.
2. Heading levels use the approved 30, 24, 20, and 16 pixel scale at the default 16 pixel editor font size.
3. Double-clicking a table column boundary sizes the column from its rendered content and respects the available editor width.

## Current Behavior and Root Causes

### Toggle heading Enter

Toggle headings currently use BlockNote's default Enter behavior. There is no NotePane handler that distinguishes a toggle heading title from a regular heading, so Enter creates a following sibling and leaves the toggle.

### Heading scale

The current relative values are `1.875em`, `1.5em`, `1.25em`, and `1.0625em`. At the default 16 pixel editor font size this produces 30, 24, 20, and 17 pixels. The approved scale changes only heading level 4 to `1em`, producing 16 pixels while retaining proportional scaling when the editor font size changes.

### Table column auto-fit

The existing measurement copies the table cell's computed `font` shorthand onto a detached measurement element. It does not preserve font properties applied to nested rendered content. A column containing differently sized or styled text can therefore be measured as though every cell used the cell-level font. The measurement also uses unconstrained `max-content`, so a long unbroken string can expand a column beyond the useful editor width.

## Design

### Toggle heading child insertion

Add a focused editor-keyboard helper that handles Enter only when all of these conditions hold:

- the selection is an empty text cursor;
- the cursor is in a heading block whose `isToggleable` property is true;
- the cursor is at the end of the heading title;
- Enter has no modifier keys and is not Shift+Enter.

When the conditions hold, prevent BlockNote's default Enter behavior, insert a paragraph as the first child of the toggle heading, and move the text cursor into that paragraph. If the heading already has children, insert the new paragraph before them. The operation must be a normal editor transaction so undo, redo, persistence, and rendered state remain aligned.

Do not change Enter in the middle of a title, regular headings, toggle-list items, existing child blocks, or Shift+Enter.

### Heading typography

Keep heading levels 1 through 3 unchanged and change heading level 4 from `1.0625em` to `1em`:

| Level | Relative size | Default computed size |
| --- | ---: | ---: |
| Heading 1 | `1.875em` | 30px |
| Heading 2 | `1.5em` | 24px |
| Heading 3 | `1.25em` | 20px |
| Heading 4 | `1em` | 16px |

The scale remains relative to the user's editor font-size preference. Existing line-height and block spacing remain unchanged.

### Table column auto-fit

Keep ProseMirror table column widths as the source of truth. Improve only the measurement that determines the width dispatched to the table transaction.

For every rendered cell that covers the active column:

1. Clone the content without resize handles or editor-only controls.
2. Preserve the rendered descendants and their computed typography, including font family, size, weight, style, letter spacing, and inline formatting.
3. Measure the content at its natural single-line width.
4. Include the cell's horizontal padding and borders.
5. Divide a spanning cell's contribution across its `colspan`.

Use the largest measured contribution, subject to the existing minimum width and a maximum derived from the table's available editor width. Long URLs and unbroken strings stop at that maximum and continue to wrap rather than forcing the editor wider. The same function must respond to the current rendered font size each time the user double-clicks; it must not cache measurements across font-size changes.

Manual drag resizing and live focus-ring updates remain unchanged.

## Boundaries and Failure Handling

- If the editor selection, toggle heading, active resize handle, table DOM, or column mapping cannot be resolved, leave the event to the existing behavior.
- Do not mutate rendered table DOM as the saved state. Dispatch a ProseMirror transaction for persisted column widths.
- Do not add global editor refactors or replace BlockNote extensions.
- Preserve unrelated work already present in the dirty worktree.

## Validation

Use test-driven development and observe each regression test fail before production changes.

Renderer tests will verify:

- Enter at the end of a toggle heading creates a first child paragraph and subsequent typing occurs in it;
- an existing child is retained after the newly inserted first child;
- regular headings, title-middle Enter, and Shift+Enter retain their existing behavior;
- heading levels compute to the approved relative scale;
- auto-fit selects the widest rendered cell when cells use different font sizes;
- changing rendered font size changes the next auto-fit result;
- a long unbroken value cannot expand the column beyond the available editor width;
- manual table resizing still works adjacent to auto-fit.

After focused tests pass, run `npm run verify:quick`, then run the relevant Renderer test selection. Because the work touches a shared editor key handler and ProseMirror table sizing, run `npm run verify` once at the end.
