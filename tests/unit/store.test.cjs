const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  StickyStore,
  DEFAULT_KEYBOARD_SHORTCUTS,
} = require("../../electron/store.cjs");

test("creates, saves, and reloads a local note", () => {
  const directory = createTemporaryDirectory();
  const store = new StickyStore(directory);
  const note = store.createNote({ width: 900, height: 700 });

  store.updateContent({
    noteId: note.id,
    blocksJSON: JSON.stringify([{ type: "paragraph", content: "Saved" }]),
    markdown: "Saved",
  });
  store.updateBounds(note.id, { x: 25, y: 50, width: 1000, height: 800 });
  store.updateAppearance(note.id, {
    title: "  Project note  ",
    titleManuallyEdited: true,
    theme: {
      mode: "dark",
      tabBackgroundColor: "#B9E4FF",
      tabTextColor: "#111111",
      tabTextOpacity: 0.42,
    },
  });
  store.updateAppTheme({ mode: "dark" });
  store.setAlwaysOnTop(note.id, false);

  const reloadedStore = new StickyStore(directory);
  const reloaded = reloadedStore.getNote(note.id);

  assert.equal(reloaded.title, "Project note");
  assert.equal(reloaded.titleManuallyEdited, true);
  assert.equal(reloaded.markdown, "Saved");
  assert.match(reloaded.blocksJSON, /Saved/);
  assert.deepEqual(reloaded.bounds, { x: 25, y: 50, width: 1000, height: 800 });
  assert.deepEqual(reloaded.theme, {
    tabTextColor: "#111111",
    tabTextOpacity: 0.42,
  });
  assert.deepEqual(reloadedStore.getAppTheme(), {
    mode: "dark",
  });
  assert.equal(reloadedStore.getLayoutMode(), "tabs");
  assert.equal(reloaded.alwaysOnTop, false);
  assert.equal(reloaded.detached, false);
  assert.equal(reloaded.seedDemoContent, false);
});

test("creates a note with an optional initial theme", () => {
  const directory = createTemporaryDirectory();
  const store = new StickyStore(directory);
  const note = store.createNote(
    { width: 900, height: 700 },
    {
      theme: {
        tabTextColor: "#ffd7e8",
        tabTextOpacity: 1,
      },
    },
  );

  assert.deepEqual(note.theme, {
    tabTextColor: "#ffd7e8",
    tabTextOpacity: 1,
  });
  assert.deepEqual(new StickyStore(directory).getNote(note.id).theme, {
    tabTextColor: "#ffd7e8",
    tabTextOpacity: 1,
  });
});

test("marks only explicitly seeded notes for demo content", () => {
  const directory = createTemporaryDirectory();
  const store = new StickyStore(directory);
  const initialNote = store.createNote(
    { width: 900, height: 700 },
    { seedDemoContent: true },
  );
  const laterNote = store.createNote({ width: 900, height: 700 });

  assert.equal(initialNote.seedDemoContent, true);
  assert.equal(laterNote.seedDemoContent, false);
  assert.equal(store.getNote(initialNote.id).seedDemoContent, true);
  assert.equal(store.getNote(laterNote.id).seedDemoContent, false);

  store.updateContent({
    noteId: initialNote.id,
    blocksJSON: JSON.stringify([{ type: "paragraph", content: "Edited" }]),
    markdown: "Edited",
  });

  assert.equal(store.getNote(initialNote.id).seedDemoContent, false);
});

test("reorders notes without changing creation timestamps", () => {
  const directory = createTemporaryDirectory();
  const store = new StickyStore(directory);
  const firstNote = store.createNote({ width: 900, height: 700 });
  const secondNote = store.createNote({ width: 900, height: 700 });
  const thirdNote = store.createNote({ width: 900, height: 700 });

  const originalCreatedAt = new Map(
    store.listNotes().map((note) => [note.id, note.createdAt]),
  );
  const reordered = store.reorderNotes([
    thirdNote.id,
    firstNote.id,
    secondNote.id,
  ]);

  assert.deepEqual(reordered.notes.map((note) => note.id), [
    thirdNote.id,
    firstNote.id,
    secondNote.id,
  ]);
  assert.deepEqual(new StickyStore(directory).listNotes().map((note) => note.id), [
    thirdNote.id,
    firstNote.id,
    secondNote.id,
  ]);
  assert.deepEqual(
    new StickyStore(directory).listNotes().map((note) => note.createdAt),
    [thirdNote.id, firstNote.id, secondNote.id].map((noteId) =>
      originalCreatedAt.get(noteId),
    ),
  );
});

