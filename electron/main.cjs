const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const { fileURLToPath } = require("url");
const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  shell,
  dialog,
  nativeImage,
  screen,
} = require("electron");
const { StickyStore } = require("./store.cjs");

const APP_NAME = "NotePane";
const execFileAsync = promisify(execFile);
const ICON_PNG_PATH = path.join(__dirname, "..", "build", "icon.png");
const TABS_MIN_WIDTH = 640;
const TABS_MIN_HEIGHT = 500;
const STICKY_WINDOW_WIDTH = 420;
const STICKY_WINDOW_HEIGHT = 340;
const STICKY_MIN_WIDTH = 320;
const STICKY_MIN_HEIGHT = 260;
const STICKY_WINDOW_GAP = 18;
const STICKY_WINDOW_MARGIN = 28;
const TRAFFIC_LIGHT_X = 14;
const TABS_TRAFFIC_LIGHT_Y = 15;
const STICKY_TRAFFIC_LIGHT_Y = 10;
const STICKY_PASTEL_PALETTE = [
  "#fff2b8",
  "#ffd7e8",
  "#dff4d7",
  "#d9efff",
  "#eadcff",
  "#ffe4ca",
];
const windows = new Map();
const devServerUrl = process.env.VITE_DEV_SERVER_URL;
const userDataDirOverride = process.env.BLOCKNOTE_STICKY_USER_DATA_DIR;
const exportDirectoryOverride = process.env.BLOCKNOTE_STICKY_EXPORT_DIR;

let store;
let quitting = false;
const manuallyClosedStickyNoteIds = new Set();
let installedFontsPromise = null;

if (userDataDirOverride) {
  app.setPath("userData", userDataDirOverride);
}

