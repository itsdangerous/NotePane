# NotePane Repository Instructions

## Priorities

- Keep the edit-feedback loop proportional to the risk of the change.
- During implementation, run the smallest test that can disprove the change.
- Preserve unrelated work in the dirty worktree and do not broaden the task to fix unrelated failures.
- Report the exact commands run and distinguish focused validation from full validation.

## Validation Policy

Do not run `npm run verify` reflexively after every edit. Use the following tiers.

### Tier 0: Documentation and agent instructions

Examples: Markdown documentation, comments, and `AGENTS.md`-only changes.

- Run `git diff --check`.
- Do not build or run application tests unless executable behavior also changed.

### Tier 1: Isolated presentation changes

Examples: localized CSS, copy, labels, icons, spacing, and non-interactive markup.

- Run `npm run build`.
- Run only the directly related Renderer E2E test when the visual or rendered contract matters.

### Tier 2: Scoped Renderer behavior

Examples: editor commands, clipboard behavior, BlockNote integrations, keyboard handling within one context, and React state changes.

- Run `npm run verify:quick` once after the implementation stabilizes.
- Run the smallest relevant Renderer test with `npx playwright test tests/e2e/renderer.spec.mjs --grep "<test name>"`.
- Include adjacent regression tests only when the changed handler or state is shared by them.

### Tier 3: Electron or cross-cutting behavior

Examples: persistence, IPC, application menus, window routing, sticky-session identity, export, dependencies, build configuration, schema migrations, or a shared global handler affecting multiple contexts.

- During iteration, run the relevant unit or E2E tests only.
- Run `npm run verify` once at the end, after focused checks pass.

### Full verification is also required when

- The user explicitly requests it.
- Preparing a release, commit, pull request, or handoff that claims the repository is fully verified.
- The impact boundary cannot be determined confidently.
- A change modifies test orchestration or verification scripts.

## Efficient Test Commands

- Fast build, unit, and distribution checks: `npm run verify:quick`
- Parallel browser-only suite: `npm run test:e2e:renderer`
- Serial Electron-only suite: `npm run test:e2e:electron`
- One Renderer contract: `npx playwright test tests/e2e/renderer.spec.mjs --grep "<test name>"`
- One Electron contract: `npx playwright test tests/e2e/electron.spec.mjs --grep "<test name>"`
- Full authoritative verification: `npm run verify`

Run focused tests while iterating. Do not rerun the full suite solely because a test locator or test-only assertion was corrected unless the production code changed again or the failure indicates a wider regression.

If an unrelated or apparently flaky test fails:

1. Inspect its error context.
2. Re-run that test in isolation once.
3. Do not change unrelated production code to make it pass.
4. Report whether the failure was reproduced, without describing a failed full run as a pass.

Do not increase sleeps, timeouts, or retries just to hide instability.

## Code Structure

- `src/main.jsx` is already large. Put new non-trivial editor, keyboard, clipboard, formatting, or persistence logic in a focused module when practical.
- Do not perform an unrelated large refactor as part of a small bug fix.
- Keep BlockNote/ProseMirror state and rendered DOM behavior aligned; validate user-visible selection, focus, clipboard, and window identity rather than only checking function calls.
- Prefer stable role, accessible-name, `data-testid`, or narrowly scoped locators in Playwright. Avoid broad selectors such as an unscoped `getByRole("toolbar")` when multiple toolbars can exist.

## Completion Report

After changing code, summarize the diff in a terminal-friendly form and include:

- What changed.
- Which focused checks ran.
- Whether `npm run verify` ran.
- Any skipped, flaky, or environment-limited checks.
