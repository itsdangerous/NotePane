# Editor Toggle, Heading Scale, and Table Auto-Fit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make toggle-heading Enter create a focused first child, use the approved heading scale, and make table auto-fit honor rendered font sizes without exceeding the editor width.

**Architecture:** Keep BlockNote and ProseMirror as the state authorities. Add a focused toggle-heading keyboard helper, keep heading typography in the existing stylesheet, and refine the existing table sizing module so DOM measurement feeds a ProseMirror column-width transaction.

**Tech Stack:** React 19, BlockNote 0.52, ProseMirror, prosemirror-tables, CSS, Playwright Renderer E2E.

## Global Constraints

- Preserve unrelated dirty-worktree changes, including overlapping edits in `src/main.jsx`, `src/styles.css`, and `tests/e2e/renderer.spec.mjs`.
- Handle plain Enter only at the end of a toggle heading with an empty text cursor.
- Keep regular headings, title-middle Enter, Shift+Enter, toggle lists, manual table drag resizing, undo/redo, and persistence behavior unchanged.
- Use heading sizes `1.875em`, `1.5em`, `1.25em`, and `1em`.
- Measure the current rendered typography on every table auto-fit and cap the result at the editor's available content width.
- Run focused Renderer checks during development and `npm run verify` once at the end.

---

### Task 1: Toggle-heading Enter behavior

**Files:**
- Create: `src/toggleHeadingKeyboard.js`
- Modify: `src/main.jsx` in the editor keydown capture setup
- Test: `tests/e2e/renderer.spec.mjs` near the existing toggle-heading shortcut test

**Interfaces:**
- Consumes: a BlockNote editor instance and the current DOM `KeyboardEvent`.
- Produces: `insertToggleHeadingFirstChildOnEnter(editor, event): boolean`, returning true only when it performs the transaction and cursor move.

- [ ] **Step 1: Write the failing Renderer test**

Add a test that creates `# > Toggle parent`, presses Enter at the title end, types `First child`, and asserts that the paragraph is inside the toggle heading's `.bn-block-outer` rather than a following top-level block. Add a pre-existing child through the editor API, repeat Enter at the parent end, and assert the new paragraph precedes the retained child.

```javascript
test("creates and focuses the first child when Enter ends a toggle heading", async ({ page }) => {
  await clickLastEmptyParagraph(page);
  await page.keyboard.type("#");
  await page.keyboard.press("Space");
  await page.keyboard.type(">");
  await page.keyboard.press("Space");
  await page.keyboard.type("Toggle parent");
  await page.keyboard.press("Enter");
  await page.keyboard.type("First child");

  const toggle = page.getByRole("heading", { name: "Toggle parent", level: 1 })
    .locator("xpath=ancestor::*[contains(@class, 'bn-block-outer')][1]");
  await expect(toggle.getByText("First child", { exact: true })).toBeVisible();
  await expect(page.locator(
    ".bn-editor > .bn-block-group > .bn-block-outer > .bn-block-content",
  ).filter({ hasText: "First child" })).toHaveCount(0);
});
```