function createWindow(note, options = {}) {
  const isPrimary = Boolean(options.primary);
  const trafficLightPosition = resolveTrafficLightPosition(isPrimary);
  const visibleBounds = normalizeWindowBounds(note.bounds, {
    minWidth: isPrimary ? TABS_MIN_WIDTH : STICKY_MIN_WIDTH,
    minHeight: isPrimary ? TABS_MIN_HEIGHT : STICKY_MIN_HEIGHT,
  });
  const window = new BrowserWindow({
    ...visibleBounds,
    minWidth: isPrimary ? TABS_MIN_WIDTH : STICKY_MIN_WIDTH,
    minHeight: isPrimary ? TABS_MIN_HEIGHT : STICKY_MIN_HEIGHT,
    title: note.title,
    frame: false,
    titleBarStyle: "hidden",
    trafficLightPosition,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: true,
    alwaysOnTop: note.alwaysOnTop,
    icon: ICON_PNG_PATH,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  window.setWindowButtonVisibility?.(true);
  applyWindowChrome(window, isPrimary);

  windows.set(window.id, {
    window,
    noteId: note.id,
    primary: Boolean(options.primary),
  });

  window.once("ready-to-show", () => {
    window.show();
    window.focus();
  });

  window.on("moved", () => persistWindowBounds(window));
  window.on("resized", () => persistWindowBounds(window));
  window.on("close", () => persistWindowBounds(window));
  window.on("closed", () => {
    const closedEntry = windows.get(window.id);
    windows.delete(window.id);
    if (
      !quitting &&
      store?.getLayoutMode?.() === "sticky" &&
      closedEntry?.noteId &&
      !closedEntry.closingProgrammatically
    ) {
      manuallyClosedStickyNoteIds.add(closedEntry.noteId);
    }
    if (restoreTabsModeAfterLastStickyWindowClosed(closedEntry?.noteId)) {
      return;
    }
    if (!quitting && windows.size === 0) {
      app.dock?.show();
    }
  });

  if (devServerUrl) {
    window.loadURL(`${devServerUrl}?noteId=${encodeURIComponent(note.id)}`);
  } else {
    window.loadFile(path.join(__dirname, "..", "dist", "index.html"), {
      query: { noteId: note.id },
    });
  }

  return window;
}

function resolveTrafficLightPosition(isPrimary) {
  return {
    x: TRAFFIC_LIGHT_X,
    y: isPrimary ? TABS_TRAFFIC_LIGHT_Y : STICKY_TRAFFIC_LIGHT_Y,
  };
}

function applyTrafficLightPosition(window, isPrimary) {
  const trafficLightPosition = resolveTrafficLightPosition(Boolean(isPrimary));
  window.__notepaneTrafficLightPosition = trafficLightPosition;
  window.setWindowButtonPosition?.(trafficLightPosition);
  window.setTrafficLightPosition?.(trafficLightPosition);
}

function applyWindowChrome(window, isPrimary) {
  window.setHasShadow?.(true);
  applyTrafficLightPosition(window, isPrimary);
}

function createNewNoteWindow() {
  const layoutMode = store.getLayoutMode();
  const note = createNoteForLayoutMode(nextWindowBounds(), layoutMode);
  if (layoutMode === "sticky") {
    return createWindow(note);
  }

  const window = ensureTabsWindow(note.id);
  broadcastNotesChanged({ activeNote: note });
  return window;
}

function createNoteForLayoutMode(bounds, layoutMode = store.getLayoutMode()) {
  const options = {};
  if (layoutMode === "sticky") {
    options.theme = createDefaultStickyTheme(store.listNotes().length);
  }

  return store.createNote(bounds, options);
}

function createDefaultStickyTheme(noteIndex = 0) {
  const accentColor =
    STICKY_PASTEL_PALETTE[
      Math.abs(Number.isFinite(noteIndex) ? noteIndex : 0) %
        STICKY_PASTEL_PALETTE.length
    ];

  return {
    tabTextColor: accentColor,
    tabTextOpacity: 1,
  };
}

function showAllNotes() {
  manuallyClosedStickyNoteIds.clear();
  syncWindowsForLayoutMode(undefined, { reopenClosedStickyWindows: true });

  for (const { window } of windows.values()) {
    revealWindow(window);
  }
}

function focusNextWindow() {
  const liveWindows = [...windows.values()]
    .map((entry) => entry.window)
    .filter((window) => !window.isDestroyed());

  if (liveWindows.length === 0) {
    return;
  }

  const focused = BrowserWindow.getFocusedWindow();
  const index = focused ? liveWindows.indexOf(focused) : -1;
  liveWindows[(index + 1) % liveWindows.length].focus();
}

function closeFocusedTabOrWindow() {
  const window = getCommandTargetWindow();
  if (!window) {
    return;
  }

  const entry = windows.get(window.id);
  if (store.getLayoutMode() !== "tabs" || !entry?.primary) {
    window.close();
    return;
  }

  closeTabSession(entry.noteId);
}

function closeTabSession(noteId) {
  const dockedNotes = store.listNotes().filter((note) => !note.detached);
  if (dockedNotes.length <= 1) {
    return;
  }

  const currentIndex = dockedNotes.findIndex((note) => note.id === noteId);
  if (currentIndex < 0) {
    return;
  }

  const fallbackNote =
    dockedNotes[currentIndex + 1] ?? dockedNotes[currentIndex - 1] ?? null;
  const result = store.deleteNote(noteId);
  const nextActiveNote =
    (fallbackNote ? store.getNote(fallbackNote.id) : null) ??
    result.activeNote ??
    getMainTabsNote();

  const primaryEntry = getPrimaryEntry();
  if (primaryEntry && nextActiveNote) {
    primaryEntry.noteId = nextActiveNote.id;
    primaryEntry.window.setTitle(nextActiveNote.title);
  }

  for (const entry of getEntriesForNote(noteId)) {
    closeWindowEntry(entry);
  }

  syncWindowsForLayoutMode(nextActiveNote?.id);
  broadcastNotesChanged({ activeNote: nextActiveNote });
}

function toggleFocusedAlwaysOnTop() {
  const window = getCommandTargetWindow();
  if (!window) {
    return;
  }

  const nextValue = !window.isAlwaysOnTop();
  window.setAlwaysOnTop(nextValue);

  const entry = windows.get(window.id);
  if (entry) {
    const updatedNote = store.setAlwaysOnTop(entry.noteId, nextValue);
    if (updatedNote) {
      broadcastNotesChanged({ activeNote: updatedNote });
    }
  }
}

function openPreferences() {
  const window = getCommandTargetWindow();

  if (!window || window.isDestroyed()) {
    return;
  }

  window.show();
  window.focus();
  window.webContents.send("preferences:open");
}

function getCommandTargetWindow() {
  return (
    BrowserWindow.getFocusedWindow() ??
    getPrimaryEntry()?.window ??
    BrowserWindow.getAllWindows().find((candidate) => !candidate.isDestroyed()) ??
    null
  );
}

function broadcastAppTheme(appTheme) {
  for (const { window } of windows.values()) {
    if (!window.isDestroyed()) {
      window.webContents.send("app-theme:changed", appTheme);
    }
  }
}

function broadcastLayoutMode(layoutMode) {
  for (const { window } of windows.values()) {
    if (!window.isDestroyed()) {
      window.webContents.send("layout-mode:changed", layoutMode);
    }
  }
}

function broadcastEditorPreferences(editorPreferences) {
  for (const { window } of windows.values()) {
    if (!window.isDestroyed()) {
      window.webContents.send("editor-preferences:changed", editorPreferences);
    }
  }
}

function broadcastNotesChanged(payload = {}) {
  const notes = store.listNotes();
  const trash = store.listTrash();
  for (const entry of windows.values()) {
    const { window } = entry;
    if (!window.isDestroyed()) {
      const activeNote = resolveActiveNoteForWindow(entry, payload.activeNote);
      window.webContents.send("notes:changed", {
        notes,
        trash,
        activeNote,
      });
    }
  }
}

function resolveActiveNoteForWindow(entry, activeNote) {
  if (!activeNote?.id) {
    return null;
  }

  if (entry.primary || entry.noteId === activeNote.id) {
    return activeNote;
  }

  return null;
}

function getPrimaryEntry() {
  return [...windows.values()].find(
    (entry) => entry.primary && !entry.window.isDestroyed(),
  );
}

function getEntriesForNote(noteId) {
  return [...windows.values()].filter(
    (entry) => entry.noteId === noteId && !entry.window.isDestroyed(),
  );
}

function getMainTabsNote(fallbackNoteId) {
  const notes = store.listNotes();
  const dockedNotes = notes.filter((note) => !note.detached);
  return (
    dockedNotes.find((note) => note.id === fallbackNoteId) ??
    dockedNotes[0] ??
    notes[0] ??
    null
  );
}

function ensureTabsWindow(activeNoteId) {
  const note = getMainTabsNote(activeNoteId);
  if (!note) {
    return null;
  }

  const primaryEntry = getPrimaryEntry();
  if (primaryEntry) {
    primaryEntry.noteId = note.id;
    primaryEntry.window.setMinimumSize(TABS_MIN_WIDTH, TABS_MIN_HEIGHT);
    primaryEntry.window.setTitle(note.title);
    primaryEntry.window.webContents.send("notes:changed", {
      notes: store.listNotes(),
      trash: store.listTrash(),
      activeNote: note,
    });
    primaryEntry.window.show();
    return primaryEntry.window;
  }

  return createWindow(note, { primary: true });
}

function ensureWindowForNote(note) {
  const existing = getEntriesForNote(note.id)
    .find((entry) => !entry.primary);
  if (existing) {
    existing.window.setMinimumSize(STICKY_MIN_WIDTH, STICKY_MIN_HEIGHT);
    existing.window.setTitle(note.title);
    revealWindow(existing.window);
    return existing.window;
  }

  return createWindow(note);
}

function revealWindow(window) {
  if (!window || window.isDestroyed()) {
    return;
  }

  if (window.isMinimized()) {
    window.restore();
  }

  if (typeof window.showInactive === "function") {
    window.showInactive();
    return;
  }

  window.show();
}

function closeWindowEntry(entry) {
  if (!entry || entry.window.isDestroyed()) {
    return;
  }

  entry.closingProgrammatically = true;
  persistWindowBounds(entry.window);
  entry.window.close();
}

function restoreTabsModeAfterLastStickyWindowClosed(activeNoteId) {
  if (
    quitting ||
    windows.size !== 0 ||
    store?.getLayoutMode?.() !== "sticky"
  ) {
    return false;
  }

  const activeNote =
    (typeof activeNoteId === "string" ? store.getNote(activeNoteId) : null) ??
    getMainTabsNote();

  store.updateLayoutMode("tabs");
  manuallyClosedStickyNoteIds.clear();
  syncWindowsForLayoutMode(activeNote?.id);
  broadcastLayoutMode("tabs");
  broadcastNotesChanged({ activeNote });
  return true;
}

function syncWindowsForLayoutMode(activeNoteId, options = {}) {
  const notes = store.listNotes();
  const noteIds = new Set(notes.map((note) => note.id));
  const layoutMode = store.getLayoutMode();

  for (const entry of [...windows.values()]) {
    if (!noteIds.has(entry.noteId)) {
      closeWindowEntry(entry);
    }
  }
  for (const closedNoteId of [...manuallyClosedStickyNoteIds]) {
    if (!noteIds.has(closedNoteId)) {
      manuallyClosedStickyNoteIds.delete(closedNoteId);
    }
  }

  if (layoutMode === "sticky") {
    for (const entry of windows.values()) {
      entry.primary = false;
      entry.window.setMinimumSize(STICKY_MIN_WIDTH, STICKY_MIN_HEIGHT);
      applyWindowChrome(entry.window, false);
    }
    for (const note of notes) {
      if (
        manuallyClosedStickyNoteIds.has(note.id) &&
        !options.reopenClosedStickyWindows
      ) {
        continue;
      }
      ensureWindowForNote(note);
    }
    if (options.arrangeStickyWindows) {
      arrangeStickyWindows(notes);
    }
    return;
  }

  const primaryWindow = ensureTabsWindow(activeNoteId);
  const primaryId = primaryWindow?.id;
  const detachedIds = new Set(notes.filter((note) => note.detached).map((note) => note.id));

  for (const note of notes) {
    if (note.detached) {
      ensureWindowForNote(note);
    }
  }

  for (const entry of [...windows.values()]) {
    if (entry.window.id === primaryId) {
      entry.primary = true;
      applyWindowChrome(entry.window, true);
      continue;
    }

    const note = store.getNote(entry.noteId);
    const shouldRemainDetached = note && detachedIds.has(note.id);
    if (!shouldRemainDetached) {
      closeWindowEntry(entry);
    }
  }
}

function arrangeStickyWindows(notes) {
  const visibleNotes = notes.filter(
    (note) => !manuallyClosedStickyNoteIds.has(note.id),
  );
  if (visibleNotes.length === 0) {
    return;
  }

  const workArea = screen.getPrimaryDisplay().workArea;
  const availableWidth = Math.max(
    STICKY_WINDOW_WIDTH,
    workArea.width - STICKY_WINDOW_MARGIN * 2,
  );
  const columns = Math.max(
    1,
    Math.min(
      visibleNotes.length,
      Math.floor(
        (availableWidth + STICKY_WINDOW_GAP) /
          (STICKY_WINDOW_WIDTH + STICKY_WINDOW_GAP),
      ),
    ),
  );

  visibleNotes.forEach((note, index) => {
    const entry = getEntriesForNote(note.id).find((candidate) => !candidate.primary);
    if (!entry || entry.window.isDestroyed()) {
      return;
    }

    const row = Math.floor(index / columns);
    const column = index % columns;
    const bounds = {
      x: workArea.x +
        STICKY_WINDOW_MARGIN +
        column * (STICKY_WINDOW_WIDTH + STICKY_WINDOW_GAP),
      y: workArea.y +
        STICKY_WINDOW_MARGIN +
        row * (STICKY_WINDOW_HEIGHT + STICKY_WINDOW_GAP),
      width: STICKY_WINDOW_WIDTH,
      height: STICKY_WINDOW_HEIGHT,
    };

    entry.window.setBounds(bounds, true);
    store.updateBounds(note.id, bounds);
  });
}

function buildMenu() {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        {
          label: "Preferences",
          accelerator: "CommandOrControl+,",
          click: openPreferences,
        },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "File",
      submenu: [
        {
          label: "New Tab",
          accelerator: "CommandOrControl+T",
          click: createNewNoteWindow,
        },
        {
          label: "New Note",
          accelerator: "CommandOrControl+N",
          click: createNewNoteWindow,
        },
        { type: "separator" },
        {
          label: "Close Tab / Window",
          accelerator: "CommandOrControl+W",
          click: closeFocusedTabOrWindow,
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
      ],
    },
    {
      label: "Window",
      submenu: [
        {
          label: "Show All NotePanes",
          accelerator: "CommandOrControl+Shift+0",
          click: showAllNotes,
        },
        {
          label: "Cycle Through NotePanes",
          accelerator: "CommandOrControl+`",
          click: focusNextWindow,
        },
        {
          label: "Toggle Tabs / Sticky Mode",
          accelerator: "CommandOrControl+Shift+M",
          click: () => {
            const previousMode = store.getLayoutMode();
            const nextMode = previousMode === "tabs" ? "sticky" : "tabs";
            store.updateLayoutMode(nextMode);
            if (nextMode === "sticky") {
              manuallyClosedStickyNoteIds.clear();
            }
            syncWindowsForLayoutMode(undefined, {
              reopenClosedStickyWindows: nextMode === "sticky",
              arrangeStickyWindows: previousMode !== "sticky" && nextMode === "sticky",
            });
            broadcastLayoutMode(nextMode);
            broadcastNotesChanged();
          },
        },
        {
          label: "Toggle Always On Top",
          accelerator: "CommandOrControl+Shift+P",
          click: toggleFocusedAlwaysOnTop,
        },
        { type: "separator" },
        { role: "minimize" },
        { role: "front" },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function persistWindowBounds(window) {
  if (!window || window.isDestroyed()) {
    return;
  }

  const entry = windows.get(window.id);
  if (!entry) {
    return;
  }

  store.updateBounds(entry.noteId, window.getBounds());
}

function getNoteIdForWebContents(webContents) {
  const window = BrowserWindow.fromWebContents(webContents);
  if (!window) {
    return null;
  }

  return windows.get(window.id)?.noteId ?? null;
}

function installIpcHandlers() {
  ipcMain.handle("notes:get-current-id", (event) => {
    return getNoteIdForWebContents(event.sender);
  });

  ipcMain.handle("app-theme:get", () => {
    return store.getAppTheme();
  });

  ipcMain.handle("app-theme:update", (_event, payload) => {
    const appTheme = store.updateAppTheme(payload);
    broadcastAppTheme(appTheme);
    return appTheme;
  });

  ipcMain.handle("layout-mode:get", () => {
    return store.getLayoutMode();
  });

  ipcMain.handle("layout-mode:update", (_event, layoutMode) => {
    const previousLayoutMode = store.getLayoutMode();
    const nextLayoutMode = store.updateLayoutMode(layoutMode);
    if (nextLayoutMode === "sticky") {
      manuallyClosedStickyNoteIds.clear();
    }
    syncWindowsForLayoutMode(getNoteIdForWebContents(_event.sender), {
      reopenClosedStickyWindows: nextLayoutMode === "sticky",
      arrangeStickyWindows:
        previousLayoutMode !== "sticky" && nextLayoutMode === "sticky",
    });
    broadcastLayoutMode(nextLayoutMode);
    broadcastNotesChanged();
    return nextLayoutMode;
  });

  ipcMain.handle("editor-preferences:get", () => {
    return store.getEditorPreferences();
  });

  ipcMain.handle("editor-preferences:update", (_event, payload) => {
    const editorPreferences = store.updateEditorPreferences(payload);
    broadcastEditorPreferences(editorPreferences);
    return editorPreferences;
  });

  ipcMain.handle("notes:get", (event, noteId) => {
    const resolvedNoteId = noteId || getNoteIdForWebContents(event.sender);
    return resolvedNoteId ? store.getNote(resolvedNoteId) : null;
  });

  ipcMain.handle("notes:list", () => {
    return store.listNotes();
  });

  ipcMain.handle("trash:list", () => {
    return store.listTrash();
  });

  ipcMain.handle("notes:create", (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const layoutMode = store.getLayoutMode();
    const note = createNoteForLayoutMode(
      window?.getBounds() ?? nextWindowBounds(),
      layoutMode,
    );
    if (layoutMode === "sticky") {
      createWindow(note);
    }
    broadcastNotesChanged({ activeNote: note });
    return note;
  });

  ipcMain.handle("notes:delete", (event, noteId) => {
    if (typeof noteId !== "string") {
      return {
        deleted: false,
        notes: store.listNotes(),
        trash: store.listTrash(),
        activeNote: null,
      };
    }

    const currentNoteId = getNoteIdForWebContents(event.sender);
    const currentNoteBeforeDelete = currentNoteId
      ? store.getNote(currentNoteId)
      : null;
    const result = store.deleteNote(noteId);
    const nextActiveNote =
      noteId === currentNoteId
        ? result.activeNote
        : currentNoteBeforeDelete ?? result.activeNote;

    const window = BrowserWindow.fromWebContents(event.sender);
    if (window && nextActiveNote) {
      const entry = windows.get(window.id);
      if (entry?.primary && noteId === currentNoteId) {
        entry.noteId = nextActiveNote.id;
        window.setTitle(nextActiveNote.title);
      } else if (entry?.noteId !== noteId) {
        window.setTitle(nextActiveNote.title);
      }
    }

    for (const entry of getEntriesForNote(noteId)) {
      closeWindowEntry(entry);
    }
    syncWindowsForLayoutMode(nextActiveNote?.id);
    broadcastNotesChanged({ activeNote: nextActiveNote });

    return {
      ...result,
      activeNote: nextActiveNote,
    };
  });

  ipcMain.handle("trash:restore", (event, noteId) => {
    const result = typeof noteId === "string"
      ? store.restoreNote(noteId)
      : {
          restored: false,
          note: null,
          notes: store.listNotes(),
          trash: store.listTrash(),
          activeNote: null,
        };

    const restoredNote = result.restored ? result.note : null;
    const currentNoteId = getNoteIdForWebContents(event.sender);
    const activeNote =
      (currentNoteId ? store.getNote(currentNoteId) : null) ??
      getMainTabsNote() ??
      restoredNote;

    if (restoredNote) {
      syncWindowsForLayoutMode(activeNote?.id, {
        reopenClosedStickyWindows: true,
      });
    }
    broadcastNotesChanged({ activeNote });

    return {
      ...result,
      activeNote,
    };
  });

  ipcMain.handle("trash:purge", (event, noteId) => {
    const result = typeof noteId === "string"
      ? store.purgeNote(noteId)
      : {
          deleted: false,
          notes: store.listNotes(),
          trash: store.listTrash(),
        };
    const currentNoteId = getNoteIdForWebContents(event.sender);
    const activeNote =
      (currentNoteId ? store.getNote(currentNoteId) : null) ??
      getMainTabsNote();

    broadcastNotesChanged({ activeNote });

    return {
      ...result,
      activeNote,
    };
  });

  ipcMain.handle("notes:activate", (event, noteId) => {
    const note = typeof noteId === "string" ? store.getNote(noteId) : null;
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!note || !window) {
      return null;
    }

    const entry = windows.get(window.id);
    if (entry?.noteId) {
      store.updateBounds(entry.noteId, window.getBounds());
      entry.noteId = note.id;
    }

    window.setTitle(note.title);
    return note;
  });

  ipcMain.handle("notes:detach", (event, noteId) => {
    const note = typeof noteId === "string" ? store.setDetached(noteId, true) : null;
    if (!note) {
      return {
        notes: store.listNotes(),
        activeNote: null,
      };
    }

    createWindow(note);

    const currentWindow = BrowserWindow.fromWebContents(event.sender);
    const currentEntry = currentWindow ? windows.get(currentWindow.id) : null;
    const nextActiveNote = getMainTabsNote(currentEntry?.noteId);
    if (currentEntry?.primary && nextActiveNote) {
      currentEntry.noteId = nextActiveNote.id;
      currentWindow.setTitle(nextActiveNote.title);
    }

    broadcastNotesChanged({ activeNote: nextActiveNote });

    return {
      notes: store.listNotes(),
      activeNote: nextActiveNote,
    };
  });

  ipcMain.handle("notes:attach", (event, noteId) => {
    const note = typeof noteId === "string" ? store.setDetached(noteId, false) : null;
    if (!note) {
      return {
        notes: store.listNotes(),
        activeNote: null,
      };
    }

    const sourceWindow = BrowserWindow.fromWebContents(event.sender);
    const sourceEntry = sourceWindow ? windows.get(sourceWindow.id) : null;
    const primaryWindow = ensureTabsWindow(note.id);
    syncWindowsForLayoutMode(note.id);
    broadcastNotesChanged({ activeNote: note });

    if (sourceEntry && !sourceEntry.primary && sourceWindow && sourceWindow.id !== primaryWindow?.id) {
      closeWindowEntry(sourceEntry);
    }

    primaryWindow?.focus();

    return {
      notes: store.listNotes(),
      activeNote: note,
    };
  });

  ipcMain.handle("notes:save-content", (event, payload) => {
    const resolvedNoteId =
      payload?.noteId || getNoteIdForWebContents(event.sender);
    if (!resolvedNoteId) {
      return null;
    }

    const previousTitle = store.getNote(resolvedNoteId)?.title;
    const note = store.updateContent({
      noteId: resolvedNoteId,
      blocksJSON: payload?.blocksJSON,
      markdown: payload?.markdown,
    });

    if (note && note.title !== previousTitle) {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window && note.title) {
        window.setTitle(note.title);
      }
      broadcastNotesChanged({ activeNote: note });
    }

    return note;
  });

  ipcMain.handle("notes:update-appearance", (event, payload) => {
    const resolvedNoteId =
      payload?.noteId || getNoteIdForWebContents(event.sender);
    if (!resolvedNoteId) {
      return null;
    }

    const note = store.updateAppearance(resolvedNoteId, {
      title: payload?.title,
      titleManuallyEdited: payload?.titleManuallyEdited,
      theme: payload?.theme,
    });

    const window = BrowserWindow.fromWebContents(event.sender);
    if (window && note?.title) {
      window.setTitle(note.title);
    }

    if (note) {
      broadcastNotesChanged({ activeNote: note });
    }

    return note;
  });

  ipcMain.handle("export:note", async (event, payload) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) {
      throw new Error("No active window found for export.");
    }

    const title = sanitizeFileName(payload?.title, "notepane-note");
    const type = payload?.type ?? "pdf";
    if (type !== "pdf") {
      throw new Error("Only PDF export is supported.");
    }

    const buffer = await window.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      margins: { marginType: "none" },
    });
    return saveBuffer({
      window,
      buffer,
      defaultName: `${title}.pdf`,
      dialogTitle: "Export note as PDF",
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
  });

  ipcMain.handle("assets:save-url", async (event, payload) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const asset = await readAssetFromUrl(payload?.url);
    const defaultName = sanitizeFileName(
      payload?.defaultName,
      `image.${extensionForMime(asset.mimeType)}`,
    );

    return saveBuffer({
      window,
      buffer: asset.buffer,
      defaultName,
      dialogTitle: "Save image",
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp"] }],
    });
  });

  ipcMain.handle("fonts:list", async () => {
    return await listInstalledFonts();
  });

  ipcMain.handle("window:set-always-on-top", (event, alwaysOnTop) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) {
      return false;
    }

    window.setAlwaysOnTop(Boolean(alwaysOnTop));
    const noteId = getNoteIdForWebContents(event.sender);
    if (noteId) {
      const updatedNote = store.setAlwaysOnTop(noteId, Boolean(alwaysOnTop));
      if (updatedNote) {
        broadcastNotesChanged({ activeNote: updatedNote });
      }
    }
    return Boolean(alwaysOnTop);
  });

  ipcMain.handle("window:move-by", (event, payload) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window || (window.isMovable && !window.isMovable())) {
      return null;
    }

    const deltaX = Number(payload?.deltaX);
    const deltaY = Number(payload?.deltaY);
    if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) {
      return window.getBounds();
    }

    const [x, y] = window.getPosition();
    window.setPosition(
      Math.round(x + deltaX),
      Math.round(y + deltaY),
      false,
    );
    return window.getBounds();
  });
}

