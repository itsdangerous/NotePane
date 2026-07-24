const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

const DEFAULT_NOTE_TITLE = "Untitled";
const DEFAULT_APP_THEME = Object.freeze({
  mode: "light",
});
const DEFAULT_LAYOUT_MODE = "tabs";
const MIN_NOTE_BOUNDS_WIDTH = 320;
const MIN_NOTE_BOUNDS_HEIGHT = 260;
const DEFAULT_NOTE_THEME = Object.freeze({
  tabTextColor: null,
  tabTextOpacity: 1,
});
const DEFAULT_THEME = DEFAULT_NOTE_THEME;

class StickyStore {
  constructor(userDataPath) {
    this.directoryPath = userDataPath;
    this.filePath = path.join(userDataPath, "notes.json");
    this.state = {
      appTheme: DEFAULT_APP_THEME,
      layoutMode: DEFAULT_LAYOUT_MODE,
      notes: [],
    };
    this.load();
  }

  load() {
    if (!fs.existsSync(this.filePath)) {
      this.state = {
        appTheme: DEFAULT_APP_THEME,
        layoutMode: DEFAULT_LAYOUT_MODE,
        notes: [],
      };
      return;
    }

    try {
      const parsed = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
      const parsedObject = parsed && typeof parsed === "object" ? parsed : {};
      const notes = Array.isArray(parsed) ? parsed : parsedObject.notes;
      const rawNotes = Array.isArray(notes) ? notes : [];
      const version = Number.isFinite(parsedObject.version)
        ? parsedObject.version
        : 1;
      const resetLegacyAlwaysOnTop = version < 3;
      this.state = {
        appTheme: normalizeAppTheme(
          Array.isArray(parsed)
            ? inferLegacyAppTheme(rawNotes)
            : parsedObject.appTheme ?? inferLegacyAppTheme(rawNotes),
        ),
        layoutMode: normalizeLayoutMode(parsedObject.layoutMode),
        notes: rawNotes.map((note) =>
          normalizeNote(note, { resetLegacyAlwaysOnTop }),
        ),
      };
    } catch (error) {
      this.backupCorruptedFile();
      this.state = {
        appTheme: DEFAULT_APP_THEME,
        layoutMode: DEFAULT_LAYOUT_MODE,
        notes: [],
      };
      console.error("[NotePane] Failed to load notes.json:", error);
    }
  }

  getAppTheme() {
    return { ...this.state.appTheme };
  }

  updateAppTheme(appTheme) {
    this.state.appTheme = normalizeAppTheme(appTheme, this.state.appTheme);
    this.save();
    return this.getAppTheme();
  }

  getLayoutMode() {
    return this.state.layoutMode;
  }

  updateLayoutMode(layoutMode) {
    this.state.layoutMode = normalizeLayoutMode(layoutMode, this.state.layoutMode);
    this.save();
    return this.getLayoutMode();
  }

  listNotes() {
    return [...this.state.notes].sort((a, b) => a.createdAt - b.createdAt);
  }

  getNote(noteId) {
    return this.state.notes.find((note) => note.id === noteId) ?? null;
  }

  createNote(bounds, options = {}) {
    const now = Date.now();
    const seedDemoContent = Boolean(options?.seedDemoContent);
    const note = normalizeNote({
      id: randomUUID(),
      title: DEFAULT_NOTE_TITLE,
      blocksJSON: null,
      markdown: "",
      bounds,
      theme: DEFAULT_NOTE_THEME,
      alwaysOnTop: false,
      detached: false,
      seedDemoContent,
      createdAt: now,
      updatedAt: now,
    });

    this.state.notes.push(note);
    this.save();
    return note;
  }