test("normalizes invalid blocks JSON and clamps window bounds", () => {
  const directory = createTemporaryDirectory();
  const store = new StickyStore(directory);
  const note = store.createNote({ width: 10, height: 10 });

  assert.equal(note.bounds.width, 320);
  assert.equal(note.bounds.height, 260);

  store.updateContent({
    noteId: note.id,
    blocksJSON: "not-json",
    markdown: "Fallback",
  });

  assert.equal(store.getNote(note.id).blocksJSON, null);
  assert.equal(store.getNote(note.id).markdown, "Fallback");

  store.updateAppearance(note.id, {
    title: "",
    theme: {
      mode: "solarized",
      tabBackgroundColor: "yellow",
      tabTextColor: "black",
      tabTextOpacity: 5,
    },
  });

  assert.equal(store.getNote(note.id).title, "Fallback");
  assert.equal(store.getNote(note.id).titleManuallyEdited, false);
  assert.deepEqual(store.getNote(note.id).theme, {
    tabTextColor: null,
    tabTextOpacity: 1,
  });

  store.updateAppTheme({ mode: "solarized" });
  assert.deepEqual(store.getAppTheme(), {
    mode: "light",
  });
});

test("derives note titles from content until the title is manually edited", () => {
  const directory = createTemporaryDirectory();
  const store = new StickyStore(directory);
  const note = store.createNote({ width: 900, height: 700 });
  const longTitle = "Automatic title should be sliced after the configured title length";

  assert.equal(note.title, "Untitled");
  assert.equal(note.titleManuallyEdited, false);

  store.updateContent({
    noteId: note.id,
    blocksJSON: JSON.stringify([
      { type: "paragraph" },
      { type: "heading", content: longTitle },
    ]),
    markdown: "",
  });
  assert.equal(store.getNote(note.id).title, longTitle.slice(0, 48));

  store.updateContent({
    noteId: note.id,
    blocksJSON: JSON.stringify([{ type: "paragraph" }]),
    markdown: "",
  });
  assert.equal(store.getNote(note.id).title, "Untitled");

  store.updateAppearance(note.id, {
    title: "Manual title",
    titleManuallyEdited: true,
    theme: {},
  });
  store.updateContent({
    noteId: note.id,
    blocksJSON: JSON.stringify([{ type: "paragraph", content: "Changed body" }]),
    markdown: "Changed body",
  });
  assert.equal(store.getNote(note.id).title, "Manual title");
  assert.equal(store.getNote(note.id).titleManuallyEdited, true);

  store.updateAppearance(note.id, {
    title: "   ",
    titleManuallyEdited: true,
    theme: {},
  });
  assert.equal(store.getNote(note.id).title, "Manual title");
});

test("updates the global app theme from dark back to light", () => {
  const directory = createTemporaryDirectory();
  const store = new StickyStore(directory);

  assert.deepEqual(store.updateAppTheme({ mode: "dark" }), {
    mode: "dark",
  });
  assert.deepEqual(store.updateAppTheme({ mode: "light" }), {
    mode: "light",
  });

  const reloadedStore = new StickyStore(directory);

  assert.deepEqual(reloadedStore.getAppTheme(), {
    mode: "light",
  });
});

test("updates and persists the global layout mode", () => {
  const directory = createTemporaryDirectory();
  const store = new StickyStore(directory);

  assert.equal(store.getLayoutMode(), "tabs");
  assert.equal(store.updateLayoutMode("sticky"), "sticky");
  assert.equal(store.updateLayoutMode("invalid"), "sticky");
  assert.equal(store.updateLayoutMode("tabs"), "tabs");

  const reloadedStore = new StickyStore(directory);

  assert.equal(reloadedStore.getLayoutMode(), "tabs");
});

test("detaches and reattaches notes for tab/window workflows", () => {
  const directory = createTemporaryDirectory();
  const store = new StickyStore(directory);
  const note = store.createNote({ width: 900, height: 700 });

  assert.equal(note.detached, false);
  assert.equal(store.setDetached(note.id, true).detached, true);
  assert.equal(new StickyStore(directory).getNote(note.id).detached, true);
  assert.equal(store.setDetached(note.id, false).detached, false);
});