async function saveBuffer({ window, buffer, defaultName, dialogTitle, filters }) {
  if (exportDirectoryOverride) {
    fs.mkdirSync(exportDirectoryOverride, { recursive: true });
    const filePath = path.join(exportDirectoryOverride, defaultName);
    fs.writeFileSync(filePath, buffer);
    return { canceled: false, filePath };
  }

  const result = await dialog.showSaveDialog(window, {
    title: dialogTitle,
    defaultPath: defaultName,
    filters,
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true, filePath: null };
  }

  fs.writeFileSync(result.filePath, buffer);
  return { canceled: false, filePath: result.filePath };
}

async function readAssetFromUrl(url) {
  if (typeof url !== "string" || url.trim() === "") {
    throw new Error("Missing image URL.");
  }

  if (url.startsWith("data:")) {
    return readDataUrl(url);
  }

  if (url.startsWith("file:")) {
    return {
      buffer: fs.readFileSync(fileURLToPath(url)),
      mimeType: mimeForExtension(path.extname(fileURLToPath(url))),
    };
  }

  if (/^https?:\/\//i.test(url)) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Image download failed with HTTP ${response.status}.`);
    }

    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      mimeType: response.headers.get("content-type")?.split(";")[0] || "image/png",
    };
  }

  throw new Error("Unsupported image URL.");
}