Name the mutation caught: removing the Enter interception or inserting after the toggle makes the child-scope assertion fail.

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
npx playwright test tests/e2e/renderer.spec.mjs --grep "creates and focuses the first child"
```

Expected: FAIL because typed text appears outside the toggle heading.

- [ ] **Step 3: Add the focused helper and wire it before BlockNote defaults**

Implement `insertToggleHeadingFirstChildOnEnter` with these guards:

```javascript
export function insertToggleHeadingFirstChildOnEnter(editor, event) {
  if (
    event.key !== "Enter" ||
    event.shiftKey || event.metaKey || event.ctrlKey || event.altKey ||
    !editor?.prosemirrorView?.state.selection.empty
  ) return false;

  const { block } = editor.getTextCursorPosition();
  if (block?.type !== "heading" || block.props?.isToggleable !== true) return false;
  if (!isTextCursorAtBlockEnd(editor.prosemirrorView.state.selection)) return false;

  const updatedBlock = editor.updateBlock(block, {
    children: [
      { type: "paragraph", content: "" },
      ...(block.children ?? []),
    ],
  });
  const child = updatedBlock.children[0];
  editor.setTextCursorPosition(child, "start");
  return true;
}
```

Use ProseMirror selection offsets in `isTextCursorAtBlockEnd` so the helper does not infer cursor position from DOM text. In `handleEditorKeyDownCapture`, call the helper before the existing Space/shortcut branches; on true, prevent default, stop propagation, and mark the editor active.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 5: Add adjacent regression assertions**

Extend the test or add a second focused test proving Shift+Enter and Enter in a regular heading are not intercepted. Run:

```bash
npx playwright test tests/e2e/renderer.spec.mjs --grep "toggle heading|regular heading"
```

Expected: PASS.

---

### Task 2: Approved heading scale

**Files:**
- Modify: `src/styles.css` at the level-specific heading variables
- Test: `tests/e2e/renderer.spec.mjs` in the existing four-level toggle-heading test

**Interfaces:**
- Consumes: `--editor-font-scale` through the existing BlockNote editor font size.
- Produces: computed H1–H4 sizes of 30, 24, 20, and 16 pixels at default scale.

- [ ] **Step 1: Tighten the existing computed-style assertion and verify RED**

Replace the ordering-only assertion with literal expected values:

```javascript
expect(headingFontSizes).toEqual([30, 24, 20, 16]);
```

Run:

```bash
npx playwright test tests/e2e/renderer.spec.mjs --grep "creates four toggle heading levels"
```

Expected: FAIL with H4 computed as 17 pixels.

Name the mutation caught: restoring H4 to `1.0625em` makes the literal size assertion fail.

- [ ] **Step 2: Apply the minimal CSS change**

```css
.bn-editor [data-content-type="heading"][data-level="4"] {
  --level: 1em;
}
```

- [ ] **Step 3: Run the focused test and verify GREEN**

Run the command from Step 1. Expected: PASS with `[30, 24, 20, 16]`.

---

### Task 3: Font-aware bounded table auto-fit

**Files:**
- Modify: `src/tableColumnSizing.js`
- Test: `tests/e2e/renderer.spec.mjs` in the existing table resize/auto-fit test area

**Interfaces:**
- Consumes: the active table column, rendered cell descendants, computed styles, and the closest `.bn-editor` content width.
- Produces: a finite integer width passed to the existing `updateTableColumnWidth(view, cellPosition, width)` transaction.

- [ ] **Step 1: Write a failing dynamic-font-size auto-fit test**

Create a table with short text in the active column, apply a larger inline font size to one cell using the existing editor font-size UI, auto-fit, record the width, reduce the text font size, auto-fit again, and assert the second width is smaller by a hand-checked positive margin.

Also put a long unbroken value in the column, auto-fit, and assert:

```javascript
const { columnWidth, editorWidth } = await page.evaluate(() => ({
  columnWidth: document.querySelector(".bn-editor td").getBoundingClientRect().width,
  editorWidth: document.querySelector(".bn-editor").getBoundingClientRect().width,
}));
expect(columnWidth).toBeLessThanOrEqual(editorWidth + 1);
```

Name the mutations caught: using only the cell-level font makes the dynamic-size width unchanged; removing the maximum makes the long-value assertion exceed editor width.

- [ ] **Step 2: Run the table test and verify RED**

Run:

```bash
npx playwright test tests/e2e/renderer.spec.mjs --grep "auto-fits columns from rendered font sizes"
```

Expected: FAIL because nested font-size changes do not reliably alter the measured width and unbroken content is unconstrained.

- [ ] **Step 3: Preserve descendant typography during measurement**

Refactor `measureCellContentWidth(cell)` to clone content into an offscreen measurement tree, remove resize/editor controls, and copy computed typography from each source element to its matching clone:

```javascript
const TYPOGRAPHY_PROPERTIES = [
  "fontFamily", "fontSize", "fontStyle", "fontWeight",
  "fontStretch", "fontVariant", "lineHeight", "letterSpacing",
  "textTransform", "textIndent",
];