test("keeps editor typography global instead of updating per note appearance", () => {
  const directory = createTemporaryDirectory();
  const store = new StickyStore(directory);
  const firstNote = store.createNote({ width: 900, height: 700 });
  const secondNote = store.createNote({ width: 900, height: 700 });

  assert.equal(firstNote.editorFontScale, 1);
  assert.equal(secondNote.editorFontScale, 1);
  assert.equal(firstNote.editorFontFamily, "system");
  assert.equal(secondNote.editorFontFamily, "system");

  store.updateAppearance(firstNote.id, {
    editorFontScale: 9,
    editorFontFamily: "local:Pretendard",
  });
  store.updateAppearance(secondNote.id, {
    editorFontScale: 0.38,
    editorFontFamily: "garamond",
  });

  const reloadedStore = new StickyStore(directory);

  assert.equal(reloadedStore.getNote(firstNote.id).editorFontScale, 1);
  assert.equal(reloadedStore.getNote(secondNote.id).editorFontScale, 1);
  assert.equal(reloadedStore.getNote(firstNote.id).editorFontFamily, "system");
  assert.equal(reloadedStore.getNote(secondNote.id).editorFontFamily, "system");
});

test("updates editor preferences and applies them to new notes", () => {
  const directory = createTemporaryDirectory();
  const store = new StickyStore(directory);

  assert.deepEqual(store.getEditorPreferences(), {
    editorFontScale: 1,
    editorFontFamily: "system",
    showTableOfContents: false,
    keyboardShortcuts: DEFAULT_KEYBOARD_SHORTCUTS,
  });

  const keyboardShortcuts = {
    ...DEFAULT_KEYBOARD_SHORTCUTS,
    focusEditor: "Mod+Shift+F",
    toggleSidebar: "Mod+Shift+B",
  };

  assert.deepEqual(store.updateEditorPreferences({
    editorFontScale: 1.5,
    editorFontFamily: "local:Pretendard",
    showTableOfContents: true,
    keyboardShortcuts,
  }), {
    editorFontScale: 1.5,
    editorFontFamily: "local:Pretendard",
    showTableOfContents: true,
    keyboardShortcuts,
  });

  const note = store.createNote({ width: 900, height: 700 });
  assert.equal(note.editorFontScale, 1.5);
  assert.equal(note.editorFontFamily, "local:Pretendard");

  const reloadedStore = new StickyStore(directory);
  assert.deepEqual(reloadedStore.getEditorPreferences(), {
    editorFontScale: 1.5,
    editorFontFamily: "local:Pretendard",
    showTableOfContents: true,
    keyboardShortcuts,
  });
});

test("migrates legacy default sidebar shortcut away from Mod+B", () => {
  const legacyDirectory = createTemporaryDirectory();
  fs.mkdirSync(legacyDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(legacyDirectory, "notes.json"),
    JSON.stringify({
      version: 7,
      editorPreferences: {
        editorFontScale: 1,
        editorFontFamily: "system",
        showTableOfContents: false,
        keyboardShortcuts: {
          ...DEFAULT_KEYBOARD_SHORTCUTS,
          focusEditor: "Mod+Shift+F",
          toggleSidebar: "Mod+B",
        },
      },
      notes: [],
    }),
    "utf8",
  );

  const legacyStore = new StickyStore(legacyDirectory);
  const legacyShortcuts = legacyStore.getEditorPreferences().keyboardShortcuts;
  assert.equal(legacyShortcuts.focusEditor, "Mod+Shift+F");
  assert.equal(legacyShortcuts.toggleSidebar, "Mod+Shift+B");

  const currentDirectory = createTemporaryDirectory();
  fs.mkdirSync(currentDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(currentDirectory, "notes.json"),
    JSON.stringify({
      version: 8,
      editorPreferences: {
        editorFontScale: 1,
        editorFontFamily: "system",
        showTableOfContents: false,
        keyboardShortcuts: {
          ...DEFAULT_KEYBOARD_SHORTCUTS,
          toggleSidebar: "Mod+B",
        },
      },
      notes: [],
    }),
    "utf8",
  );

  const currentStore = new StickyStore(currentDirectory);
  assert.equal(
    currentStore.getEditorPreferences().keyboardShortcuts.toggleSidebar,
    "Mod+B",
  );
});