function readDataUrl(dataUrl) {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) {
    throw new Error("Invalid data URL.");
  }

  const mimeType = match[1] || "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const data = match[3] || "";
  return {
    buffer: isBase64
      ? Buffer.from(data, "base64")
      : Buffer.from(decodeURIComponent(data), "utf8"),
    mimeType,
  };
}

function sanitizeFileName(value, fallback) {
  const source = typeof value === "string" && value.trim() ? value : fallback;
  return source
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || fallback;
}

function extensionForMime(mimeType) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    case "application/pdf":
      return "pdf";
    case "image/png":
    default:
      return "png";
  }
}

function mimeForExtension(extension) {
  switch (extension.toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".png":
    default:
      return "image/png";
  }
}

async function listInstalledFonts() {
  if (!installedFontsPromise) {
    installedFontsPromise = resolveInstalledFonts().catch(() => []);
  }

  return await installedFontsPromise;
}

async function resolveInstalledFonts() {
  if (process.platform === "darwin") {
    const { stdout } = await execFileAsync(
      "/usr/sbin/system_profiler",
      ["SPFontsDataType", "-json", "-detailLevel", "mini"],
      {
        timeout: 20_000,
        maxBuffer: 24 * 1024 * 1024,
      },
    );

    return extractFontFamiliesFromSystemProfiler(stdout);
  }

  return [];
}