  deleteNote(noteId) {
    const noteIndex = this.state.notes.findIndex((note) => note.id === noteId);
    if (noteIndex < 0 || this.state.notes.length <= 1) {
      return {
        deleted: false,
        notes: this.listNotes(),
        activeNote: this.getNote(noteId) ?? this.listNotes()[0] ?? null,
      };
    }

    const sortedNotes = this.listNotes();
    const sortedIndex = sortedNotes.findIndex((note) => note.id === noteId);
    const fallbackActiveNote =
      sortedNotes[sortedIndex + 1] ?? sortedNotes[sortedIndex - 1] ?? null;

    this.state.notes.splice(noteIndex, 1);
    this.save();

    return {
      deleted: true,
      notes: this.listNotes(),
      activeNote: fallbackActiveNote
        ? this.getNote(fallbackActiveNote.id)
        : this.listNotes()[0] ?? null,
    };
  }

  updateAppearance(noteId, appearance) {
    const note = this.getNote(noteId);
    if (!note) {
      return null;
    }

    if (Object.hasOwn(appearance ?? {}, "title")) {
      note.title = normalizeTitle(appearance.title, note.title);
    }

    if (Object.hasOwn(appearance ?? {}, "theme")) {
      note.theme = normalizeTheme(appearance.theme, note.theme);
    }

    note.updatedAt = Date.now();
    this.save();
    return note;
  }

  updateContent({ noteId, blocksJSON, markdown }) {
    const note = this.getNote(noteId);
    if (!note) {
      return null;
    }

    note.blocksJSON = normalizeBlocksJSON(blocksJSON);
    note.markdown = typeof markdown === "string" ? markdown : "";
    note.seedDemoContent = false;
    note.updatedAt = Date.now();
    this.save();
    return note;
  }

  updateBounds(noteId, bounds) {
    const note = this.getNote(noteId);
    if (!note || !bounds) {
      return null;
    }

    note.bounds = normalizeBounds(bounds, note.bounds);
    note.updatedAt = Date.now();
    this.save();
    return note;
  }

  setAlwaysOnTop(noteId, alwaysOnTop) {
    const note = this.getNote(noteId);
    if (!note) {
      return null;
    }

    note.alwaysOnTop = Boolean(alwaysOnTop);
    note.updatedAt = Date.now();
    this.save();
    return note;
  }

  setDetached(noteId, detached) {
    const note = this.getNote(noteId);
    if (!note) {
      return null;
    }

    note.detached = Boolean(detached);
    note.updatedAt = Date.now();
    this.save();
    return note;
  }

  save() {
    fs.mkdirSync(this.directoryPath, { recursive: true });
    const temporaryPath = `${this.filePath}.tmp`;
    fs.writeFileSync(
      temporaryPath,
      JSON.stringify(
        {
          version: 3,
          appTheme: this.state.appTheme,
          layoutMode: this.state.layoutMode,
          notes: this.state.notes,
        },
        null,
        2,
      ),
      "utf8",
    );
    fs.renameSync(temporaryPath, this.filePath);
  }

  backupCorruptedFile() {
    if (!fs.existsSync(this.filePath)) {
      return;
    }

    const timestamp = new Date().toISOString().replaceAll(":", "-");
    const backupPath = path.join(
      this.directoryPath,
      `notes-corrupted-${timestamp}.json`,
    );
    try {
      fs.copyFileSync(this.filePath, backupPath);
    } catch {
      // Best-effort backup only.
    }
  }
}

function normalizeNote(value, options = {}) {
  const now = Date.now();
  const source = value && typeof value === "object" ? value : {};
  const resetLegacyAlwaysOnTop = Boolean(options.resetLegacyAlwaysOnTop);
  return {
    id: typeof source.id === "string" && source.id ? source.id : randomUUID(),
    title: normalizeTitle(source.title),
    blocksJSON: normalizeBlocksJSON(source.blocksJSON),
    markdown: typeof source.markdown === "string" ? source.markdown : "",
    bounds: normalizeBounds(source.bounds, {
      width: 960,
      height: 720,
    }),
    theme: normalizeTheme(source.theme),
    alwaysOnTop: resetLegacyAlwaysOnTop
      ? false
      : typeof source.alwaysOnTop === "boolean"
        ? source.alwaysOnTop
        : false,
    detached: typeof source.detached === "boolean" ? source.detached : false,
    seedDemoContent: typeof source.seedDemoContent === "boolean"
      ? source.seedDemoContent
      : false,
    createdAt: Number.isFinite(source.createdAt) ? source.createdAt : now,
    updatedAt: Number.isFinite(source.updatedAt) ? source.updatedAt : now,
  };
}

