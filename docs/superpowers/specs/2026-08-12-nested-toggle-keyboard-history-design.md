# Nested Toggle Keyboard and Undo Design

## Goal

Replace NotePane's accumulated toggle keyboard branches with one state model that preserves the distinction between a block's base format and whether it is toggleable. Make every conversion independently undoable in the same order the user performed it.

## State Model

A toggle heading is not a separate flat block mode. It is a heading with a toggle capability layered on top:

| Base format | Toggle off | Toggle on |
| --- | --- | --- |
| Paragraph | paragraph | ordinary toggle |
| Heading level 1-4 | heading | heading toggle at the same level |

The toggle layer never changes or discards the base format. Removing or undoing the toggle layer therefore returns to the same paragraph or heading level.

## Keyboard Transitions

At the start of an inline block, `> Space` changes only the toggle layer:

- paragraph plus `> Space` becomes an ordinary toggle;
- heading level N plus `> Space` becomes a heading toggle at level N;
- the shortcut marker is removed from visible content only as part of the toggle conversion;
- a newly created toggle starts collapsed and has no empty-child action visible.

Empty toggle exit behavior follows the same model:

- Enter or Backspace on an empty ordinary toggle returns to an empty paragraph;
- Enter or Backspace on an empty heading toggle returns to an empty heading at the same level;
- a subsequent Backspace on that empty heading uses normal heading behavior to return to a paragraph;
- leaving toggle mode clears persisted expanded state for that block id;
- existing child blocks remain attached when only the title format changes.

For a non-empty toggle title, Enter at the title end creates and focuses a new first child paragraph. Shift+Enter remains a hard line break.

## Undo and Redo Semantics

Each user-visible format conversion is its own ProseMirror history step. The typed shortcut marker must be separated from the conversion transaction so undo reverses one layer at a time.

Required sequences:

```text
paragraph with existing text
-> type ">" at the start
-> Space converts to ordinary toggle
-> Cmd+Z restores paragraph with the leading ">" still present
```

```text
paragraph
-> type "##" then Space converts to heading 2
-> type ">" then Space enables toggle
-> Cmd+Z disables toggle and restores heading 2 with leading ">"
-> Cmd+Z undoes the heading conversion and restores paragraph with "##" content
```

The first undo after a toggle conversion must never flatten a heading. Redo must replay the same layers in the forward order.

Implementation will use explicit ProseMirror history boundaries around NotePane's conversion command rather than timing assumptions or delayed DOM edits. BlockNote remains responsible for rendering and document persistence.

## Architecture

Move all NotePane toggle keyboard behavior into `src/toggleKeyboard.js`:

- recognize `> Space` against the current BlockNote block and text selection;
- resolve the base format and heading level;
- apply or remove only the toggle layer;
- manage the persisted expanded-state key;
- handle empty-title Enter and Backspace;
- create the first child for non-empty titles;
- establish undo boundaries for conversions.

`src/main.jsx` will only route relevant keydown events to the module and prevent the browser or BlockNote default when the command reports that it handled the event. Slash-menu creation will use the same initial collapsed-state invariant but will remain a BlockNote menu action rather than a keyboard shortcut.

## Validation

Renderer E2E tests will cover:

- existing paragraph text converted with a leading `>`, then one undo restoring the paragraph and `>`;
- heading levels 1-4 converted to toggle headings, then one undo restoring the same heading level and `>`;
- a second undo after heading-toggle undo restoring the paragraph and heading marker;
- redo replaying base-format and toggle-layer conversions in order;
- Enter and Backspace exits for empty ordinary and heading toggles;
- child creation, child preservation, Shift+Enter, collapsed creation, and expanded-state cleanup;
- shortcut and slash-menu toggle creation invariants.

After focused Renderer tests pass, run `npm run verify:quick` and `git diff --check`. Run `npm run verify` because the rewrite replaces a shared editor keyboard path and changes undo/redo behavior across paragraph and heading contexts.

## Boundaries

- Do not replace BlockNote's toggle renderer or ProseMirror history plugin.
- Do not alter list, checklist, quote, code block, or table keyboard behavior.
- Do not change heading typography or table sizing as part of this rewrite.
- Preserve unrelated dirty-worktree changes.