function extractFontFamiliesFromSystemProfiler(stdout) {
  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return [];
  }

  const fontFamilies = new Set();
  const fontItems = Array.isArray(parsed?.SPFontsDataType)
    ? parsed.SPFontsDataType
    : [];

  for (const item of fontItems) {
    if (item?.enabled === "no" || item?.valid === "no") {
      continue;
    }

    const typefaces = Array.isArray(item?.typefaces) ? item.typefaces : [];
    for (const typeface of typefaces) {
      if (typeface?.enabled === "no" || typeface?.valid === "no") {
        continue;
      }

      const family = normalizeInstalledFontFamily(
        typeface?.family || typeface?.fullname || typeface?._name,
      );
      if (family) {
        fontFamilies.add(family);
      }
    }
  }

  return [...fontFamilies].sort((left, right) =>
    left.localeCompare(right, undefined, {
      sensitivity: "base",
      numeric: true,
    }),
  );
}

function normalizeInstalledFontFamily(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function nextWindowBounds() {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  const base = focusedWindow?.getBounds() ?? { width: 960, height: 720 };
  const offset = (windows.size % 8) * 28;
  return {
    x: Number.isFinite(base.x) ? base.x + offset : undefined,
    y: Number.isFinite(base.y) ? base.y - offset : undefined,
    width: base.width,
    height: base.height,
  };
}

function normalizeWindowBounds(bounds, options = {}) {
  const fallback = {
    width: 960,
    height: 720,
  };
  const width = clamp(
    bounds?.width ?? fallback.width,
    options.minWidth ?? TABS_MIN_WIDTH,
    2400,
  );
  const height = clamp(
    bounds?.height ?? fallback.height,
    options.minHeight ?? TABS_MIN_HEIGHT,
    1800,
  );
  const normalized = { width, height };

  if (Number.isFinite(bounds?.x) && Number.isFinite(bounds?.y)) {
    normalized.x = bounds.x;
    normalized.y = bounds.y;
  }

  return normalized;
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

app.whenReady().then(() => {
  app.name = APP_NAME;
  app.setName(APP_NAME);

  const dockIcon = nativeImage.createFromPath(ICON_PNG_PATH);
  if (process.platform === "darwin" && !dockIcon.isEmpty()) {
    app.dock?.setIcon(dockIcon);
  }

  store = new StickyStore(app.getPath("userData"));
  installIpcHandlers();
  buildMenu();

  if (store.listNotes().length === 0) {
    store.createNote(nextWindowBounds(), { seedDemoContent: true });
  }

  syncWindowsForLayoutMode();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      showAllNotes();
      if (BrowserWindow.getAllWindows().length === 0) {
        createNewNoteWindow();
      }
    }
  });
});

app.on("web-contents-created", (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
});

app.on("before-quit", () => {
  quitting = true;
  for (const { window } of windows.values()) {
    persistWindowBounds(window);
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