function copyRenderedTypography(sourceRoot, cloneRoot) {
  const sources = [sourceRoot, ...sourceRoot.querySelectorAll("*")];
  const clones = [cloneRoot, ...cloneRoot.querySelectorAll("*")];
  sources.forEach((source, index) => {
    const style = getComputedStyle(source);
    for (const property of TYPOGRAPHY_PROPERTIES) {
      clones[index].style[property] = style[property];
    }
  });
}
```

Keep `width: max-content`, `white-space: nowrap`, cell padding, borders, and `box-sizing: border-box` on the measurement wrapper.

- [ ] **Step 4: Cap the measured result at the editor content width**

Derive the maximum on every invocation:

```javascript
function getMaximumAutoFitWidth(table) {
  const editor = table.closest(".bn-editor");
  const editorStyle = editor ? getComputedStyle(editor) : null;
  const horizontalPadding = editorStyle
    ? parseFloat(editorStyle.paddingLeft) + parseFloat(editorStyle.paddingRight)
    : 0;
  return Math.max(
    MIN_AUTO_FIT_COLUMN_WIDTH,
    Math.floor((editor?.clientWidth ?? table.parentElement?.clientWidth ?? table.clientWidth) - horizontalPadding),
  );
}
```

Clamp the largest colspan-adjusted measurement between the existing minimum and this maximum before dispatch.

- [ ] **Step 5: Run the focused table tests and verify GREEN**

Run:

```bash
npx playwright test tests/e2e/renderer.spec.mjs --grep "resizes selected table cells|auto-fits columns from rendered font sizes"
```

Expected: PASS, including the existing manual drag contract.

---

### Task 4: Integrated verification and handoff

**Files:**
- Modify only if a failure is demonstrably caused by Tasks 1–3.

**Interfaces:**
- Consumes: all changes from Tasks 1–3.
- Produces: verified editor behavior with exact command evidence.

- [ ] **Step 1: Run fast build, unit, and distribution validation**

```bash
npm run verify:quick
```

Expected: build, unit tests, and distribution verification pass.

- [ ] **Step 2: Run the focused Renderer contracts together**

```bash
npx playwright test tests/e2e/renderer.spec.mjs --grep "toggle heading|creates four toggle heading levels|resizes selected table cells|auto-fits columns from rendered font sizes"
```

Expected: all selected tests pass.

- [ ] **Step 3: Run full authoritative verification once**

```bash
npm run verify
```

Expected: build, unit, distribution, Renderer E2E, and Electron E2E pass. If an unrelated test fails, inspect its error and rerun that test once in isolation without changing unrelated production code.

- [ ] **Step 4: Review the feature-only diff**

```bash
git diff --check
git diff -- src/toggleHeadingKeyboard.js src/main.jsx src/styles.css src/tableColumnSizing.js tests/e2e/renderer.spec.mjs
git status --short
```

Confirm the implementation preserves pre-existing unrelated changes in overlapping files and report any remaining dirty files separately.

---

### Task 5: Align multiline toggle-heading arrows to the first line

**Files:**
- Modify: `src/styles.css` next to the existing toggle-list wrapper alignment
- Test: `tests/e2e/renderer.spec.mjs` next to the toggle-heading Shift+Enter regression

**Interfaces:**
- Consumes: BlockNote's `.bn-toggle-wrapper` and `.bn-toggle-button` DOM.
- Produces: top-aligned toggle-heading controls independent of the heading's multiline height.

- [ ] **Step 1: Add a failing rendered-alignment test**

Create an H1 toggle heading and an ordinary toggle-list item, insert Shift+Enter line breaks, and measure their toggle button, wrapper, and title rectangles. Assert each button top remains within one pixel of its wrapper top and is above the title's vertical midpoint. For the ordinary toggle, also verify the `Empty toggle. Click to add a block.` action is visible without changing the top alignment.

- [ ] **Step 2: Run the test and verify RED**

```bash
npx playwright test tests/e2e/renderer.spec.mjs --grep "top-aligns multiline toggle heading arrows"
```

Expected: FAIL because BlockNote's default `.bn-toggle-wrapper` uses `align-items: center`.

- [ ] **Step 3: Apply the scoped CSS override**

Extend the existing `align-items: flex-start` selector to include `.bn-block-content[data-content-type="heading"][data-is-toggleable="true"] .bn-toggle-wrapper`.

- [ ] **Step 4: Run the focused test and build**

Run the test from Step 2 and `npm run build`. Expected: both pass.

---

### Task 6: Unify ordinary and heading toggle Enter behavior

**Files:**
- Delete: `src/toggleHeadingKeyboard.js`
- Create: `src/toggleKeyboard.js`
- Modify: `src/main.jsx` import and editor keydown capture
- Test: `tests/e2e/renderer.spec.mjs` in the toggle keyboard section

**Interfaces:**
- Consumes: a BlockNote editor and DOM KeyboardEvent.
- Produces: `handleToggleEnter(editor, event): boolean` for both `toggleListItem` and toggleable `heading` blocks.

- [ ] **Step 1: Add failing matrix tests**

For ordinary and heading toggles, verify a non-empty title Enter creates the first child. Separately verify an empty title Enter produces a paragraph, removes the toggle UI, focuses the paragraph, and retains any existing children.

- [ ] **Step 2: Verify RED**

```bash
npx playwright test tests/e2e/renderer.spec.mjs --grep "uses identical Enter behavior for ordinary and heading toggles|removes empty ordinary and heading toggles on Enter"
```

- [ ] **Step 3: Replace the heading-only helper**

Create `handleToggleEnter` with one `isToggleBlock` predicate covering `toggleListItem` and `heading` with `isToggleable: true`. Empty inline content calls `editor.updateBlock(block, { type: "paragraph", props: {} })`; non-empty content at the title end uses the existing first-child insertion path.

- [ ] **Step 4: Verify focused behavior and build**

Run the tests from Step 2, the adjacent Shift+Enter/alignment tests, and `npm run build`.
