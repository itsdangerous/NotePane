# Editor Table Selection Shortcuts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct table Tab navigation, adaptive-tooltip Escape focus recovery, and repeated Command/Ctrl+A selection escalation.

**Architecture:** Keep all keyboard integration in the existing `StickyEditor` capture handlers. Use ProseMirror selection types to express the three Command/Ctrl+A scopes, and pass a narrowly scoped editor focus callback to the global adaptive-tooltip portal.

**Tech Stack:** React 19, BlockNote 0.52, ProseMirror tables, Playwright.

## Global Constraints

- Preserve existing non-editor Escape behavior and editor focus containment.
- Do not change unrelated table drag, merge/split, or tooltip positioning behavior.
- Use renderer E2E tests for visible selection and focus contracts.

---

### Task 1: Add renderer regression tests

**Files:**

- Modify: `tests/e2e/renderer.spec.mjs`

**Interfaces:**

- Consumes: existing template table, `.adaptive-tooltip`, `.bn-editor`, and `modifierShortcut` test helper.
- Produces: failing user-visible contracts for one-cell Tab, tooltip Escape focus restoration, and the three Command/Ctrl+A scopes.

- [ ] **Step 1: Write the failing tests**

```js
await page.keyboard.insertText("한글");
await page.keyboard.press("Tab");
await expect(currentCellText(page)).toBe("Drafting, comparing, and organizing sessions");

await target.hover();
await page.keyboard.press("Escape");
await expect(page.locator(".adaptive-tooltip")).toHaveCount(0);
await expectEditorToBeFocused(page);

await page.keyboard.press(modifierShortcut("A"));
await expect(currentSelectionScope(page)).toBe("cell");
await page.keyboard.press(modifierShortcut("A"));
await expect(currentSelectionScope(page)).toBe("table");
await page.keyboard.press(modifierShortcut("A"));
await expect(currentSelectionText(page)).toContain("NotePane");
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npx playwright test tests/e2e/renderer.spec.mjs --grep "table keyboard shortcuts"`

Expected: the Tab/tooltip/selection assertions fail against current behavior.

### Task 2: Implement narrow keyboard and tooltip fixes

**Files:**

- Modify: `src/main.jsx:2384-2458`
- Modify: `src/main.jsx:7783-7916`
- Modify: `src/main.jsx:9837-10025`

**Interfaces:**

- Consumes: `editor.prosemirrorView`, `CellSelection`, `TextSelection`, and the active `StickyEditor` focus callback.
- Produces: `selectCurrentTable`, table-aware Command/Ctrl+A selection escalation, one handled Tab transition, and tooltip Escape editor focus restoration.

- [ ] **Step 1: Implement minimal selection and focus helpers**

```js
function selectCurrentTable(editor) {
  // Create one CellSelection spanning the first through last cell of the current table.
}

function focusActiveEditorAfterTooltipEscape() {
  // Focus the editor only after AdaptiveTooltipPortal dismissed its own tooltip.
}
```

- [ ] **Step 2: Route the capture handlers through those helpers**

```js
if (key === "a") {
  // text in cell -> single CellSelection -> whole table CellSelection -> document
}

if (moveTableTextCursorToAdjacentCell(editor, direction)) {
  event.preventDefault();
  event.stopPropagation();
}
```

- [ ] **Step 3: Run the focused tests to verify they pass**

Run: `npx playwright test tests/e2e/renderer.spec.mjs --grep "table keyboard shortcuts"`

Expected: all newly added selection, tooltip, and Korean Tab assertions pass.

### Task 3: Run scoped regression validation

**Files:**

- Modify: no additional files

**Interfaces:**

- Consumes: the focused renderer contracts from Tasks 1 and 2.
- Produces: Tier 2 validation evidence.

- [ ] **Step 1: Run fast build/unit/distribution verification**

Run: `npm run verify:quick`

Expected: build, unit suite, and distribution verification exit 0.

- [ ] **Step 2: Run adjacent table regression test**

Run: `npx playwright test tests/e2e/renderer.spec.mjs --grep "focuses table cells without changing their drag selection behavior"`

Expected: existing table cell focus, escape, arrow, Tab, and selection behavior remains green.

- [ ] **Step 3: Inspect final diff**

Run: `git diff --check && git diff -- src/main.jsx tests/e2e/renderer.spec.mjs`

Expected: no whitespace errors and changes limited to the agreed keyboard/tooltip behavior and its tests.