test("migrates legacy always-on-top default to false", () => {
  const directory = createTemporaryDirectory();
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(
    path.join(directory, "notes.json"),
    JSON.stringify({
      version: 2,
      notes: [
        {
          id: "legacy-note",
          title: "Legacy",
          markdown: "",
          blocksJSON: null,
          bounds: { width: 900, height: 700 },
          theme: {},
          alwaysOnTop: true,
          createdAt: 1,
          updatedAt: 1,
        },
      ],
    }),
    "utf8",
  );

  const store = new StickyStore(directory);

  assert.equal(store.getNote("legacy-note").alwaysOnTop, false);
});

test("migrates legacy note text color to sidebar tab accent only", () => {
  const directory = createTemporaryDirectory();
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(
    path.join(directory, "notes.json"),
    JSON.stringify({
      notes: [
        {
          id: "legacy-note",
          title: "Legacy",
          markdown: "",
          blocksJSON: null,
          bounds: { width: 900, height: 700 },
          theme: {
            mode: "dark",
            backgroundColor: "#B9E4FF",
            backgroundOpacity: 0.55,
            textColor: "#111111",
          },
          createdAt: 1,
          updatedAt: 1,
        },
      ],
    }),
    "utf8",
  );

  const legacyNote = new StickyStore(directory).getNote("legacy-note");

  assert.deepEqual(legacyNote.theme, {
    tabTextColor: "#111111",
    tabTextOpacity: 1,
  });
});

test("migrates legacy per-note mode to global app theme", () => {
  const directory = createTemporaryDirectory();
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(
    path.join(directory, "notes.json"),
    JSON.stringify({
      notes: [
        {
          id: "legacy-note",
          title: "Legacy",
          markdown: "",
          blocksJSON: null,
          bounds: { width: 900, height: 700 },
          theme: {
            mode: "dark",
            tabTextColor: "#ffffff",
          },
          createdAt: 1,
          updatedAt: 1,
        },
      ],
    }),
    "utf8",
  );

  const store = new StickyStore(directory);

  assert.deepEqual(store.getAppTheme(), {
    mode: "dark",
  });
  assert.deepEqual(store.getNote("legacy-note").theme, {
    tabTextColor: "#ffffff",
    tabTextOpacity: 1,
  });
});

test("moves notes to trash, restores them, and preserves at least one session", () => {
  const directory = createTemporaryDirectory();
  const store = new StickyStore(directory);
  const firstNote = store.createNote({ width: 900, height: 700 });
  const secondNote = store.createNote({ width: 900, height: 700 });

  const deleted = store.deleteNote(firstNote.id);

  assert.equal(deleted.deleted, true);
  assert.equal(deleted.activeNote.id, secondNote.id);
  assert.deepEqual(store.listNotes().map((note) => note.id), [secondNote.id]);
  assert.equal(store.getNote(firstNote.id), null);
  assert.deepEqual(store.listTrash().map((note) => note.id), [firstNote.id]);
  assert.equal(Number.isFinite(store.listTrash()[0].trashedAt), true);

  const blocked = store.deleteNote(secondNote.id);

  assert.equal(blocked.deleted, false);
  assert.deepEqual(store.listNotes().map((note) => note.id), [secondNote.id]);
  assert.deepEqual(store.listTrash().map((note) => note.id), [firstNote.id]);

  const restored = store.restoreNote(firstNote.id);

  assert.equal(restored.restored, true);
  assert.equal(restored.activeNote.id, firstNote.id);
  assert.equal(restored.note.trashedAt, null);
  assert.deepEqual(store.listNotes().map((note) => note.id), [
    firstNote.id,
    secondNote.id,
  ]);
  assert.deepEqual(store.listTrash(), []);

  const deletedAgain = store.deleteNote(firstNote.id);
  const purged = store.purgeNote(firstNote.id);

  assert.equal(deletedAgain.deleted, true);
  assert.equal(purged.deleted, true);
  assert.deepEqual(store.listTrash(), []);
  assert.deepEqual(store.listNotes().map((note) => note.id), [secondNote.id]);
  assert.equal(store.restoreNote(firstNote.id).restored, false);
});

test("backs up a corrupted notes file and starts with an empty state", () => {
  const directory = createTemporaryDirectory();
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "notes.json"), "{broken", "utf8");

  const originalConsoleError = console.error;
  let store;
  try {
    console.error = () => {};
    store = new StickyStore(directory);
  } finally {
    console.error = originalConsoleError;
  }
  const backups = fs
    .readdirSync(directory)
    .filter((fileName) => fileName.startsWith("notes-corrupted-"));

  assert.deepEqual(store.listNotes(), []);
  assert.equal(backups.length, 1);
});

function createTemporaryDirectory() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "notepane-store-"));
}
