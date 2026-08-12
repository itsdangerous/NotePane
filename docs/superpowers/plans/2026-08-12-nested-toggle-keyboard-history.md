# Nested Toggle Keyboard and Undo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild NotePane toggle keyboard transitions around independent base-format and toggle layers, with one undo step per conversion.

**Architecture:** Keep BlockNote block rendering and ProseMirror history. Move Space, Enter, and Backspace toggle commands into `src/toggleKeyboard.js`; use `closeHistory` on conversion transactions so typed shortcut markers belong to the preceding history event and the format conversion is independently undoable. Keep `src/main.jsx` as event routing only.

**Tech Stack:** React 19, BlockNote 0.52, ProseMirror history, Playwright Renderer E2E.

## Global Constraints

- Preserve unrelated dirty-worktree changes.
- Treat base format (`paragraph` or heading level 1-4) and toggle state as independent layers.
- Preserve block id, child blocks, heading level, inline styles, and toggle expanded state unless the requested transition explicitly changes them.
- New toggles start collapsed.
- Do not change lists, checklists, quotes, code blocks, tables, heading typography, or BlockNote rendering.
- Use test-driven development and verify every new contract fails before production changes.

---

### Task 1: Independent undo for toggle conversion

**Files:**
- Modify: `tests/e2e/renderer.spec.mjs`
- Modify: `src/toggleKeyboard.js`
- Modify: `src/main.jsx`

**Interfaces:**
- Produces: `handleToggleSpace(editor, event): boolean`
- Consumes: BlockNote editor, DOM `KeyboardEvent`, `closeHistory(transaction)` from `prosemirror-history`.

- [ ] **Step 1: Add failing Renderer contracts**

Add tests for an existing paragraph and a heading 2:

```javascript
test("undoes toggle conversion without consuming its shortcut marker", async ({ page }) => {
  // Existing paragraph: Home, ">", Space, Cmd+Z -> paragraph text starts with ">".
  // Heading 2: ">", Space, Cmd+Z -> heading 2 text starts with ">".
  // A second Cmd+Z -> paragraph text starts with "##".
});
```

Assert the actual `data-content-type`, heading role and level, and visible inline text after every undo. The test must fail against the current grouped history behavior.

- [ ] **Step 2: Run RED**

```bash
npx playwright test tests/e2e/renderer.spec.mjs --grep "undoes toggle conversion without consuming"
```

Expected: FAIL because undo removes the marker and may flatten the heading.

- [ ] **Step 3: Move the Space conversion command into the keyboard module**

Implement `handleToggleSpace` with guards for plain Space, an empty text selection, inline paragraph/heading title, and the exact `>` prefix. Inside `editor.transact`, call `closeHistory(transaction)`, delete only the marker, then update the same block:

```javascript
const target = block.type === "heading"
  ? { type: "heading", props: { level: block.props.level, isToggleable: true } }
  : { type: "toggleListItem", props: {} };
```

Remove `convertNotionToggleShortcut` from `src/main.jsx` and route Space through `handleToggleSpace` before BlockNote defaults.

- [ ] **Step 4: Run GREEN**

Run the command from Step 2 and confirm every intermediate state passes.

---

### Task 2: Heading shortcuts inside toggle mode

**Files:**
- Modify: `tests/e2e/renderer.spec.mjs`
- Modify: `src/toggleKeyboard.js`

**Interfaces:**
- Extends: `handleToggleSpace(editor, event): boolean`
- Preserves: toggle state, block id, children, inline content after the deleted marker, and stored expanded state.

- [ ] **Step 1: Add failing nested-format tests**

Create an ordinary toggle with a retained child. Put `##` at the title start and press Space. Assert it becomes heading 2 toggle with the same child and expanded/collapsed state. Then change it with `### Space` and assert heading 3 toggle.

Undo after each conversion and assert:

```text
heading 3 toggle -> heading 2 toggle with "###" restored
heading 2 toggle -> ordinary toggle with "##" restored
```

Redo both steps and assert heading 2 toggle then heading 3 toggle.

- [ ] **Step 2: Run RED**

```bash
npx playwright test tests/e2e/renderer.spec.mjs --grep "changes heading levels inside toggle mode"
```

Expected: FAIL because BlockNote does not promote `toggleListItem` or change toggle-heading levels through heading input rules.

- [ ] **Step 3: Extend the common Space command**

Recognize exact prefixes `#`, `##`, `###`, and `####` only for ordinary toggles and toggle headings. Apply `closeHistory`, delete the marker, and update the block to:

```javascript
{
  type: "heading",
  props: { level: marker.length, isToggleable: true },
}
```

Do not clear or overwrite the `toggle-{blockId}` storage key during a base-format change.

- [ ] **Step 4: Run GREEN and adjacent toggle tests**

```bash
npx playwright test tests/e2e/renderer.spec.mjs --grep "changes heading levels inside toggle mode|toggle heading|ordinary and heading toggles|Notion-style toggle"
```

Expected: PASS.

---

### Task 3: Consolidation and authoritative verification

**Files:**
- Refactor: `src/toggleKeyboard.js`
- Verify: `src/main.jsx`
- Verify: `tests/e2e/renderer.spec.mjs`

**Interfaces:**
- `handleToggleSpace(editor, event): boolean`
- `handleToggleEnter(editor, event): boolean`
- `handleToggleBackspace(editor, event): boolean`

- [ ] **Step 1: Remove duplicated mode inference and conversion code**

Keep shared helpers for current inline block resolution, modifier/selection guards, base-format detection, stored state cleanup, and marker parsing. `src/main.jsx` must contain no toggle block conversion logic.

- [ ] **Step 2: Run focused Renderer validation**

```bash
npx playwright test tests/e2e/renderer.spec.mjs --grep "toggle heading|toggle conversion|toggle mode|ordinary and heading toggles|toggle children|Notion-style toggle"
```

- [ ] **Step 3: Run Tier 2 and full validation**

```bash
npm run verify:quick
npm run verify
git diff --check
```

If an unrelated or flaky full-suite test fails, inspect and rerun it once in isolation, preserve unrelated code, and report the exact result.

- [ ] **Step 4: Report feature-specific diff and validation**

List the production/test files changed, focused commands, full verification status, warnings, and any unrelated dirty-worktree files left untouched.
