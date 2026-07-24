import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const distIndexPath = path.join(projectRoot, "dist", "index.html");
const packagePath = path.join(projectRoot, "package.json");
const rendererPath = path.join(projectRoot, "src", "main.jsx");
const mainPath = path.join(projectRoot, "electron", "main.cjs");

assertFile(distIndexPath);
assertFile(packagePath);
assertFile(rendererPath);
assertFile(mainPath);

const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const requiredDependencies = [
  "@blocknote/react",
  "@blocknote/core",
  "@blocknote/mantine",
  "@blocknote/code-block",
  "electron",
];

for (const dependency of requiredDependencies) {
  if (
    !packageJson.dependencies?.[dependency] &&
    !packageJson.devDependencies?.[dependency]
  ) {
    fail(`Missing dependency: ${dependency}`);
  }
}

const renderer = fs.readFileSync(rendererPath, "utf8");
const requiredRendererSnippets = [
  "BlockNoteView",
  "portalElements={{ default: document.body }}",
  "data-testid=\"sticky-header\"",
  "data-testid=\"sticky-editor-surface\"",
  "splitCells: true",
  "cellBackgroundColor: true",
  "cellTextColor: true",
  "headers: true",
  "createCodeBlockSpec(codeBlockOptions)",
  "type: \"toggleListItem\"",
  "props: { isToggleable: true }",
  "aria-label=\"Session name\"",
  "aria-label=\"Preferences panel\"",
  "aria-label=\"Close preferences\"",
  "aria-label=\"Theme mode\"",
  "role=\"switch\"",
  "HeaderModeSwitch",
  "LayoutModeSwitch",
  "PreferencesPanel",
  "normalizeAppTheme",
  "normalizeLayoutMode",
  "handlePreferencesShortcut",
  "ariaLabel={isStickyVariant ? \"Sticky color\" : \"Tab text color\"}",
  "valueAriaTarget",
  "const valueAriaTarget = isStickyVariant ? \"sticky color\" : \"tab text color\";",
  "aria-label=\"Color brightness\"",
  "aria-label=\"Color opacity\"",
  "aria-label=\"Pastel colors\"",
  "aria-label=\"Sticky color\"",
  "STICKY_PASTEL_PALETTE",
  "aria-label=\"Eyedropper\"",
  "formatColorValues",
  "parseColorValue",
  "Copy ${entry.label}",
  "aria-label=\"Export note\"",
  "ShareIcon",
  "SidebarToggleIcon",
  "getSessionShortcutLabel",
  "handleSessionShortcut",
  "session-add-button",
  "className=\"session-shortcut\"",
  "aria-label={`Delete session",
  "role=\"tablist\"",
  "data-layout-mode={effectiveLayoutMode}",
  "onDetachNote",
  "onAttachNote",
  "CropDialog",
  "Download image",
];

for (const snippet of requiredRendererSnippets) {
  if (!renderer.includes(snippet)) {
    fail(`Renderer is missing expected BlockNote demo feature: ${snippet}`);
  }
}

const main = fs.readFileSync(mainPath, "utf8");
const requiredMainSnippets = [
  "alwaysOnTop",
  "transparent: true",
  "New Note",
  "Preferences",
  "CommandOrControl+,",
  "preferences:open",
  "app-theme:get",
  "app-theme:update",
  "app-theme:changed",
  "layout-mode:get",
  "layout-mode:update",
  "layout-mode:changed",
  "notes:detach",
  "notes:attach",
  "Toggle Always On Top",
  "notes:list",
  "notes:create",
  "notes:delete",
  "notes:activate",
  "notes:save-content",
  "notes:update-appearance",
  "printToPDF",
  "capturePage",
  "assets:save-url",
];

for (const snippet of requiredMainSnippets) {
  if (!main.includes(snippet)) {
    fail(`Electron main is missing expected sticky feature: ${snippet}`);
  }
}

console.log("NotePane verification passed");

function assertFile(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`Missing file: ${path.relative(projectRoot, filePath)}`);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