function normalizeTitle(value, fallback = DEFAULT_NOTE_TITLE) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 80) : fallback;
}

function normalizeAppTheme(value, fallback = DEFAULT_APP_THEME) {
  const source = value && typeof value === "object" ? value : {};
  const fallbackTheme = fallback && typeof fallback === "object"
    ? fallback
    : DEFAULT_APP_THEME;

  if (source.mode === "dark" || source.mode === "light") {
    return {
      mode: source.mode,
    };
  }

  return {
    mode: fallbackTheme.mode === "dark" ? "dark" : "light",
  };
}

function inferLegacyAppTheme(rawNotes) {
  const legacyTheme = rawNotes
    .map((note) => note?.theme)
    .find((theme) => theme?.mode === "dark" || theme?.mode === "light");

  return normalizeAppTheme(legacyTheme);
}

function normalizeLayoutMode(value, fallback = DEFAULT_LAYOUT_MODE) {
  if (value === "sticky" || value === "tabs") {
    return value;
  }

  return fallback === "sticky" ? "sticky" : "tabs";
}

function normalizeTheme(value, fallback = DEFAULT_NOTE_THEME) {
  const source = value && typeof value === "object" ? value : {};
  const fallbackTheme = fallback && typeof fallback === "object"
    ? fallback
    : DEFAULT_NOTE_THEME;
  const migratedTabTextColor =
    normalizeHexColor(source.textColor, null) &&
    source.textColor.toLowerCase() !== "#211b0c"
      ? source.textColor.toLowerCase()
      : fallbackTheme.tabTextColor ?? DEFAULT_NOTE_THEME.tabTextColor;

  return {
    tabTextColor: normalizeHexColor(
      source.tabTextColor,
      migratedTabTextColor,
    ),
    tabTextOpacity: normalizeOpacity(
      source.tabTextOpacity,
      fallbackTheme.tabTextOpacity,
    ),
  };
}

function normalizeHexColor(value, fallback) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)
    ? value.toLowerCase()
    : fallback;
}

function normalizeOpacity(value, fallback = DEFAULT_NOTE_THEME.tabTextOpacity) {
  const hasExplicitValue =
    typeof value === "number" ||
    (typeof value === "string" && value.trim() !== "");
  const numericValue = hasExplicitValue ? Number(value) : NaN;
  if (Number.isFinite(numericValue)) {
    return clamp(numericValue, 0, 1);
  }

  const hasFallbackValue =
    typeof fallback === "number" ||
    (typeof fallback === "string" && fallback.trim() !== "");
  const fallbackValue = hasFallbackValue ? Number(fallback) : NaN;
  return Number.isFinite(fallbackValue)
    ? clamp(fallbackValue, 0, 1)
    : DEFAULT_NOTE_THEME.tabTextOpacity;
}

function normalizeBlocksJSON(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.length > 0 ? value : null;
  } catch {
    return null;
  }
}

function normalizeBounds(value, fallback) {
  const source = value && typeof value === "object" ? value : {};
  return {
    x: Number.isFinite(source.x) ? source.x : fallback.x,
    y: Number.isFinite(source.y) ? source.y : fallback.y,
    width: clamp(
      Number.isFinite(source.width) ? source.width : fallback.width,
      MIN_NOTE_BOUNDS_WIDTH,
      2400,
    ),
    height: clamp(
      Number.isFinite(source.height) ? source.height : fallback.height,
      MIN_NOTE_BOUNDS_HEIGHT,
      1800,
    ),
  };
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

module.exports = {
  StickyStore,
  DEFAULT_NOTE_TITLE,
  DEFAULT_APP_THEME,
  DEFAULT_LAYOUT_MODE,
  DEFAULT_NOTE_THEME,
  DEFAULT_THEME,
};
