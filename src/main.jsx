import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import { codeBlockOptions } from "@blocknote/code-block";
import {
  BlockNoteSchema,
  createCodeBlockSpec,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { TextSelection } from "@tiptap/pm/state";
import {
  Check,
  Cog,
  Copy,
  Ellipsis,
  FileDown,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  PanelTopClose,
  Pin,
  Plus,
  RotateCcw,
  TableOfContents as TableOfContentsIcon,
  Trash2,
  X,
} from "lucide-react";
import "./styles.css";

const DEMO_BLOCKS = [
  {
    type: "heading",
    content: "Welcome to BlockNote!",
  },
  {
    type: "paragraph",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Blocks:",
        styles: { bold: true },
      },
    ],
  },
  {
    type: "paragraph",
    content: "Paragraph",
  },
  {
    type: "heading",
    content: "Heading",
  },
  {
    id: "toggle-heading",
    type: "heading",
    props: { isToggleable: true },
    content: "Toggle Heading",
    children: [
      {
        type: "paragraph",
        content: "This child block is hidden and shown by the toggle heading.",
      },
    ],
  },
  {
    type: "quote",
    content: "Quote",
  },
  {
    type: "bulletListItem",
    content: "Bullet List Item",
  },
  {
    type: "numberedListItem",
    content: "Numbered List Item",
  },
  {
    type: "checkListItem",
    content: "Check List Item",
  },
  {
    id: "toggle-list-item",
    type: "toggleListItem",
    content: "Toggle List Item",
    children: [
      {
        type: "paragraph",
        content: "This child block is hidden and shown by the toggle list.",
      },
    ],
  },
  {
    type: "codeBlock",
    props: { language: "javascript" },
    content: "console.log('Hello, world!');",
  },
  {
    type: "table",
    content: {
      type: "tableContent",
      rows: [
        {
          cells: ["Table Cell", "Table Cell", "Table Cell"],
        },
        {
          cells: ["Table Cell", "Table Cell", "Table Cell"],
        },
        {
          cells: ["Table Cell", "Table Cell", "Table Cell"],
        },
      ],
    },
  },
  {
    type: "file",
  },
  {
    type: "image",
    props: {
      url: "https://placehold.co/332x322.jpg",
      caption: "From https://placehold.co/332x322.jpg",
    },
  },
  {
    type: "video",
    props: {
      url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
      caption:
        "From https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
    },
  },
  {
    type: "audio",
    props: {
      url: "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
      caption:
        "From https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
    },
  },
  {
    type: "paragraph",
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Inline Content:",
        styles: { bold: true },
      },
    ],
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Styled Text",
        styles: {
          bold: true,
          italic: true,
          textColor: "red",
          backgroundColor: "blue",
        },
      },
      {
        type: "text",
        text: " ",
        styles: {},
      },
      {
        type: "link",
        content: "Link",
        href: "https://www.blocknotejs.org",
      },
    ],
  },
  {
    type: "paragraph",
  },
];

const EMPTY_BLOCKS = [
  {
    type: "paragraph",
  },
];

const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    codeBlock: createCodeBlockSpec(codeBlockOptions),
  },
});

const electronApi = window.blocknoteSticky;
const DEFAULT_TITLE = "Untitled";
const AUTO_TITLE_MAX_LENGTH = 48;
const DEFAULT_APP_THEME = {
  mode: "light",
};
const DEFAULT_LAYOUT_MODE = "tabs";
const DEFAULT_THEME = {
  tabTextColor: null,
  tabTextOpacity: 1,
};
const DEFAULT_EDITOR_FONT_SCALE = 1;
const EDITOR_FONT_SCALE_STEP = 0.08;
const MIN_EDITOR_FONT_SCALE = 0.38;
const MAX_EDITOR_FONT_SCALE = 9;
const BASE_EDITOR_FONT_SIZE_PX = 16;
const MIN_EDITOR_FONT_SIZE_PX = 6;
const MAX_EDITOR_FONT_SIZE_PX = 144;
const EDITOR_FONT_SIZE_PRESETS = [
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  18,
  20,
  22,
  24,
  26,
  28,
  32,
  36,
  40,
  48,
  56,
  64,
  72,
  84,
  96,
  120,
  144,
];
const DEFAULT_EDITOR_FONT_FAMILY = "system";
const DEFAULT_EDITOR_PREFERENCES = {
  editorFontScale: DEFAULT_EDITOR_FONT_SCALE,
  editorFontFamily: DEFAULT_EDITOR_FONT_FAMILY,
  showTableOfContents: false,
};
const LOCAL_FONT_VALUE_PREFIX = "local:";
const EDITOR_BUILTIN_FONT_FAMILY_OPTIONS = [
  {
    value: "system",
    label: "System",
    css: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
  },
  {
    value: "inter",
    label: "Inter",
    css: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
  },
  {
    value: "sf-pro",
    label: "SF Pro",
    css: '"SF Pro Text", -apple-system, BlinkMacSystemFont, sans-serif',
  },
  {
    value: "avenir",
    label: "Avenir",
    css: 'Avenir, "Avenir Next", -apple-system, BlinkMacSystemFont, sans-serif',
  },
  {
    value: "helvetica",
    label: "Helvetica",
    css: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  {
    value: "arial",
    label: "Arial",
    css: 'Arial, Helvetica, sans-serif',
  },
  {
    value: "verdana",
    label: "Verdana",
    css: 'Verdana, Geneva, sans-serif',
  },
  {
    value: "trebuchet",
    label: "Trebuchet",
    css: '"Trebuchet MS", Trebuchet, sans-serif',
  },
  {
    value: "serif",
    label: "Serif",
    css: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  },
  {
    value: "mono",
    label: "Mono",
    css: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  },
  {
    value: "rounded",
    label: "Rounded",
    css: '"SF Pro Rounded", ui-rounded, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
  },
  {
    value: "georgia",
    label: "Georgia",
    css: 'Georgia, Cambria, "Times New Roman", Times, serif',
  },
  {
    value: "palatino",
    label: "Palatino",
    css: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif',
  },
  {
    value: "garamond",
    label: "Garamond",
    css: 'Garamond, Baskerville, "Baskerville Old Face", Georgia, serif',
  },
  {
    value: "times",
    label: "Times",
    css: '"Times New Roman", Times, serif',
  },
  {
    value: "menlo",
    label: "Menlo",
    css: 'Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  },
  {
    value: "courier",
    label: "Courier",
    css: '"Courier New", Courier, monospace',
  },
];
const SESSION_TAB_ENTER_MS = 190;
const SESSION_TAB_EXIT_MS = 170;
const seenSessionTabIds = new Set();
let sessionTabAnimationsPrimed = false;
const MODE_TAB_TEXT_DEFAULTS = {
  light: {
    tabTextColor: "#37352f",
    tabTextOpacity: 1,
  },
  dark: {
    tabTextColor: "#f1f1ef",
    tabTextOpacity: 1,
  },
};
const SESSION_TAB_MODE_BASE_COLORS = {
  light: {
    active: "#f1f1ef",
    inactive: "#e7e7e4",
    hover: "#ededeb",
  },
  dark: {
    active: "#2a2a2a",
    inactive: "#202020",
    hover: "#252525",
  },
};
const SESSION_TAB_CONTRAST_TEXT = {
  dark: "#1f1f1f",
  light: "#fbfbfa",
};
const SESSION_TAB_DARK_MODE_TONE_MIX = 0.12;
const STICKY_PASTEL_PALETTE = [
  "#fff2b8",
  "#ffd7e8",
  "#dff4d7",
  "#d9efff",
  "#eadcff",
  "#ffe4ca",
];
const DEFAULT_STICKY_ACCENT_COLOR = STICKY_PASTEL_PALETTE[0];
const DEFAULT_CROP = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
const SIDEBAR_DEFAULT_WIDTH = 204;
const SIDEBAR_MIN_WIDTH = 156;
const SIDEBAR_MAX_WIDTH = 340;
const SIDEBAR_COLLAPSE_WIDTH = 124;
const SIDEBAR_COMPACT_WIDTH = 64;
const EXPORT_TOAST_TIMEOUT_MS = 2600;
const FONT_SIZE_TOAST_TIMEOUT_MS = 1400;

function App() {
  const [note, setNote] = useState(null);
  const [notes, setNotes] = useState([]);
  const [trashedNotes, setTrashedNotes] = useState([]);
  const [appTheme, setAppTheme] = useState(DEFAULT_APP_THEME);
  const [layoutMode, setLayoutMode] = useState(DEFAULT_LAYOUT_MODE);
  const [installedFontFamilies, setInstalledFontFamilies] = useState([]);
  const [editorPreferences, setEditorPreferences] = useState(
    DEFAULT_EDITOR_PREFERENCES,
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);

  useEffect(() => {
    let cancelled = false;

    async function loadNote() {
      const noteId = new URLSearchParams(window.location.search).get("noteId");

      if (!electronApi) {
        const previewNote = {
          id: noteId || "browser-preview",
          title: DEFAULT_TITLE,
          titleManuallyEdited: false,
          blocksJSON: null,
          markdown: "",
          theme: DEFAULT_THEME,
          seedDemoContent: true,
          editorFontScale: DEFAULT_EDITOR_FONT_SCALE,
          editorFontFamily: DEFAULT_EDITOR_FONT_FAMILY,
          detached: false,
          trashedAt: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setNotes([previewNote]);
        setTrashedNotes([]);
        setNote(previewNote);
        setLayoutMode(DEFAULT_LAYOUT_MODE);
        return;
      }

      const resolvedNoteId = noteId || await electronApi.getCurrentNoteId();
      const [
        loadedNotes,
        loadedAppTheme,
        loadedLayoutMode,
        loadedEditorPreferences,
        loadedTrashedNotes,
      ] = await Promise.all([
        electronApi.listNotes(),
        electronApi.getAppTheme?.(),
        electronApi.getLayoutMode?.(),
        electronApi.getEditorPreferences?.(),
        electronApi.listTrash?.(),
      ]);
      const loadedNote = resolvedNoteId
        ? await electronApi.getNote(resolvedNoteId)
        : null;

      if (!cancelled) {
        setAppTheme(normalizeAppTheme(loadedAppTheme));
        setLayoutMode(normalizeLayoutMode(loadedLayoutMode));
        setEditorPreferences(normalizeEditorPreferences(loadedEditorPreferences));
        const fallbackNote =
          loadedNote ??
          loadedNotes[0] ?? {
            id: "missing-note",
            title: DEFAULT_TITLE,
            titleManuallyEdited: false,
            blocksJSON: null,
            markdown: "",
            theme: DEFAULT_THEME,
            seedDemoContent: true,
            editorFontScale: DEFAULT_EDITOR_FONT_SCALE,
            editorFontFamily: DEFAULT_EDITOR_FONT_FAMILY,
            detached: false,
            trashedAt: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
        setNotes(mergeNotes(loadedNotes, fallbackNote));
        setTrashedNotes(Array.isArray(loadedTrashedNotes) ? loadedTrashedNotes : []);
        setNote(fallbackNote);
      }
    }

    loadNote();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return electronApi?.onAppThemeChanged?.((nextAppTheme) => {
      setAppTheme(normalizeAppTheme(nextAppTheme));
    });
  }, []);

  useEffect(() => {
    return electronApi?.onLayoutModeChanged?.((nextLayoutMode) => {
      setLayoutMode(normalizeLayoutMode(nextLayoutMode));
    });
  }, []);

  useEffect(() => {
    return electronApi?.onNotesChanged?.((payload) => {
      const nextNotes = Array.isArray(payload?.notes) ? payload.notes : [];
      const nextTrashedNotes = Array.isArray(payload?.trash) ? payload.trash : null;
      const activeNote = payload?.activeNote;

      setNotes(nextNotes);
      if (nextTrashedNotes) {
        setTrashedNotes(nextTrashedNotes);
      }
      setNote((currentNote) => {
        if (activeNote?.id) {
          return activeNote;
        }

        return (
          nextNotes.find((candidate) => candidate.id === currentNote?.id) ??
          nextNotes[0] ??
          currentNote
        );
      });
    });
  }, []);

  useEffect(() => {
    return electronApi?.onEditorPreferencesChanged?.((nextEditorPreferences) => {
      setEditorPreferences(normalizeEditorPreferences(nextEditorPreferences));
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInstalledFonts() {
      const fontFamilies = await electronApi?.listFonts?.();
      if (!cancelled && Array.isArray(fontFamilies)) {
        setInstalledFontFamilies(fontFamilies);
      }
    }

    void loadInstalledFonts();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectNote = useCallback(
    async (noteId) => {
      const nextNote = electronApi
        ? await electronApi.activateNote(noteId)
        : notes.find((candidate) => candidate.id === noteId);

      if (nextNote) {
        setNote(nextNote);
        setNotes((currentNotes) => mergeNotes(currentNotes, nextNote));
      }
    },
    [notes],
  );

  const createSidebarNote = useCallback(async () => {
    const nextNote = electronApi
      ? await electronApi.createNote()
      : {
          id: crypto.randomUUID(),
          title: DEFAULT_TITLE,
          titleManuallyEdited: false,
          blocksJSON: null,
          markdown: "",
          theme: DEFAULT_THEME,
          seedDemoContent: false,
          editorFontScale: editorPreferences.editorFontScale,
          editorFontFamily: editorPreferences.editorFontFamily,
          detached: false,
          trashedAt: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

    setNotes((currentNotes) => mergeNotes(currentNotes, nextNote));

    if (electronApi) {
      const activatedNote = await electronApi.activateNote(nextNote.id);
      setNote(activatedNote ?? nextNote);
      return;
    }

    setNote(nextNote);
  }, [editorPreferences]);

  const deleteSidebarNote = useCallback(
    async (noteId, noteSnapshot = null) => {
      if (notes.length <= 1) {
        return;
      }

      if (electronApi) {
        const result = await electronApi.deleteNote(noteId);
        const nextNotes = Array.isArray(result?.notes)
          ? result.notes
          : await electronApi.listNotes();
        const nextTrashedNotes = Array.isArray(result?.trash)
          ? result.trash
          : await electronApi.listTrash?.();
        const nextNote =
          result?.activeNote ??
          (note?.id === noteId
            ? nextNotes[0]
            : nextNotes.find((candidate) => candidate.id === note?.id));

        setNotes(nextNotes);
        if (Array.isArray(nextTrashedNotes)) {
          setTrashedNotes(nextTrashedNotes);
        }
        if (nextNote) {
          setNote(nextNote);
        }
        return;
      }

      const storedDeletedNote = notes.find((candidate) => candidate.id === noteId);
      const deletedNote =
        noteSnapshot?.id === noteId
          ? { ...storedDeletedNote, ...noteSnapshot }
          : storedDeletedNote;
      if (!deletedNote) {
        return;
      }
      const deletedNoteIndex = notes.findIndex((candidate) => candidate.id === noteId);
      const nextNotes = notes.filter((candidate) => candidate.id !== noteId);
      const now = Date.now();
      const trashedNote = {
        ...deletedNote,
        alwaysOnTop: false,
        detached: false,
        trashedAt: now,
        updatedAt: now,
      };
      setNotes(nextNotes);
      setTrashedNotes((currentTrashedNotes) =>
        mergeTrashedNotes(currentTrashedNotes, trashedNote),
      );
      if (note?.id === noteId) {
        setNote(nextNotes[deletedNoteIndex] ?? nextNotes[deletedNoteIndex - 1] ?? null);
      }
    },
    [note, notes],
  );

  const restoreTrashedNote = useCallback(
    async (noteId) => {
      if (electronApi) {
        const result = await electronApi.restoreNote?.(noteId);
        const nextNotes = Array.isArray(result?.notes)
          ? result.notes
          : await electronApi.listNotes();
        const nextTrashedNotes = Array.isArray(result?.trash)
          ? result.trash
          : await electronApi.listTrash?.();
        const nextNote = result?.activeNote ?? result?.note ?? nextNotes[0] ?? null;

        setNotes(nextNotes);
        if (Array.isArray(nextTrashedNotes)) {
          setTrashedNotes(nextTrashedNotes);
        }
        if (nextNote) {
          setNote(nextNote);
        }
        return;
      }

      const restoredNote = trashedNotes.find((candidate) => candidate.id === noteId);
      if (!restoredNote) {
        return;
      }

      const activeNote = {
        ...restoredNote,
        alwaysOnTop: false,
        detached: false,
        trashedAt: null,
        updatedAt: Date.now(),
      };
      setTrashedNotes((currentTrashedNotes) =>
        currentTrashedNotes.filter((candidate) => candidate.id !== noteId),
      );
      setNotes((currentNotes) => mergeNotes(currentNotes, activeNote));
      setNote((currentNote) => currentNote ?? activeNote);
    },
    [trashedNotes],
  );

  const purgeTrashedNote = useCallback(
    async (noteId) => {
      if (electronApi) {
        const result = await electronApi.purgeNote?.(noteId);
        const nextTrashedNotes = Array.isArray(result?.trash)
          ? result.trash
          : await electronApi.listTrash?.();
        if (Array.isArray(result?.notes)) {
          setNotes(result.notes);
        }
        if (Array.isArray(nextTrashedNotes)) {
          setTrashedNotes(nextTrashedNotes);
        }
        if (result?.activeNote) {
          setNote(result.activeNote);
        }
        return;
      }

      setTrashedNotes((currentTrashedNotes) =>
        currentTrashedNotes.filter((candidate) => candidate.id !== noteId),
      );
    },
    [],
  );

  const updateNoteInList = useCallback((updatedNote) => {
    setNotes((currentNotes) => mergeNotes(currentNotes, updatedNote));
    setNote((currentNote) =>
      currentNote?.id === updatedNote.id
        ? { ...currentNote, ...updatedNote }
      : currentNote,
    );
  }, []);

  const updateAppThemeMode = useCallback(async (mode) => {
    const nextAppTheme = normalizeAppTheme({ mode });
    setAppTheme(nextAppTheme);
    await electronApi?.updateAppTheme?.(nextAppTheme);
  }, []);

  const updateLayoutMode = useCallback(async (mode) => {
    const nextLayoutMode = normalizeLayoutMode(mode);
    setLayoutMode(nextLayoutMode);
    await electronApi?.updateLayoutMode?.(nextLayoutMode);
  }, []);

  const updateEditorPreferences = useCallback(async (nextEditorPreferences) => {
    const normalizedEditorPreferences =
      normalizeEditorPreferences(nextEditorPreferences);
    setEditorPreferences(normalizedEditorPreferences);
    await electronApi?.updateEditorPreferences?.(normalizedEditorPreferences);
  }, []);

  const detachNote = useCallback(async (noteId) => {
    const result = await electronApi?.detachNote?.(noteId);
    if (!result) {
      return;
    }

    if (Array.isArray(result.notes)) {
      setNotes(result.notes);
    }
    if (result.activeNote) {
      setNote(result.activeNote);
    }
  }, []);

  const attachNote = useCallback(async (noteId) => {
    const result = await electronApi?.attachNote?.(noteId);
    if (!result) {
      return;
    }

    if (Array.isArray(result.notes)) {
      setNotes(result.notes);
    }
    if (result.activeNote) {
      setNote(result.activeNote);
    }
  }, []);

  if (!note) {
    return <div className="loading">Loading BlockNote…</div>;
  }

  return (
    <StickyEditor
      key={note.id}
      note={note}
      notes={notes}
      trashedNotes={trashedNotes}
      appTheme={appTheme}
      layoutMode={layoutMode}
      isSidebarOpen={isSidebarOpen}
      setIsSidebarOpen={setIsSidebarOpen}
      sidebarWidth={sidebarWidth}
      setSidebarWidth={setSidebarWidth}
      onCreateNote={createSidebarNote}
      onDeleteNote={deleteSidebarNote}
      onRestoreTrashedNote={restoreTrashedNote}
      onPurgeTrashedNote={purgeTrashedNote}
      onSelectNote={selectNote}
      onNoteChanged={updateNoteInList}
      onAppThemeModeChanged={updateAppThemeMode}
      onLayoutModeChanged={updateLayoutMode}
      onDetachNote={detachNote}
      onAttachNote={attachNote}
      installedFontFamilies={installedFontFamilies}
      editorPreferences={editorPreferences}
      onEditorPreferencesChanged={updateEditorPreferences}
    />
  );
}

function StickyEditor({
  note,
  notes,
  trashedNotes,
  appTheme,
  layoutMode,
  isSidebarOpen,
  setIsSidebarOpen,
  sidebarWidth,
  setSidebarWidth,
  onCreateNote,
  onDeleteNote,
  onRestoreTrashedNote,
  onPurgeTrashedNote,
  onSelectNote,
  onNoteChanged,
  onAppThemeModeChanged,
  onLayoutModeChanged,
  onDetachNote,
  onAttachNote,
  installedFontFamilies,
  editorPreferences,
  onEditorPreferencesChanged,
}) {
  const parsedStoredBlocks = useMemo(
    () => parseBlocksJSON(note.blocksJSON),
    [note.blocksJSON],
  );
  const initialEditorContent = useMemo(
    () => parsedStoredBlocks ?? (note.seedDemoContent ? DEMO_BLOCKS : EMPTY_BLOCKS),
    [note.seedDemoContent, parsedStoredBlocks],
  );
  const initialDisplayTitle = useMemo(
    () => getNoteDisplayTitle(note, initialEditorContent),
    [initialEditorContent, note],
  );

  const editor = useCreateBlockNote({
    schema,
    initialContent: initialEditorContent,
    tables: {
      splitCells: true,
      cellBackgroundColor: true,
      cellTextColor: true,
      headers: true,
    },
    uploadFile,
    pasteHandler: ({ event, editor, defaultPasteHandler }) => {
      const plainText = event.clipboardData?.getData("text/plain") ?? "";
      if (plainText && !isSelectionInsideCodeBlock(editor)) {
        const normalizedPaste = normalizePastedMarkdownForBlockNote(plainText);
        if (normalizedPaste.changed) {
          editor.pasteMarkdown(normalizedPaste.markdown);
          return true;
        }
      }

      return defaultPasteHandler({
        prioritizeMarkdownOverHTML: true,
        plainTextAsMarkdown: true,
      });
    },
  });
  useBlockNoteFloatingMenuGuard();

  const [title, setTitle] = useState(initialDisplayTitle);
  const [theme, setTheme] = useState(normalizeTheme(note.theme));
  const normalizedEditorPreferences = useMemo(
    () => normalizeEditorPreferences(editorPreferences),
    [editorPreferences],
  );
  const editorFontScale = normalizedEditorPreferences.editorFontScale;
  const editorFontFamily = normalizedEditorPreferences.editorFontFamily;
  const showTableOfContents = normalizedEditorPreferences.showTableOfContents;
  const editorFontOptions = useMemo(
    () => getEditorFontFamilyOptions(installedFontFamilies, editorFontFamily),
    [editorFontFamily, installedFontFamilies],
  );
  const appThemeMode = normalizeAppTheme(appTheme).mode;
  const normalizedLayoutMode = normalizeLayoutMode(layoutMode);
  const effectiveLayoutMode =
    normalizedLayoutMode === "sticky" || note.detached ? "sticky" : "tabs";
  const dockedNotes = useMemo(
    () => notes.filter((candidate) => !candidate.detached),
    [notes],
  );
  const visibleSessionNotes = dockedNotes.length > 0 ? dockedNotes : notes;
  const noteIndexById = useMemo(
    () => new Map(notes.map((candidate, index) => [candidate.id, index])),
    [notes],
  );
  const noteIndex = noteIndexById.get(note.id) ?? 0;
  const stickyAccentColor = resolveStickyAccentColor(theme, noteIndex);
  const stickyChromeStyle = useMemo(
    () =>
      effectiveLayoutMode === "sticky"
        ? getStickyShellStyle(theme, stickyAccentColor, appThemeMode)
        : {},
    [appThemeMode, effectiveLayoutMode, stickyAccentColor, theme],
  );
  const shellStyle = {
    ...stickyChromeStyle,
    "--editor-font-scale": String(editorFontScale),
    "--editor-font-family": getEditorFontFamilyCss(
      editorFontFamily,
      editorFontOptions,
    ),
  };
  const [isColorPanelOpen, setIsColorPanelOpen] = useState(false);
  const [isPreferencesWindowOpen, setIsPreferencesWindowOpen] = useState(false);
  const [preferencesInitialPage, setPreferencesInitialPage] = useState("general");
  const [isStickySettingsOpen, setIsStickySettingsOpen] = useState(false);
  const [isStickyTrashConfirmOpen, setIsStickyTrashConfirmOpen] = useState(false);
  const [sessionTabMenu, setSessionTabMenu] = useState(null);
  const [sessionColorPanelNoteId, setSessionColorPanelNoteId] = useState(null);
  const [isEditorActive, setIsEditorActive] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [draftSessionTitle, setDraftSessionTitle] = useState("");
  const [isDraftSessionTitleDirty, setIsDraftSessionTitleDirty] = useState(false);
  const [enteringSessionIds, setEnteringSessionIds] = useState(() => new Set());
  const [removingSessionIds, setRemovingSessionIds] = useState(() => new Set());
  const [isPinned, setIsPinned] = useState(Boolean(note.alwaysOnTop));
  const [activeImageBlockId, setActiveImageBlockId] = useState(null);
  const [cropState, setCropState] = useState(null);
  const [exportToast, setExportToast] = useState(null);
  const [editorFontSizeToast, setEditorFontSizeToast] = useState("");
  const [tableOfContentsEntries, setTableOfContentsEntries] = useState(() =>
    extractTableOfContentsEntries(initialEditorContent),
  );
  const saveTimerRef = useRef(null);
  const appearanceTimerRef = useRef(null);
  const sessionAppearanceTimerRef = useRef(null);
  const exportToastTimerRef = useRef(null);
  const editorFontSizeToastTimerRef = useRef(null);
  const lastSavedBlocksRef = useRef("");
  const isSidebarCompact = effectiveLayoutMode === "tabs" && !isSidebarOpen;
  const sidebarState = isSidebarCompact ? "compact" : "expanded";
  const sidebarStyle = {
    "--session-sidebar-width": `${
      isSidebarCompact ? SIDEBAR_COMPACT_WIDTH : sidebarWidth
    }px`,
  };
  const isTableOfContentsVisible =
    effectiveLayoutMode === "tabs" &&
    showTableOfContents &&
    tableOfContentsEntries.length > 0;

  useEffect(() => {
    document.body.classList.toggle("theme-dark", appThemeMode === "dark");
    document.body.classList.toggle("theme-light", appThemeMode === "light");
    document.body.dataset.themeMode = appThemeMode;

    return () => {
      document.body.classList.remove("theme-dark", "theme-light");
      delete document.body.dataset.themeMode;
    };
  }, [appThemeMode]);

  useEffect(() => {
    const portalStyleEntries = Object.entries(stickyChromeStyle);

    for (const [name, value] of portalStyleEntries) {
      document.body.style.setProperty(name, value);
    }

    return () => {
      for (const [name] of portalStyleEntries) {
        document.body.style.removeProperty(name);
      }
    };
  }, [stickyChromeStyle]);

  useEffect(() => {
    setIsPinned(Boolean(note.alwaysOnTop));
  }, [note.alwaysOnTop, note.id]);

  useEffect(() => {
    setTitle(getNoteDisplayTitle(note, editor.document));
  }, [
    editor,
    note.blocksJSON,
    note.id,
    note.markdown,
    note.title,
    note.titleManuallyEdited,
  ]);

  const showExportToast = useCallback((message, tone = "success", options = {}) => {
    if (exportToastTimerRef.current) {
      window.clearTimeout(exportToastTimerRef.current);
      exportToastTimerRef.current = null;
    }

    setExportToast({ message, tone });

    const timeout = options.timeout ?? EXPORT_TOAST_TIMEOUT_MS;
    if (timeout > 0) {
      exportToastTimerRef.current = window.setTimeout(() => {
        setExportToast(null);
        exportToastTimerRef.current = null;
      }, timeout);
    }
  }, []);

  const hideExportToast = useCallback(() => {
    if (exportToastTimerRef.current) {
      window.clearTimeout(exportToastTimerRef.current);
      exportToastTimerRef.current = null;
    }
    setExportToast(null);
  }, []);

  const showEditorFontSizeToast = useCallback((nextEditorFontScale) => {
    if (editorFontSizeToastTimerRef.current) {
      window.clearTimeout(editorFontSizeToastTimerRef.current);
      editorFontSizeToastTimerRef.current = null;
    }

    setEditorFontSizeToast(
      `Font size ${editorFontScaleToSize(nextEditorFontScale)}px`,
    );

    editorFontSizeToastTimerRef.current = window.setTimeout(() => {
      setEditorFontSizeToast("");
      editorFontSizeToastTimerRef.current = null;
    }, FONT_SIZE_TOAST_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    if (effectiveLayoutMode !== "sticky") {
      setIsStickySettingsOpen(false);
      setIsStickyTrashConfirmOpen(false);
    }
  }, [effectiveLayoutMode, note.id]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      if (
        target.closest(".editor-font-setting-control") ||
        target.closest(".editor-floating-menu") ||
        target.closest(".session-tab-context-menu")
      ) {
        return;
      }

      setSessionTabMenu(null);

      if (
        !target.closest("[data-testid='sticky-editor-surface']")
      ) {
        setIsEditorActive(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, []);

  useEffect(() => {
    if (parsedStoredBlocks || !note.markdown?.trim()) {
      return;
    }

    try {
      const blocks = editor.tryParseMarkdownToBlocks(note.markdown);
      if (blocks.length > 0) {
        editor.replaceBlocks(editor.document, blocks);
        setTableOfContentsEntries(extractTableOfContentsEntries(blocks));
      }
    } catch {
      const fallbackBlocks = [
        {
          type: "paragraph",
          content: note.markdown,
        },
      ];
      editor.replaceBlocks(editor.document, fallbackBlocks);
      setTableOfContentsEntries(extractTableOfContentsEntries(fallbackBlocks));
    }
  }, [editor, note.markdown, parsedStoredBlocks]);

  const updateAutomaticTitleFromBlocks = useCallback(
    (blocks) => {
      if (isTitleManuallyEdited(note)) {
        return normalizeTitle(note.title);
      }

      const nextTitle = deriveAutomaticTitleFromBlocks(blocks);
      setTitle((currentTitle) => currentTitle === nextTitle ? currentTitle : nextTitle);
      if (normalizeTitle(note.title) !== nextTitle || note.titleManuallyEdited !== false) {
        onNoteChanged({
          ...note,
          title: nextTitle,
          titleManuallyEdited: false,
        });
      }
      return nextTitle;
    },
    [note, onNoteChanged],
  );

  const getCurrentNoteSnapshot = useCallback(() => ({
    ...note,
    title: getNoteDisplayTitle(note, editor.document),
    titleManuallyEdited: isTitleManuallyEdited(note),
    blocksJSON: JSON.stringify(editor.document),
  }), [editor, note]);

  const saveNow = useCallback(async () => {
    const blocksJSON = JSON.stringify(editor.document);
    if (blocksJSON === lastSavedBlocksRef.current) {
      return;
    }

    lastSavedBlocksRef.current = blocksJSON;

    let markdown = "";
    try {
      markdown = await editor.blocksToMarkdownLossy(editor.document);
    } catch {
      markdown = "";
    }

    const savedNote = await electronApi?.saveContent({
      noteId: note.id,
      blocksJSON,
      markdown,
    });
    if (savedNote?.id) {
      setTitle(getNoteDisplayTitle(savedNote, editor.document));
      onNoteChanged(savedNote);
    }
  }, [editor, note.id, onNoteChanged]);

  const scheduleSave = useCallback(() => {
    if (!electronApi) {
      return;
    }

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(saveNow, 180);
  }, [saveNow]);

  const refreshTableOfContents = useCallback(() => {
    setTableOfContentsEntries(extractTableOfContentsEntries(editor.document));
  }, [editor]);

  const handleEditorChange = useCallback(() => {
    updateAutomaticTitleFromBlocks(editor.document);
    refreshTableOfContents();
    scheduleSave();
  }, [editor, refreshTableOfContents, scheduleSave, updateAutomaticTitleFromBlocks]);

  useEffect(() => {
    refreshTableOfContents();
  }, [note.id, refreshTableOfContents]);

  const scheduleAppearanceSave = useCallback(
    (nextTitle, nextTheme, options = {}) => {
      if (!electronApi) {
        return;
      }

      if (appearanceTimerRef.current) {
        window.clearTimeout(appearanceTimerRef.current);
      }

      appearanceTimerRef.current = window.setTimeout(() => {
        const payload = {
          noteId: note.id,
          title: normalizeTitle(nextTitle),
          theme: normalizeTheme(nextTheme),
        };
        if (Object.hasOwn(options, "titleManuallyEdited")) {
          payload.titleManuallyEdited = Boolean(options.titleManuallyEdited);
        }
        void electronApi.updateAppearance(payload);
      }, 160);
    },
    [note.id],
  );

  const scheduleSessionAppearanceSave = useCallback((sessionNote, nextTheme) => {
    if (!electronApi || !sessionNote?.id) {
      return;
    }

    if (sessionAppearanceTimerRef.current) {
      window.clearTimeout(sessionAppearanceTimerRef.current);
    }

    sessionAppearanceTimerRef.current = window.setTimeout(() => {
      void electronApi.updateAppearance({
        noteId: sessionNote.id,
        title: getNoteDisplayTitle(sessionNote),
        titleManuallyEdited: isTitleManuallyEdited(sessionNote),
        theme: normalizeTheme(nextTheme),
      });
    }, 160);
  }, []);

  const updateTheme = useCallback(
    (nextTheme) => {
      const normalizedTheme = normalizeTheme(nextTheme);
      setTheme(normalizedTheme);
      onNoteChanged({
        ...note,
        title: normalizeTitle(title),
        titleManuallyEdited: isTitleManuallyEdited(note),
        theme: normalizedTheme,
      });
      scheduleAppearanceSave(title, normalizedTheme);
    },
    [note, onNoteChanged, scheduleAppearanceSave, title],
  );

  const updateSessionNoteTheme = useCallback(
    (sessionNoteId, nextTheme) => {
      const targetNote =
        notes.find((sessionNote) => sessionNote.id === sessionNoteId) ??
        (note.id === sessionNoteId ? note : null);

      if (!targetNote) {
        return;
      }

      const normalizedTheme = normalizeTheme(nextTheme);
      const updatedNote = {
        ...targetNote,
        title: getNoteDisplayTitle(
          targetNote,
          targetNote.id === note.id ? editor.document : null,
        ),
        titleManuallyEdited: isTitleManuallyEdited(targetNote),
        theme: normalizedTheme,
      };

      if (targetNote.id === note.id) {
        setTheme(normalizedTheme);
      }

      onNoteChanged(updatedNote);
      scheduleSessionAppearanceSave(updatedNote, normalizedTheme);
    },
    [
      note,
      notes,
      editor,
      onNoteChanged,
      scheduleSessionAppearanceSave,
    ],
  );

  const updateGlobalEditorPreferences = useCallback(
    (nextEditorPreferences) => {
      const nextPreferences = normalizeEditorPreferences(
        nextEditorPreferences,
        normalizedEditorPreferences,
      );
      const didFontSizeChange =
        nextPreferences.editorFontScale !== editorFontScale;

      void onEditorPreferencesChanged?.(nextPreferences);

      if (didFontSizeChange) {
        showEditorFontSizeToast(nextPreferences.editorFontScale);
      }
    },
    [
      editorFontScale,
      normalizedEditorPreferences,
      onEditorPreferencesChanged,
      showEditorFontSizeToast,
    ],
  );

  const updateEditorFontScale = useCallback(
    (nextEditorFontScale) => {
      const normalizedEditorFontScale = normalizeEditorFontScale(nextEditorFontScale);
      updateGlobalEditorPreferences({
        ...normalizedEditorPreferences,
        editorFontScale: normalizedEditorFontScale,
      });
    },
    [normalizedEditorPreferences, updateGlobalEditorPreferences],
  );

  const adjustEditorFontScale = useCallback(
    (direction) => {
      updateEditorFontScale(
        normalizeEditorFontScale(editorFontScale + direction * EDITOR_FONT_SCALE_STEP),
      );
    },
    [editorFontScale, updateEditorFontScale],
  );

  const selectTableOfContentsEntry = useCallback(
    (entry) => {
      const block = findBlockById(editor.document, entry?.id);
      if (!block) {
        return;
      }

      try {
        editor.focus();
        editor.setTextCursorPosition(block, "start");
      } catch {
        try {
          editor.setSelection(block, block);
        } catch {
          // The scroll target is still useful if this block type rejects selection.
        }
      }

      window.requestAnimationFrame(() => {
        scrollEditorBlockIntoView(entry.id);
      });
    },
    [editor],
  );

  const openPreferencesPage = useCallback((pageId = "general") => {
    setPreferencesInitialPage(normalizePreferencePageId(pageId));
    setIsColorPanelOpen(false);
    setIsStickySettingsOpen(false);
    setIsStickyTrashConfirmOpen(false);
    setSessionTabMenu(null);
    setSessionColorPanelNoteId(null);
    setIsPreferencesWindowOpen(true);
  }, []);

  const openPreferences = useCallback(() => {
    openPreferencesPage("general");
  }, [openPreferencesPage]);

  const openTrashPreferences = useCallback(() => {
    openPreferencesPage("trash");
  }, [openPreferencesPage]);

  const openStickySettings = useCallback(() => {
    setIsColorPanelOpen(false);
    setIsPreferencesWindowOpen(false);
    setIsStickyTrashConfirmOpen(false);
    setSessionTabMenu(null);
    setSessionColorPanelNoteId(null);
    setIsStickySettingsOpen(true);
  }, []);

  const toggleLayoutMode = useCallback(() => {
    setIsColorPanelOpen(false);
    setSessionTabMenu(null);
    setSessionColorPanelNoteId(null);
    setIsPreferencesWindowOpen(false);
    setIsStickySettingsOpen(false);
    setIsStickyTrashConfirmOpen(false);
    void onLayoutModeChanged(normalizedLayoutMode === "tabs" ? "sticky" : "tabs");
  }, [normalizedLayoutMode, onLayoutModeChanged]);

  const openSidebar = useCallback(() => {
    setSidebarWidth((currentWidth) =>
      Math.max(currentWidth || SIDEBAR_DEFAULT_WIDTH, SIDEBAR_MIN_WIDTH),
    );
    setIsSidebarOpen(true);
  }, []);

  const togglePin = useCallback(async () => {
    const nextPinned = !isPinned;
    setIsPinned(nextPinned);
    setIsColorPanelOpen(false);
    onNoteChanged({
      ...note,
      title: normalizeTitle(title),
      titleManuallyEdited: isTitleManuallyEdited(note),
      theme,
      alwaysOnTop: nextPinned,
    });

    try {
      const resolvedPinned = electronApi
        ? await electronApi.setAlwaysOnTop(nextPinned)
        : nextPinned;
      setIsPinned(Boolean(resolvedPinned));
      onNoteChanged({
        ...note,
        title: normalizeTitle(title),
        titleManuallyEdited: isTitleManuallyEdited(note),
        theme,
        alwaysOnTop: Boolean(resolvedPinned),
      });
    } catch (error) {
      setIsPinned(!nextPinned);
      onNoteChanged({
        ...note,
        title: normalizeTitle(title),
        titleManuallyEdited: isTitleManuallyEdited(note),
        theme,
        alwaysOnTop: !nextPinned,
      });
      showExportToast(error.message || "Pin failed.", "error");
    }
  }, [isPinned, note, onNoteChanged, showExportToast, theme, title]);

  const exportNote = useCallback(async () => {
    if (!electronApi) {
      showExportToast("PDF export is available in the desktop app.", "error");
      return;
    }

    showExportToast("Exporting PDF...", "progress", { timeout: 0 });
    document.body.classList.add("is-exporting");
    try {
      await nextAnimationFrame();
      await nextAnimationFrame();
      const result = await electronApi?.exportNote({
        noteId: note.id,
        title: normalizeTitle(title),
        type: "pdf",
      });

      if (result?.canceled) {
        hideExportToast();
        return;
      }

      showExportToast("PDF exported", "success");
    } catch (error) {
      showExportToast(error.message || "PDF export failed.", "error");
    } finally {
      document.body.classList.remove("is-exporting");
    }
  }, [hideExportToast, note.id, showExportToast, title]);

  useEffect(() => {
    return electronApi?.onOpenPreferences?.(openPreferences);
  }, [openPreferences]);

  useEffect(() => {
    const handlePreferencesShortcut = (event) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) {
        return;
      }

      if (event.key !== ",") {
        return;
      }

      event.preventDefault();
      openPreferences();
    };

    document.addEventListener("keydown", handlePreferencesShortcut, true);
    return () => {
      document.removeEventListener("keydown", handlePreferencesShortcut, true);
    };
  }, [openPreferences]);

  useEffect(() => {
    const handleChromeShortcut = (event) => {
      const isCommand = event.metaKey || event.ctrlKey;
      if (!isCommand || event.altKey) {
        return;
      }

      if (event.target instanceof Element && event.target.closest("input, textarea, select")) {
        return;
      }

      const key = event.key.toLowerCase();
      if (event.shiftKey && key === "m") {
        event.preventDefault();
        toggleLayoutMode();
        return;
      }

      if (event.shiftKey && key === "l") {
        event.preventDefault();
        void onAppThemeModeChanged(appThemeMode === "dark" ? "light" : "dark");
        return;
      }

      if (event.shiftKey && key === "e") {
        event.preventDefault();
        setIsColorPanelOpen(false);
        setIsStickySettingsOpen(false);
        setSessionTabMenu(null);
        setSessionColorPanelNoteId(null);
        setIsPreferencesWindowOpen(false);
        void exportNote();
        return;
      }

      if ((key === "+" || key === "=") && !event.altKey) {
        event.preventDefault();
        adjustEditorFontScale(1);
        return;
      }

      if ((key === "-" || key === "_") && !event.altKey) {
        event.preventDefault();
        adjustEditorFontScale(-1);
        return;
      }

      if (event.shiftKey && key === "d" && note.detached) {
        event.preventDefault();
        void onAttachNote(note.id);
        return;
      }

      if (!event.shiftKey && event.key === "\\") {
        event.preventDefault();
        setIsSidebarOpen((value) => !value);
        return;
      }

      if (!event.shiftKey && (key === "n" || key === "t") && effectiveLayoutMode === "tabs") {
        event.preventDefault();
        void onCreateNote();
      }
    };

    document.addEventListener("keydown", handleChromeShortcut, true);
    return () => {
      document.removeEventListener("keydown", handleChromeShortcut, true);
    };
  }, [
    appThemeMode,
    effectiveLayoutMode,
    note.detached,
    note.id,
    onAppThemeModeChanged,
    onAttachNote,
    onCreateNote,
    adjustEditorFontScale,
    exportNote,
    toggleLayoutMode,
  ]);

  useEffect(() => {
    if (
      !isColorPanelOpen &&
      !isPreferencesWindowOpen &&
      !isStickySettingsOpen &&
      !isStickyTrashConfirmOpen &&
      !sessionTabMenu &&
      !sessionColorPanelNoteId
    ) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsColorPanelOpen(false);
        setIsPreferencesWindowOpen(false);
        setIsStickySettingsOpen(false);
        setIsStickyTrashConfirmOpen(false);
        setSessionTabMenu(null);
        setSessionColorPanelNoteId(null);
      }
    };

    document.addEventListener("keydown", handleEscape, true);
    return () => {
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [
    isColorPanelOpen,
    isPreferencesWindowOpen,
    isStickySettingsOpen,
    isStickyTrashConfirmOpen,
    sessionColorPanelNoteId,
    sessionTabMenu,
  ]);

  useEffect(() => {
    const handleEditorKeyDown = (event) => {
      if (event.key === "Tab" && !isEditorShortcutTarget(event.target)) {
        if (!isEditableFormTarget(event.target)) {
          event.preventDefault();
        }
        return;
      }

      if (!(event.metaKey || event.ctrlKey) || event.altKey) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key !== "a" && key !== "x") {
        return;
      }

      if (isEditableFormTarget(event.target)) {
        return;
      }

      const isEditorTarget = isEditorActive && isEditorShortcutTarget(event.target);
      if (!isEditorTarget) {
        if (!isEditableFormTarget(event.target)) {
          event.preventDefault();
        }
        return;
      }

      if (key === "a") {
        event.preventDefault();
        selectAllBlocks(editor);
        return;
      }

      if (hasVisibleTextSelection()) {
        return;
      }

      event.preventDefault();
      void cutCurrentBlocks(editor, activeImageBlockId, scheduleSave);
    };

    document.addEventListener("keydown", handleEditorKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleEditorKeyDown, true);
    };
  }, [activeImageBlockId, editor, isEditorActive, scheduleSave]);

  useEffect(() => {
    const handleImageClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest(".image-tools") || target.closest(".crop-dialog")) {
        return;
      }

      const image = target.closest("img.bn-visual-media");
      if (!image) {
        setActiveImageBlockId(null);
        return;
      }

      const block = findImageBlockBySource(editor.document, image.currentSrc || image.src);
      if (!block) {
        return;
      }

      setActiveImageBlockId(block.id);
      try {
        editor.setSelection(block, block);
      } catch {
        // Media selection is best-effort; the toolbar still works from block id.
      }
    };

    document.addEventListener("click", handleImageClick, true);
    return () => {
      document.removeEventListener("click", handleImageClick, true);
    };
  }, [editor]);

  const downloadActiveImage = useCallback(async () => {
    const block = findBlockById(editor.document, activeImageBlockId);
    const url = block?.props?.url;
    if (!url) {
      return;
    }

    const defaultName = imageFileName(block.props.name, url);
    if (electronApi?.saveAsset) {
      await electronApi.saveAsset({ url, defaultName });
      return;
    }

    downloadInBrowser(url, defaultName);
  }, [activeImageBlockId, editor]);

  const openCropDialog = useCallback(() => {
    const block = findBlockById(editor.document, activeImageBlockId);
    const url = block?.props?.url;
    if (!url) {
      return;
    }

    setCropState({ blockId: block.id, sourceUrl: url });
  }, [activeImageBlockId, editor]);

  const startHeaderWindowDrag = useCallback(
    (event) => {
      const target = event.target;
      if (
        target instanceof Element &&
        (isEditableFormTarget(target) ||
          target.closest("button, a, [role='button'], [role='switch'], [role='tab']"))
      ) {
        return;
      }

      if (
        event.button !== 0 ||
        effectiveLayoutMode !== "sticky" ||
        !electronApi?.moveWindowBy
      ) {
        return;
      }

      let previousScreenX = event.screenX;
      let previousScreenY = event.screenY;

      const moveWindow = (pointerEvent) => {
        const deltaX = pointerEvent.screenX - previousScreenX;
        const deltaY = pointerEvent.screenY - previousScreenY;
        previousScreenX = pointerEvent.screenX;
        previousScreenY = pointerEvent.screenY;

        if (deltaX === 0 && deltaY === 0) {
          return;
        }

        void electronApi.moveWindowBy({ deltaX, deltaY });
      };

      const stopWindowDrag = () => {
        window.removeEventListener("pointermove", moveWindow);
        window.removeEventListener("pointerup", stopWindowDrag);
        window.removeEventListener("pointercancel", stopWindowDrag);
      };

      event.currentTarget.setPointerCapture?.(event.pointerId);
      window.addEventListener("pointermove", moveWindow);
      window.addEventListener("pointerup", stopWindowDrag);
      window.addEventListener("pointercancel", stopWindowDrag);
    },
    [effectiveLayoutMode],
  );

  const applyCrop = useCallback(
    (croppedDataUrl) => {
      const block = findBlockById(editor.document, cropState?.blockId);
      if (!block) {
        return;
      }

      editor.updateBlock(block, {
        props: {
          url: croppedDataUrl,
          name: ensurePngName(block.props.name || "cropped-image.png"),
          showPreview: true,
        },
      });
      setActiveImageBlockId(block.id);
      setCropState(null);
      scheduleSave();
    },
    [cropState?.blockId, editor, scheduleSave],
  );

  const selectSidebarNote = useCallback(
    async (noteId) => {
      if (noteId === note.id) {
        return;
      }

      await saveNow();
      await onSelectNote(noteId);
    },
    [note.id, onSelectNote, saveNow],
  );

  const sessionColorPanelNote = useMemo(
    () =>
      visibleSessionNotes.find(
        (sessionNote) => sessionNote.id === sessionColorPanelNoteId,
      ) ??
      notes.find((sessionNote) => sessionNote.id === sessionColorPanelNoteId) ??
      null,
    [notes, sessionColorPanelNoteId, visibleSessionNotes],
  );

  const sessionTabMenuNote = useMemo(
    () =>
      visibleSessionNotes.find(
        (sessionNote) => sessionNote.id === sessionTabMenu?.noteId,
      ) ??
      notes.find((sessionNote) => sessionNote.id === sessionTabMenu?.noteId) ??
      null,
    [notes, sessionTabMenu, visibleSessionNotes],
  );

  const getSessionDisplayTitle = useCallback(
    (sessionNote) =>
      getNoteDisplayTitle(
        sessionNote,
        sessionNote?.id === note.id ? editor.document : null,
      ),
    [editor, note.id],
  );

  const openSessionTabMenu = useCallback((sessionNote, event) => {
    event.preventDefault();
    setSessionColorPanelNoteId(null);
    setIsColorPanelOpen(false);
    setIsStickySettingsOpen(false);
    setIsPreferencesWindowOpen(false);
    setIsStickyTrashConfirmOpen(false);
    setSessionTabMenu({
      noteId: sessionNote.id,
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  const openSessionColorPanel = useCallback((sessionNoteId) => {
    setSessionTabMenu(null);
    setSessionColorPanelNoteId(sessionNoteId);
    setIsColorPanelOpen(false);
    setIsStickySettingsOpen(false);
    setIsPreferencesWindowOpen(false);
    setIsStickyTrashConfirmOpen(false);
  }, []);

  useEffect(() => {
    const visibleIds = visibleSessionNotes.map((sessionNote) => sessionNote.id);

    if (!sessionTabAnimationsPrimed) {
      visibleIds.forEach((id) => seenSessionTabIds.add(id));
      sessionTabAnimationsPrimed = true;
      return undefined;
    }

    const newSessionIds = visibleIds.filter((id) => !seenSessionTabIds.has(id));
    visibleIds.forEach((id) => seenSessionTabIds.add(id));

    if (newSessionIds.length === 0) {
      return undefined;
    }

    setEnteringSessionIds((currentIds) => {
      const nextIds = new Set(currentIds);
      newSessionIds.forEach((id) => nextIds.add(id));
      return nextIds;
    });

    const timerId = window.setTimeout(() => {
      setEnteringSessionIds((currentIds) => {
        const nextIds = new Set(currentIds);
        newSessionIds.forEach((id) => nextIds.delete(id));
        return nextIds;
      });
    }, SESSION_TAB_ENTER_MS);

    return () => window.clearTimeout(timerId);
  }, [visibleSessionNotes]);

  const startSessionRename = useCallback((sessionNote) => {
    setEditingSessionId(sessionNote.id);
    setDraftSessionTitle(getSessionDisplayTitle(sessionNote));
    setIsDraftSessionTitleDirty(false);
  }, [getSessionDisplayTitle]);

  const cancelSessionRename = useCallback(() => {
    setEditingSessionId(null);
    setDraftSessionTitle("");
    setIsDraftSessionTitleDirty(false);
  }, []);

  const commitSessionRename = useCallback(
    async (sessionNote) => {
      setEditingSessionId(null);
      setDraftSessionTitle("");
      setIsDraftSessionTitleDirty(false);

      if (!isDraftSessionTitleDirty) {
        return;
      }

      const normalizedTitle = normalizeTitle(
        draftSessionTitle,
        getSessionDisplayTitle(sessionNote),
      );

      const updatedNote = {
        ...sessionNote,
        title: normalizedTitle,
        titleManuallyEdited: true,
      };

      if (sessionNote.id === note.id) {
        setTitle(normalizedTitle);
        onNoteChanged({
          ...note,
          title: normalizedTitle,
          titleManuallyEdited: true,
          theme,
        });
        scheduleAppearanceSave(normalizedTitle, theme, {
          titleManuallyEdited: true,
        });
        return;
      }

      onNoteChanged(updatedNote);
      await electronApi?.updateAppearance({
        noteId: sessionNote.id,
        title: normalizedTitle,
        titleManuallyEdited: true,
        theme: normalizeTheme(sessionNote.theme),
      });
    },
    [
      draftSessionTitle,
      getSessionDisplayTitle,
      isDraftSessionTitleDirty,
      note,
      onNoteChanged,
      scheduleAppearanceSave,
      theme,
    ],
  );

  const deleteSessionNote = useCallback(
    async (sessionNote) => {
      if (notes.length <= 1) {
        return;
      }

      if (removingSessionIds.has(sessionNote.id)) {
        return;
      }

      setEditingSessionId(null);
      setDraftSessionTitle("");
      setRemovingSessionIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.add(sessionNote.id);
        return nextIds;
      });

      try {
        await delay(SESSION_TAB_EXIT_MS);
        await saveNow();
        await onDeleteNote(
          sessionNote.id,
          sessionNote.id === note.id ? getCurrentNoteSnapshot() : sessionNote,
        );
      } finally {
        setRemovingSessionIds((currentIds) => {
          const nextIds = new Set(currentIds);
          nextIds.delete(sessionNote.id);
          return nextIds;
        });
      }
    },
    [getCurrentNoteSnapshot, note.id, notes.length, onDeleteNote, removingSessionIds, saveNow],
  );

  const getSessionTabRowClassName = useCallback(
    (sessionNote) =>
      [
        "session-tab-row",
        sessionNote.id === note.id ? "active" : "",
        enteringSessionIds.has(sessionNote.id) ? "is-entering" : "",
        removingSessionIds.has(sessionNote.id) ? "is-leaving" : "",
      ]
        .filter(Boolean)
        .join(" "),
    [enteringSessionIds, note.id, removingSessionIds],
  );

  const selectRelativeSessionNote = useCallback(
    async (direction) => {
      if (effectiveLayoutMode !== "tabs" || visibleSessionNotes.length <= 1) {
        return;
      }

      const currentIndex = visibleSessionNotes.findIndex(
        (sessionNote) => sessionNote.id === note.id,
      );
      if (currentIndex < 0) {
        return;
      }

      const nextIndex =
        (currentIndex + direction + visibleSessionNotes.length) %
        visibleSessionNotes.length;
      const nextSessionNote = visibleSessionNotes[nextIndex];
      if (!nextSessionNote || nextSessionNote.id === note.id) {
        return;
      }

      await selectSidebarNote(nextSessionNote.id);
    },
    [effectiveLayoutMode, note.id, selectSidebarNote, visibleSessionNotes],
  );

  const deleteCurrentSessionTab = useCallback(async () => {
    if (effectiveLayoutMode !== "tabs" || visibleSessionNotes.length <= 1) {
      return;
    }

    const currentSessionNote = visibleSessionNotes.find(
      (sessionNote) => sessionNote.id === note.id,
    );
    if (!currentSessionNote) {
      return;
    }

    await deleteSessionNote(currentSessionNote);
  }, [deleteSessionNote, effectiveLayoutMode, note.id, visibleSessionNotes]);

  const requestMoveCurrentStickyNoteToTrash = useCallback(() => {
    if (notes.length <= 1) {
      showExportToast("At least one session must remain.", "error");
      return;
    }

    setIsColorPanelOpen(false);
    setIsPreferencesWindowOpen(false);
    setIsStickySettingsOpen(false);
    setSessionTabMenu(null);
    setSessionColorPanelNoteId(null);
    setIsStickyTrashConfirmOpen(true);
  }, [notes.length, showExportToast]);

  const moveCurrentStickyNoteToTrash = useCallback(async () => {
    if (notes.length <= 1) {
      showExportToast("At least one session must remain.", "error");
      return;
    }

    setIsStickyTrashConfirmOpen(false);
    setIsColorPanelOpen(false);
    setIsPreferencesWindowOpen(false);
    setIsStickySettingsOpen(false);
    setSessionTabMenu(null);
    setSessionColorPanelNoteId(null);
    await saveNow();
    await onDeleteNote(note.id, getCurrentNoteSnapshot());
  }, [
    getCurrentNoteSnapshot,
    note.id,
    notes.length,
    onDeleteNote,
    saveNow,
    showExportToast,
  ]);

  useEffect(() => {
    const handleSessionShortcut = (event) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) {
        return;
      }

      if (event.target instanceof Element && event.target.closest("input, textarea, select")) {
        return;
      }

      const sessionIndex = Number(event.key) - 1;
      if (!Number.isInteger(sessionIndex) || sessionIndex < 0 || sessionIndex > 8) {
        return;
      }

      const sessionNote = visibleSessionNotes[sessionIndex];
      if (!sessionNote || sessionNote.id === note.id) {
        return;
      }

      event.preventDefault();
      void selectSidebarNote(sessionNote.id);
    };

    document.addEventListener("keydown", handleSessionShortcut, true);
    return () => {
      document.removeEventListener("keydown", handleSessionShortcut, true);
    };
  }, [note.id, selectSidebarNote, visibleSessionNotes]);

  useEffect(() => {
    const handleTabModeShortcut = (event) => {
      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }

      if (event.target instanceof Element && event.target.closest("input, textarea, select")) {
        return;
      }

      const key = event.key.toLowerCase();
      if (!event.altKey && !event.shiftKey && key === "w") {
        if (effectiveLayoutMode !== "tabs" || visibleSessionNotes.length <= 1) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        void deleteCurrentSessionTab();
        return;
      }

      if (!event.altKey || event.shiftKey) {
        return;
      }

      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      if (effectiveLayoutMode !== "tabs" || visibleSessionNotes.length <= 1) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      void selectRelativeSessionNote(event.key === "ArrowLeft" ? -1 : 1);
    };

    document.addEventListener("keydown", handleTabModeShortcut, true);
    return () => {
      document.removeEventListener("keydown", handleTabModeShortcut, true);
    };
  }, [
    deleteCurrentSessionTab,
    effectiveLayoutMode,
    selectRelativeSessionNote,
    visibleSessionNotes.length,
  ]);

  const detachSessionNote = useCallback(
    async (sessionNote, event) => {
      if (normalizedLayoutMode !== "tabs" || sessionNote.detached) {
        return;
      }

      const sidebar = document.querySelector(".session-sidebar");
      const bounds = sidebar?.getBoundingClientRect();
      const isOutsideSidebar =
        bounds &&
        (event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom);

      if (!isOutsideSidebar) {
        return;
      }

      await saveNow();
      await onDetachNote(sessionNote.id);
    },
    [normalizedLayoutMode, onDetachNote, saveNow],
  );

  const attachDraggedNote = useCallback(
    async (event) => {
      const noteId = event.dataTransfer?.getData("application/x-notepane-note");
      if (!noteId) {
        return;
      }

      event.preventDefault();
      await onAttachNote(noteId);
    },
    [onAttachNote],
  );

  const startSidebarResize = useCallback(
    (event) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = isSidebarOpen ? sidebarWidth : SIDEBAR_COMPACT_WIDTH;

      const resize = (pointerEvent) => {
        const nextWidth = startWidth + pointerEvent.clientX - startX;
        if (nextWidth <= SIDEBAR_COLLAPSE_WIDTH) {
          setIsSidebarOpen(false);
          return;
        }

        setSidebarWidth(clamp(nextWidth, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH));
        setIsSidebarOpen(true);
      };

      const stopResize = () => {
        window.removeEventListener("pointermove", resize);
        window.removeEventListener("pointerup", stopResize);
        window.removeEventListener("pointercancel", stopResize);
      };

      window.addEventListener("pointermove", resize);
      window.addEventListener("pointerup", stopResize);
      window.addEventListener("pointercancel", stopResize);
    },
    [isSidebarOpen, sidebarWidth],
  );

  const focusLastBlockFromEmptySurface = useCallback(
    (event) => {
      if (!isEmptyEditorSurfacePointer(event)) {
        return;
      }

      event.preventDefault();
      focusLastEditorBlock(editor);
    },
    [editor],
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
      if (appearanceTimerRef.current) {
        window.clearTimeout(appearanceTimerRef.current);
      }
      if (sessionAppearanceTimerRef.current) {
        window.clearTimeout(sessionAppearanceTimerRef.current);
      }
      if (exportToastTimerRef.current) {
        window.clearTimeout(exportToastTimerRef.current);
      }
      if (editorFontSizeToastTimerRef.current) {
        window.clearTimeout(editorFontSizeToastTimerRef.current);
      }
    };
  }, []);

  return (
    <main
      className={`sticky-shell theme-${appThemeMode} layout-${effectiveLayoutMode} sidebar-${sidebarState}`}
      style={shellStyle}
      data-testid="sticky-shell"
      data-theme-mode={appThemeMode}
      data-layout-mode={effectiveLayoutMode}
    >
      <header
        className="sticky-header"
        data-testid="sticky-header"
        data-window-drag-handle={effectiveLayoutMode === "sticky" ? "true" : undefined}
        onPointerDown={startHeaderWindowDrag}
      >
        <div className="sticky-drag-strip" aria-hidden="true" />
        <div className="sticky-header-actions" aria-label="Sticky controls">
          {effectiveLayoutMode === "sticky" && (
            <>
              <div className="sticky-header-action-list">
                <StickyPinButton
                  isPinned={isPinned}
                  onClick={() => void togglePin()}
                />
                <ExportPdfButton onClick={() => void exportNote()} />
                <LayoutModeSwitch
                  mode={normalizedLayoutMode}
                  compact
                  onChange={toggleLayoutMode}
                />
                <StickySettingsButton
                  active={isStickySettingsOpen}
                  onClick={openStickySettings}
                />
                <StickyTrashButton
                  onClick={requestMoveCurrentStickyNoteToTrash}
                />
              </div>
              <div className="sticky-header-action-preview" aria-hidden="true">
                {isPinned && (
                  <span className="sticky-pin-status">
                    <PinIcon pinned={isPinned} />
                  </span>
                )}
                <EllipsisIcon />
              </div>
            </>
          )}
          {note.detached && normalizedLayoutMode === "tabs" && (
            <button
              type="button"
              className="dock-note-button has-tooltip"
              aria-label="Dock note into tabs"
              data-tooltip={`Dock to tabs · ${getShortcutLabel("⇧D")}`}
              onMouseDown={preventFocusLoss}
              onClick={() => void onAttachNote(note.id)}
            >
              <DockIcon />
            </button>
          )}
        </div>
      </header>
      <div className="sticky-body">
        {effectiveLayoutMode === "tabs" && (
          <aside
            className={`session-sidebar ${isSidebarCompact ? "is-compact" : ""}`}
            data-testid="session-sidebar"
            data-sidebar-state={sidebarState}
            style={sidebarStyle}
            onDragOver={(event) => {
              if (event.dataTransfer?.types.includes("application/x-notepane-note")) {
                event.preventDefault();
              }
            }}
            onDrop={(event) => void attachDraggedNote(event)}
          >
            <div className="session-sidebar-topbar">
              <NotePaneWordmark />
              <button
                type="button"
                className="sidebar-toggle has-tooltip"
                aria-label={isSidebarCompact ? "Show sidebar" : "Hide sidebar"}
                data-tooltip={`${isSidebarCompact ? "Show sidebar" : "Hide sidebar"} · ${getShortcutLabel("\\")}`}
                onMouseDown={preventFocusLoss}
                onClick={() => {
                  if (isSidebarCompact) {
                    openSidebar();
                    return;
                  }
                  setIsSidebarOpen(false);
                }}
              >
                <SidebarToggleIcon expanded={!isSidebarCompact} />
              </button>
            </div>
            <div className="session-sidebar-content" data-testid="session-sidebar-scroll">
              <div className="session-tabs" role="tablist" aria-label="Note sessions">
                {visibleSessionNotes.map((sessionNote, index) =>
                  editingSessionId === sessionNote.id ? (
                    <div
                      key={sessionNote.id}
                      className={getSessionTabRowClassName(sessionNote)}
                      style={getSessionTabStyle(
                        sessionNote.theme,
                        appThemeMode,
                        noteIndexById.get(sessionNote.id) ?? index,
                      )}
                    >
                      <div
                        role="tab"
                        aria-selected={sessionNote.id === note.id}
                        className="session-tab-edit"
                      >
                        <span className="session-dot">{index + 1}</span>
                        <input
                          aria-label="Session name"
                          value={draftSessionTitle}
                          autoFocus
                          spellCheck={false}
                          onFocus={(event) => event.target.select()}
                          onChange={(event) => {
                            setDraftSessionTitle(event.target.value);
                            setIsDraftSessionTitleDirty(true);
                          }}
                          onBlur={() => void commitSessionRename(sessionNote)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void commitSessionRename(sessionNote);
                            }
                            if (event.key === "Escape") {
                              event.preventDefault();
                              cancelSessionRename();
                            }
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div
                      key={sessionNote.id}
                      className={getSessionTabRowClassName(sessionNote)}
                      style={getSessionTabStyle(
                        sessionNote.theme,
                        appThemeMode,
                        noteIndexById.get(sessionNote.id) ?? index,
                      )}
                      draggable={normalizedLayoutMode === "tabs"}
                      onContextMenu={(event) =>
                        openSessionTabMenu(sessionNote, event)
                      }
                      onDragStart={(event) => {
                        event.dataTransfer?.setData("application/x-notepane-note", sessionNote.id);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={(event) => void detachSessionNote(sessionNote, event)}
                    >
                      {isSidebarCompact ? (
                        <button
                          type="button"
                          role="tab"
                          aria-selected={sessionNote.id === note.id}
                          className="session-tab-button has-tooltip"
                          data-tooltip={`Open ${getSessionDisplayTitle(sessionNote)} · ${getSessionShortcutLabel(index)}`}
                          onMouseDown={preventFocusLoss}
                          onClick={() => void selectSidebarNote(sessionNote.id)}
                          onDoubleClick={(event) => {
                            event.preventDefault();
                            startSessionRename(sessionNote);
                          }}
                        >
                          <span className="session-dot">{index + 1}</span>
                          <span className="session-name">
                            {getSessionDisplayTitle(sessionNote)}
                          </span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="session-index-button session-delete-button has-tooltip"
                            aria-label={`Delete session ${getSessionDisplayTitle(sessionNote)}`}
                            disabled={notes.length <= 1}
                            data-tooltip={
                              sessionNote.id === note.id
                                ? `Close current tab · ${getShortcutLabel("W")}`
                                : "Delete session"
                            }
                            onMouseDown={(event) => {
                              preventFocusLoss(event);
                              event.stopPropagation();
                            }}
                            onClick={(event) => {
                              event.stopPropagation();
                              void deleteSessionNote(sessionNote);
                            }}
                          >
                            <span className="session-index-label">{index + 1}</span>
                            <span className="session-index-delete" aria-hidden="true">
                              <X
                                className="session-index-delete-icon"
                                size={14}
                                strokeWidth={2.25}
                              />
                            </span>
                          </button>
                          <button
                            type="button"
                            role="tab"
                            aria-selected={sessionNote.id === note.id}
                            className="session-tab-button has-tooltip"
                            data-tooltip={`Open ${getSessionDisplayTitle(sessionNote)} · ${getSessionShortcutLabel(index)}`}
                            onMouseDown={preventFocusLoss}
                            onClick={() => void selectSidebarNote(sessionNote.id)}
                            onDoubleClick={(event) => {
                              event.preventDefault();
                              startSessionRename(sessionNote);
                            }}
                          >
                            <span className="session-name">
                              {getSessionDisplayTitle(sessionNote)}
                            </span>
                          </button>
                          <span className="session-tab-trailing">
                            {index < 9 && (
                              <span
                                className="session-shortcut"
                                aria-label={`Shortcut ${getSessionShortcutLabel(index)}`}
                              >
                                {getSessionShortcutLabel(index)}
                              </span>
                            )}
                          </span>
                        </>
                      )}
                    </div>
                  ),
                )}
              </div>
              <button
                type="button"
                className="session-add-button has-tooltip"
                aria-label="New session"
                data-tooltip={`New session · ${getShortcutLabel("T")}`}
                onMouseDown={preventFocusLoss}
                onClick={() => void onCreateNote()}
              >
                <Plus
                  className="session-add-icon"
                  aria-hidden="true"
                  size={14}
                  strokeWidth={2.4}
                />
                <span>New session</span>
              </button>
            </div>
            <div
              className="session-sidebar-footer"
              data-testid="session-sidebar-footer"
              aria-label="Session sidebar controls"
            >
              <div className="session-sidebar-footer-row">
                <ExportPdfButton onClick={() => void exportNote()} />
                <PreferencesButton onClick={openPreferences} />
                <TrashButton onClick={openTrashPreferences} />
                <LayoutModeSwitch
                  mode={normalizedLayoutMode}
                  compact={isSidebarCompact}
                  onChange={toggleLayoutMode}
                />
              </div>
            </div>
            <div
              className="sidebar-resize-handle"
              role="separator"
              aria-label="Resize sidebar"
              aria-orientation="vertical"
              onPointerDown={startSidebarResize}
            />
          </aside>
        )}
        <section
          className={`sticky-editor-surface${isTableOfContentsVisible ? " has-table-of-contents" : ""}`}
          data-testid="sticky-editor-surface"
          data-editor-active={isEditorActive ? "true" : "false"}
          data-toc-visible={isTableOfContentsVisible ? "true" : "false"}
          onFocusCapture={() => setIsEditorActive(true)}
          onBlurCapture={(event) => {
            const nextTarget = event.relatedTarget;
            if (
              !(nextTarget instanceof Element) ||
              (!event.currentTarget.contains(nextTarget) &&
                !nextTarget.closest(".editor-floating-menu"))
            ) {
              setIsEditorActive(false);
            }
          }}
          onPointerDownCapture={() => setIsEditorActive(true)}
          onMouseDown={focusLastBlockFromEmptySurface}
        >
          {editorFontSizeToast && (
            <div
              className="editor-font-size-toast"
              role="status"
              aria-live="polite"
            >
              {editorFontSizeToast}
            </div>
          )}
          {isTableOfContentsVisible && (
            <TableOfContentsRail
              entries={tableOfContentsEntries}
              onSelectEntry={selectTableOfContentsEntry}
            />
          )}
          <BlockNoteView
            editor={editor}
            theme={appThemeMode}
            onChange={handleEditorChange}
            portalElements={{ default: document.body }}
          />
        </section>
      </div>
      {sessionTabMenu && sessionTabMenuNote && (
        <SessionTabContextMenu
          x={sessionTabMenu.x}
          y={sessionTabMenu.y}
          sessionNote={sessionTabMenuNote}
          onOpenColor={() => openSessionColorPanel(sessionTabMenuNote.id)}
        />
      )}
      {isColorPanelOpen && (
        <ColorPanel
          theme={theme}
          variant="sticky"
          defaultColor={
            effectiveLayoutMode === "sticky" ? stickyAccentColor : undefined
          }
          onChange={updateTheme}
          onClose={() => setIsColorPanelOpen(false)}
        />
      )}
      {sessionColorPanelNote && (
        <ColorPanel
          theme={normalizeTheme(sessionColorPanelNote.theme)}
          variant="tabs"
          defaultColor={resolveSessionTabAccentColor(
            sessionColorPanelNote.theme,
            resolveStickyAccentColor(
              sessionColorPanelNote.theme,
              noteIndexById.get(sessionColorPanelNote.id) ?? 0,
            ),
          )}
          onChange={(nextTheme) =>
            updateSessionNoteTheme(sessionColorPanelNote.id, nextTheme)
          }
          onClose={() => setSessionColorPanelNoteId(null)}
        />
      )}
      {isStickySettingsOpen && (
        <StickySettingsWindow
          noteTitle={title}
          theme={theme}
          defaultColor={stickyAccentColor}
          onThemeChange={updateTheme}
          onClose={() => setIsStickySettingsOpen(false)}
        />
      )}
      {isStickyTrashConfirmOpen && (
        <StickyTrashConfirmDialog
          noteTitle={title}
          onCancel={() => setIsStickyTrashConfirmOpen(false)}
          onConfirm={() => void moveCurrentStickyNoteToTrash()}
        />
      )}
      {isPreferencesWindowOpen && (
        <PreferencesWindow
          initialPage={preferencesInitialPage}
          appThemeMode={appThemeMode}
          editorPreferences={editorPreferences}
          fontOptions={editorFontOptions}
          trashedNotes={trashedNotes}
          onAppThemeModeChange={onAppThemeModeChanged}
          onEditorPreferencesChange={updateGlobalEditorPreferences}
          onRestoreTrashedNote={onRestoreTrashedNote}
          onPurgeTrashedNote={onPurgeTrashedNote}
          onClose={() => setIsPreferencesWindowOpen(false)}
        />
      )}
      {activeImageBlockId && (
        <div className="image-tools" role="toolbar" aria-label="Image tools">
          <button type="button" onMouseDown={preventFocusLoss} onClick={downloadActiveImage}>
            Download image
          </button>
          <button type="button" onMouseDown={preventFocusLoss} onClick={openCropDialog}>
            Crop image
          </button>
        </div>
      )}
      {exportToast && (
        <div
          className={`sticky-toast sticky-toast-${exportToast.tone}`}
          role="status"
          aria-live="polite"
        >
          {exportToast.message}
        </div>
      )}
      <AdaptiveTooltipPortal />
      {cropState && (
        <CropDialog
          sourceUrl={cropState.sourceUrl}
          onApply={applyCrop}
          onClose={() => setCropState(null)}
        />
      )}
    </main>
  );
}

function TableOfContentsRail({ entries, onSelectEntry }) {
  return (
    <nav
      className="editor-table-of-contents"
      data-testid="editor-toc"
      aria-label="Table of contents"
    >
      <div className="editor-toc-header">
        <TableOfContentsIcon
          className="notepane-action-icon notepane-icon-toc"
          data-icon-tone="sidebar"
        />
        <span>Contents</span>
      </div>
      <div className="editor-toc-list" role="list">
        {entries.map((entry) => (
          <div className="editor-toc-item" role="listitem" key={entry.id}>
            <button
              type="button"
              className="editor-toc-entry"
              data-heading-level={entry.level}
              style={{ "--toc-indent": `${(entry.level - 1) * 10}px` }}
              aria-label={`Jump to ${entry.title}, heading level ${entry.level}`}
              onMouseDown={preventFocusLoss}
              onClick={() => onSelectEntry(entry)}
            >
              {entry.title}
            </button>
          </div>
        ))}
      </div>
    </nav>
  );
}

function ColorSettingsSection({
  theme,
  variant = "tabs",
  defaultColor,
  onChange,
}) {
  const isStickyVariant = variant === "sticky";
  const activeColor = isStickyVariant
    ? resolveThemeAccentColor(theme, defaultColor ?? DEFAULT_STICKY_ACCENT_COLOR)
    : resolveSessionTabAccentColor(
        theme,
        defaultColor ?? DEFAULT_STICKY_ACCENT_COLOR,
      );
  const activeOpacity = resolveTabTextOpacity(theme);
  const valueAriaTarget = isStickyVariant ? "sticky color" : "session tab color";
  const hsv = useMemo(() => hexToHsv(activeColor), [activeColor]);
  const formattedValues = useMemo(
    () => formatColorValues(activeColor, activeOpacity),
    [activeColor, activeOpacity],
  );
  const [draftValues, setDraftValues] = useState(() =>
    Object.fromEntries(formattedValues.map((entry) => [entry.label, entry.value])),
  );

  useEffect(() => {
    setDraftValues(
      Object.fromEntries(formattedValues.map((entry) => [entry.label, entry.value])),
    );
  }, [formattedValues]);

  const updateTabTextColor = useCallback(
    (color) => {
      onChange({
        ...theme,
        tabTextColor: color,
      });
    },
    [onChange, theme],
  );

  const updateTabTextOpacity = useCallback(
    (opacity) => {
      onChange({
        ...theme,
        tabTextOpacity: normalizeOpacity(opacity),
      });
    },
    [onChange, theme],
  );

  const updateFromHsv = useCallback(
    (nextHsv) => {
      updateTabTextColor(hsvToHex(nextHsv.h, nextHsv.s, nextHsv.v));
    },
    [updateTabTextColor],
  );

  const copyValue = useCallback(async (value) => {
    await writeClipboardText(value);
  }, []);

  const applyColorValue = useCallback(
    (label, value) => {
      setDraftValues((currentValues) => ({
        ...currentValues,
        [label]: value,
      }));

      const parsedColor = parseColorValue(label, value);
      if (!parsedColor) {
        return;
      }

      updateTabTextColor(parsedColor);
    },
    [updateTabTextColor],
  );

  const pickScreenColor = useCallback(async () => {
    if (typeof window.EyeDropper !== "function") {
      return;
    }

    try {
      const result = await new window.EyeDropper().open();
      if (isHexColor(result?.sRGBHex)) {
        updateTabTextColor(result.sRGBHex.toLowerCase());
      }
    } catch {
      // User cancelled or the runtime rejected screen color picking.
    }
  }, [updateTabTextColor]);

  return (
    <section className="preferences-section color-settings-section">
      <div className="preferences-section-title">
        {isStickyVariant ? "Pastel sticky color" : "Sidebar tab background color"}
      </div>

      {isStickyVariant && (
        <div
          className="pastel-preset-row"
          role="group"
          aria-label="Pastel colors"
        >
          {STICKY_PASTEL_PALETTE.map((color, index) => (
            <button
              key={color}
              type="button"
              aria-label={`Pastel color ${index + 1}`}
              aria-pressed={activeColor === color}
              style={{ "--pastel-color": color }}
              onMouseDown={preventFocusLoss}
              onClick={() => updateTabTextColor(color)}
            />
          ))}
        </div>
      )}

      <ColorWheel
        hsv={hsv}
        ariaLabel={isStickyVariant ? "Sticky color" : "Session tab color"}
        onChange={(nextHsv) => updateFromHsv({ ...hsv, ...nextHsv })}
      />

      <label className="color-brightness-row">
        <span className="sr-only">Color brightness</span>
        <input
          aria-label="Color brightness"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={hsv.v}
          style={{
            "--brightness-color": hsvToHex(hsv.h, hsv.s, 1),
          }}
          onInput={(event) =>
            updateFromHsv({
              ...hsv,
              v: Number(event.currentTarget.value),
            })
          }
          onChange={(event) =>
            updateFromHsv({
              ...hsv,
              v: Number(event.target.value),
            })
          }
        />
      </label>

      <label className="color-opacity-row">
        <span>Opacity</span>
        <span>{Math.round(activeOpacity * 100)}%</span>
        <input
          aria-label="Color opacity"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={activeOpacity}
          style={{
            "--opacity-color": activeColor,
          }}
          onInput={(event) => updateTabTextOpacity(event.currentTarget.value)}
          onChange={(event) => updateTabTextOpacity(event.target.value)}
        />
      </label>

      <div className="color-action-row">
        <button
          type="button"
          aria-label="Eyedropper"
          disabled={typeof window.EyeDropper !== "function"}
          onMouseDown={preventFocusLoss}
          onClick={() => void pickScreenColor()}
        >
          Eyedropper
        </button>
      </div>

      <div className="color-value-list">
        {formattedValues.map((entry) => (
          <div className="color-value-row" key={entry.label}>
            <input
              aria-label={`${entry.label} ${valueAriaTarget} value`}
              value={draftValues[entry.label] ?? entry.value}
              spellCheck={false}
              onChange={(event) =>
                applyColorValue(entry.label, event.target.value)
              }
              onFocus={(event) => event.target.select()}
            />
            <button
              type="button"
              aria-label={`Copy ${entry.label}`}
              onMouseDown={preventFocusLoss}
              onClick={() => void copyValue(entry.value)}
            >
              <CopyValueIcon />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function EditorPreferencesSection({
  editorPreferences,
  fontOptions,
  onEditorPreferencesChange,
}) {
  const normalizedEditorPreferences = normalizeEditorPreferences(editorPreferences);
  const [defaultFontSizeDraft, setDefaultFontSizeDraft] = useState(() =>
    String(editorFontScaleToSize(normalizedEditorPreferences.editorFontScale)),
  );

  useEffect(() => {
    setDefaultFontSizeDraft(
      String(editorFontScaleToSize(normalizedEditorPreferences.editorFontScale)),
    );
  }, [normalizedEditorPreferences.editorFontScale]);

  const updateEditorPreferenceFontScale = useCallback(
    (nextEditorFontScale) => {
      onEditorPreferencesChange?.({
        ...normalizedEditorPreferences,
        editorFontScale: normalizeEditorFontScale(nextEditorFontScale),
      });
    },
    [normalizedEditorPreferences, onEditorPreferencesChange],
  );

  const updateEditorPreferenceFontFamily = useCallback(
    (nextEditorFontFamily) => {
      onEditorPreferencesChange?.({
        ...normalizedEditorPreferences,
        editorFontFamily: normalizeEditorFontFamily(nextEditorFontFamily),
      });
    },
    [normalizedEditorPreferences, onEditorPreferencesChange],
  );

  const updateTableOfContentsVisibility = useCallback(
    (showTableOfContents) => {
      onEditorPreferencesChange?.({
        ...normalizedEditorPreferences,
        showTableOfContents: Boolean(showTableOfContents),
      });
    },
    [normalizedEditorPreferences, onEditorPreferencesChange],
  );

  const updateEditorPreferenceFontSize = useCallback(
    (nextEditorFontSize) => {
      const normalizedEditorFontSize = normalizeEditorFontSize(nextEditorFontSize);
      setDefaultFontSizeDraft(String(normalizedEditorFontSize));
      updateEditorPreferenceFontScale(
        editorFontSizeToScale(normalizedEditorFontSize),
      );
    },
    [updateEditorPreferenceFontScale],
  );

  const commitDefaultFontSizeDraft = useCallback(() => {
    updateEditorPreferenceFontSize(defaultFontSizeDraft);
  }, [defaultFontSizeDraft, updateEditorPreferenceFontSize]);

  return (
    <section className="preferences-section preferences-default-editor-section">
      <div className="preferences-section-title">Editor</div>
      <div className="preferences-section-description">
        Font family and size apply to every session tab.
      </div>
      <div className="preference-setting-row editor-font-family-setting">
        <div>
          <div className="preference-setting-title">Font family</div>
          <div className="preferences-section-description">
            Default editor typeface.
          </div>
        </div>
        <EditorFontFamilyControl
          className="preferences-font-family-control"
          fontFamily={normalizedEditorPreferences.editorFontFamily}
          fontOptions={fontOptions}
          onFontFamilyChange={updateEditorPreferenceFontFamily}
        />
      </div>
      <div className="preference-setting-row editor-font-size-setting">
        <div>
          <div className="preference-setting-title">Font size</div>
          <div className="preferences-section-description">
            Default editor text size.
          </div>
        </div>
        <EditorFontSizeControl
          className="preferences-font-size-control"
          draftValue={defaultFontSizeDraft}
          scale={normalizedEditorPreferences.editorFontScale}
          onDraftChange={setDefaultFontSizeDraft}
          onCommit={commitDefaultFontSizeDraft}
          onFontSizeChange={updateEditorPreferenceFontSize}
        />
      </div>
      <div className="preference-setting-row">
        <div>
          <div className="preference-setting-title">Table of contents</div>
          <div className="preferences-section-description">
            Show the right rail from heading levels in tab mode.
          </div>
        </div>
        <PreferenceToggleSwitch
          checked={normalizedEditorPreferences.showTableOfContents}
          ariaLabel="Show table of contents"
          onChange={updateTableOfContentsVisibility}
        />
      </div>
    </section>
  );
}

const PREFERENCE_SHORTCUT_ROWS = [
  ["New session", "⌘T"],
  ["Close current tab", "⌘W"],
  ["Previous tab", "⌘⌥←"],
  ["Next tab", "⌘⌥→"],
  ["Toggle tabs / sticky", "⌘⇧M"],
  ["Toggle light / dark", "⌘⇧L"],
  ["Export", "⌘⇧E"],
  ["Preferences", "⌘,"],
  ["Editor font up", "⌘+"],
  ["Editor font down", "⌘-"],
];

function KeyboardShortcutsSection() {
  return (
    <section className="preferences-section preferences-shortcuts-section">
      <div className="preferences-section-title">Keyboard shortcuts</div>
      <div className="preferences-section-description">
        Current command map. The UI is structured so shortcut remapping can be added here cleanly.
      </div>
      <div className="shortcut-list" role="list" aria-label="Keyboard shortcuts">
        {PREFERENCE_SHORTCUT_ROWS.map(([label, shortcut]) => (
          <div className="shortcut-row" role="listitem" key={label}>
            <span>{label}</span>
            <kbd>{shortcut}</kbd>
          </div>
        ))}
      </div>
    </section>
  );
}

function TrashPreferencesSection({
  trashedNotes = [],
  onRestoreNote,
  onPurgeNote,
}) {
  const [pendingPurgeNote, setPendingPurgeNote] = useState(null);
  const visibleTrashedNotes = Array.isArray(trashedNotes) ? trashedNotes : [];

  useEffect(() => {
    if (
      pendingPurgeNote &&
      !visibleTrashedNotes.some((note) => note.id === pendingPurgeNote.id)
    ) {
      setPendingPurgeNote(null);
    }
  }, [pendingPurgeNote, visibleTrashedNotes]);

  const confirmPurgeNote = pendingPurgeNote
    ? {
        ...pendingPurgeNote,
        title: getNoteDisplayTitle(pendingPurgeNote),
      }
    : null;

  return (
    <section className="preferences-section preferences-trash-section">
      <div className="preferences-section-title">Trash</div>
      <div className="preferences-section-description">
        Deleted sessions are hidden from tabs and sticky windows until restored.
      </div>
      {visibleTrashedNotes.length === 0 ? (
        <div className="trash-empty-state" role="status">
          Trash is empty.
        </div>
      ) : (
        <div className="trash-note-list" role="list" aria-label="Trash notes">
          {visibleTrashedNotes.map((trashNote) => {
            const title = getNoteDisplayTitle(trashNote);
            return (
              <div className="trash-note-row" role="listitem" key={trashNote.id}>
                <div className="trash-note-meta">
                  <div className="trash-note-title">{title}</div>
                  <div className="trash-note-date">
                    {formatTrashTimestamp(trashNote.trashedAt)}
                  </div>
                </div>
                <div className="trash-note-actions">
                  <button
                    type="button"
                    className="trash-action-button"
                    aria-label={`Restore ${title}`}
                    onMouseDown={preventFocusLoss}
                    onClick={() => void onRestoreNote?.(trashNote.id)}
                  >
                    <RestoreNoteIcon />
                    <span>Restore</span>
                  </button>
                  <button
                    type="button"
                    className="trash-action-button trash-action-danger"
                    aria-label={`Delete permanently ${title}`}
                    onMouseDown={preventFocusLoss}
                    onClick={() => setPendingPurgeNote(trashNote)}
                  >
                    <PermanentDeleteIcon />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {confirmPurgeNote && (
        <div
          className="trash-confirm-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPendingPurgeNote(null);
            }
          }}
        >
          <div
            className="trash-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Delete permanently confirmation"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div>
              <div className="trash-confirm-title">Delete permanently?</div>
              <div className="trash-confirm-message">
                This note cannot be recovered after deletion.
              </div>
              <div className="trash-confirm-note">{confirmPurgeNote.title}</div>
            </div>
            <div className="trash-confirm-actions">
              <button
                type="button"
                className="trash-confirm-button"
                onMouseDown={preventFocusLoss}
                onClick={() => setPendingPurgeNote(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="trash-confirm-button trash-confirm-danger"
                aria-label={`Yes, permanently delete ${confirmPurgeNote.title}`}
                onMouseDown={preventFocusLoss}
                onClick={() => {
                  const noteId = confirmPurgeNote.id;
                  setPendingPurgeNote(null);
                  void onPurgeNote?.(noteId);
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ColorPanel({
  theme,
  variant = "sticky",
  defaultColor,
  onChange,
  onClose,
}) {
  const isStickyVariant = variant === "sticky";

  return (
    <div
      className="preferences-panel color-panel editor-floating-menu"
      role="dialog"
      aria-label={isStickyVariant ? "Sticky color panel" : "Session color panel"}
    >
      <div className="preferences-panel-header">
        <div>
          <div className="preferences-title">
            {isStickyVariant ? "Sticky color" : "Session color"}
          </div>
          <div className="preferences-subtitle">
            {isStickyVariant
              ? "Sticky background and tab color"
              : "Session tab background with automatic text contrast"}
          </div>
        </div>
        <button
          type="button"
          className="preferences-close-button"
          aria-label="Close preferences"
          onMouseDown={preventFocusLoss}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <div className="preferences-panel-body">
        <ColorSettingsSection
          theme={theme}
          variant={variant}
          defaultColor={defaultColor}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

function StickySettingsWindow({
  noteTitle,
  theme,
  defaultColor,
  onThemeChange,
  onClose,
}) {
  return (
    <div
      className="preferences-backdrop sticky-settings-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="preferences-window sticky-settings-window"
        role="dialog"
        aria-modal="true"
        aria-label="Sticky settings window"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="preferences-window-header">
          <div>
            <div className="preferences-window-title">Sticky settings</div>
            <div className="preferences-window-subtitle">
              {normalizeTitle(noteTitle)}
            </div>
          </div>
          <button
            type="button"
            className="preferences-close-button"
            aria-label="Close preferences"
            onMouseDown={preventFocusLoss}
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="sticky-settings-content">
          <section className="preferences-section preferences-window-section">
            <div className="preferences-section-title">Appearance</div>
            <ColorSettingsSection
              theme={theme}
              variant="sticky"
              defaultColor={defaultColor}
              onChange={onThemeChange}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

function StickyTrashConfirmDialog({
  noteTitle,
  onCancel,
  onConfirm,
}) {
  const title = normalizeTitle(noteTitle);

  return (
    <div
      className="trash-confirm-backdrop sticky-trash-confirm-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        className="trash-confirm-dialog sticky-trash-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Move note to trash confirmation"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div>
          <div className="trash-confirm-title">Move note to trash?</div>
          <div className="trash-confirm-message">
            This is different from closing a sticky window. The note will be hidden
            from tabs and sticky windows until restored from Trash.
          </div>
          <div className="trash-confirm-note">{title}</div>
        </div>
        <div className="trash-confirm-actions">
          <button
            type="button"
            className="trash-confirm-button"
            onMouseDown={preventFocusLoss}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="trash-confirm-button trash-confirm-danger"
            aria-label={`Yes, move ${title} to trash`}
            onMouseDown={preventFocusLoss}
            onClick={onConfirm}
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}

const PREFERENCE_PAGES = [
  { id: "general", label: "General" },
  { id: "editor", label: "Editor" },
  { id: "trash", label: "Trash" },
  { id: "shortcuts", label: "Shortcuts" },
];

function normalizePreferencePageId(pageId) {
  return PREFERENCE_PAGES.some((page) => page.id === pageId)
    ? pageId
    : "general";
}

function PreferencesWindow({
  initialPage = "general",
  appThemeMode,
  editorPreferences,
  fontOptions,
  trashedNotes,
  onAppThemeModeChange,
  onEditorPreferencesChange,
  onRestoreTrashedNote,
  onPurgeTrashedNote,
  onClose,
}) {
  const [activePage, setActivePage] = useState(() =>
    normalizePreferencePageId(initialPage),
  );

  useEffect(() => {
    setActivePage(normalizePreferencePageId(initialPage));
  }, [initialPage]);

  const renderActivePreferencePage = () => {
    if (activePage === "editor") {
      return (
        <div
          id="preferences-editor"
          className="preferences-window-section"
          role="tabpanel"
          aria-labelledby="preferences-tab-editor"
        >
          <EditorPreferencesSection
            editorPreferences={editorPreferences}
            fontOptions={fontOptions}
            onEditorPreferencesChange={onEditorPreferencesChange}
          />
        </div>
      );
    }

    if (activePage === "trash") {
      return (
        <div
          id="preferences-trash"
          className="preferences-window-section"
          role="tabpanel"
          aria-labelledby="preferences-tab-trash"
        >
          <TrashPreferencesSection
            trashedNotes={trashedNotes}
            onRestoreNote={onRestoreTrashedNote}
            onPurgeNote={onPurgeTrashedNote}
          />
        </div>
      );
    }

    if (activePage === "shortcuts") {
      return (
        <div
          id="preferences-shortcuts"
          className="preferences-window-section"
          role="tabpanel"
          aria-labelledby="preferences-tab-shortcuts"
        >
          <KeyboardShortcutsSection />
        </div>
      );
    }

    return (
      <section
        id="preferences-general"
        className="preferences-section preferences-window-section"
        role="tabpanel"
        aria-labelledby="preferences-tab-general"
      >
        <div className="preferences-section-title">General</div>
        <div className="preference-setting-row">
          <div>
            <div className="preference-setting-title">App theme</div>
            <div className="preferences-section-description">
              Light and dark mode are global for the whole app.
            </div>
          </div>
          <HeaderModeSwitch
            mode={appThemeMode}
            onChange={onAppThemeModeChange}
          />
        </div>
      </section>
    );
  };

  return (
    <div
      className="preferences-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="preferences-window"
        role="dialog"
        aria-modal="true"
        aria-label="Preferences window"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="preferences-window-header">
          <div>
            <div className="preferences-window-title">Preferences</div>
            <div className="preferences-window-subtitle">
              App theme, editor typography, trash, and keyboard commands.
            </div>
          </div>
          <button
            type="button"
            className="preferences-close-button"
            aria-label="Close preferences"
            onMouseDown={preventFocusLoss}
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="preferences-window-body">
          <nav
            className="preferences-window-sidebar"
            aria-label="Preferences pages"
            role="tablist"
          >
            {PREFERENCE_PAGES.map((page) => (
              <button
                id={`preferences-tab-${page.id}`}
                key={page.id}
                type="button"
                role="tab"
                aria-selected={activePage === page.id}
                aria-controls={`preferences-${page.id}`}
                onMouseDown={preventFocusLoss}
                onClick={() => setActivePage(page.id)}
              >
                {page.label}
              </button>
            ))}
          </nav>
          <div className="preferences-window-content">
            {renderActivePreferencePage()}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeaderModeSwitch({ mode, onChange }) {
  const isDark = mode === "dark";
  return (
    <button
      type="button"
      className="header-mode-switch has-tooltip"
      role="switch"
      aria-label="Theme mode"
      aria-checked={isDark}
      data-tooltip={`${isDark ? "Light mode" : "Dark mode"} · ${getShortcutLabel("⇧L")}`}
      onMouseDown={preventFocusLoss}
      onClick={() => onChange(isDark ? "light" : "dark")}
    >
      <span className="theme-mode-switch-track" aria-hidden="true">
        <span className="theme-mode-switch-icon sun">☀</span>
        <span className="theme-mode-switch-icon moon">☾</span>
        <span className="theme-mode-switch-thumb" />
      </span>
    </button>
  );
}

function PreferenceToggleSwitch({ checked, ariaLabel, onChange }) {
  return (
    <button
      type="button"
      className="preference-toggle-switch"
      role="switch"
      aria-label={ariaLabel}
      aria-checked={checked ? "true" : "false"}
      onMouseDown={preventFocusLoss}
      onClick={() => onChange?.(!checked)}
    >
      <span aria-hidden="true">{checked ? "On" : "Off"}</span>
    </button>
  );
}

function PreferencesButton({ onClick }) {
  return (
    <button
      type="button"
      className="preferences-icon-button settings-icon-button has-tooltip"
      aria-label="Preferences"
      data-tooltip={`Preferences · ${getShortcutLabel(",")}`}
      onMouseDown={preventFocusLoss}
      onClick={onClick}
    >
      <SettingsIcon />
    </button>
  );
}

function TrashButton({ onClick }) {
  return (
    <button
      type="button"
      className="trash-icon-button preferences-icon-button has-tooltip"
      aria-label="Trash"
      data-tooltip="Trash"
      onMouseDown={preventFocusLoss}
      onClick={onClick}
    >
      <TrashSidebarIcon />
    </button>
  );
}

function ExportPdfButton({ onClick }) {
  return (
    <button
      type="button"
      className="export-icon-button preferences-icon-button has-tooltip"
      aria-label="Export PDF"
      data-tooltip={`Export PDF · ${getShortcutLabel("⇧E")}`}
      onMouseDown={preventFocusLoss}
      onClick={onClick}
    >
      <ExportPdfIcon />
    </button>
  );
}

function StickyPinButton({ isPinned = false, onClick }) {
  return (
    <button
      type="button"
      className="sticky-pin-button has-tooltip"
      aria-label={isPinned ? "Unpin window" : "Pin window"}
      aria-pressed={isPinned}
      data-tooltip={`${isPinned ? "Unpin window" : "Pin window"} · ${getShortcutLabel("⇧P")}`}
      onMouseDown={preventFocusLoss}
      onClick={onClick}
    >
      <PinIcon pinned={isPinned} />
    </button>
  );
}

function StickySettingsButton({ active = false, onClick }) {
  return (
    <button
      type="button"
      className="preferences-icon-button sticky-settings-button has-tooltip"
      aria-label="Sticky settings"
      aria-pressed={active}
      data-tooltip="Sticky settings"
      onMouseDown={preventFocusLoss}
      onClick={onClick}
    >
      <PaletteIcon />
    </button>
  );
}

function StickyTrashButton({ onClick }) {
  return (
    <button
      type="button"
      className="sticky-trash-button has-tooltip"
      aria-label="Move note to trash"
      data-tooltip="Move note to trash"
      onMouseDown={preventFocusLoss}
      onClick={onClick}
    >
      <TrashSidebarIcon />
    </button>
  );
}

function LayoutModeSwitch({ mode, compact = false, onChange }) {
  const isSticky = mode === "sticky";
  const targetMode = isSticky ? "tabs" : "sticky";
  const targetModeLabel =
    targetMode === "tabs" ? "Tab sessions mode" : "Sticky windows mode";
  const actionLabel = `Switch to ${targetModeLabel}`;
  return (
    <button
      type="button"
      className={`layout-mode-button layout-mode-button-transition${compact ? " is-compact-mode-button" : ""} has-tooltip`}
      aria-label={actionLabel}
      aria-pressed={isSticky}
      data-layout-mode-target={targetMode}
      data-tooltip={`${actionLabel} · ${getShortcutLabel("⇧M")}`}
      onMouseDown={preventFocusLoss}
      onClick={onChange}
    >
      <ModeTransitionIcon
        fromMode={mode}
        toMode={targetMode}
        compact={compact}
      />
    </button>
  );
}

function SessionTabContextMenu({
  x,
  y,
  sessionNote,
  onOpenColor,
}) {
  const colorPreview = resolveSessionTabAccentColor(sessionNote.theme);

  return (
    <div
      className="session-tab-context-menu editor-floating-menu"
      role="menu"
      aria-label={`Session options for ${getNoteDisplayTitle(sessionNote)}`}
      style={{
        "--session-tab-menu-x": `${x}px`,
        "--session-tab-menu-y": `${y}px`,
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <button
        type="button"
        role="menuitem"
        onMouseDown={preventFocusLoss}
        onClick={onOpenColor}
      >
        <span
          className="session-tab-menu-color-swatch"
          style={{ "--session-tab-menu-color": colorPreview }}
          aria-hidden="true"
        />
        <span>Color...</span>
      </button>
    </div>
  );
}

function NotePaneWordmark() {
  return (
    <div className="brand-wordmark" aria-label="NotePane wordmark">
      <span className="brand-wordmark-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className="brand-wordmark-text">NotePane</span>
    </div>
  );
}

function SidebarToggleIcon({ expanded = true }) {
  const Icon = expanded ? PanelLeftClose : PanelLeftOpen;
  return (
    <Icon
      className="notepane-action-icon notepane-icon-sidebar"
      data-icon-family="system-symbol"
      data-icon-pack="lucide"
      data-icon-tone="sidebar"
      data-sidebar-icon-state={expanded ? "expanded" : "compact"}
      size={24}
      strokeWidth={1.9}
      aria-hidden="true"
    />
  );
}

function PaletteIcon() {
  return (
    <Palette
      className="notepane-action-icon notepane-icon-palette"
      data-icon-family="system-symbol"
      data-icon-pack="lucide"
      data-icon-tone="palette"
      size={24}
      strokeWidth={1.9}
      aria-hidden="true"
    />
  );
}

function SettingsIcon() {
  return (
    <Cog
      className="notepane-action-icon notepane-icon-settings"
      data-icon-family="system-symbol"
      data-icon-pack="lucide"
      data-icon-tone="settings"
      size={24}
      strokeWidth={1.9}
      aria-hidden="true"
    />
  );
}

function ExportPdfIcon() {
  return (
    <FileDown
      className="notepane-action-icon notepane-icon-export"
      data-icon-family="system-symbol"
      data-icon-pack="lucide"
      data-icon-tone="export"
      size={24}
      strokeWidth={1.9}
      aria-hidden="true"
    />
  );
}

function CopyValueIcon() {
  return (
    <Copy
      className="notepane-action-icon notepane-icon-copy"
      data-icon-family="system-symbol"
      data-icon-pack="lucide"
      data-icon-tone="copy"
      size={15}
      strokeWidth={2}
      aria-hidden="true"
    />
  );
}

function RestoreNoteIcon() {
  return (
    <RotateCcw
      className="notepane-action-icon notepane-icon-restore"
      data-icon-family="system-symbol"
      data-icon-pack="lucide"
      data-icon-tone="restore"
      size={15}
      strokeWidth={2}
      aria-hidden="true"
    />
  );
}

function PermanentDeleteIcon() {
  return (
    <Trash2
      className="notepane-action-icon notepane-icon-delete"
      data-icon-family="system-symbol"
      data-icon-pack="lucide"
      data-icon-tone="delete"
      size={15}
      strokeWidth={2}
      aria-hidden="true"
    />
  );
}

function TrashSidebarIcon() {
  return (
    <Trash2
      className="notepane-action-icon notepane-icon-trash"
      data-icon-family="system-symbol"
      data-icon-pack="lucide"
      data-icon-tone="trash"
      size={24}
      strokeWidth={1.9}
      aria-hidden="true"
    />
  );
}

function PinIcon({ pinned = false }) {
  return (
    <Pin
      className="notepane-action-icon notepane-icon-pin"
      data-icon-family="system-symbol"
      data-icon-pack="lucide"
      data-icon-tone="pin"
      data-pin-state={pinned ? "pinned" : "unpinned"}
      size={24}
      strokeWidth={1.9}
      aria-hidden="true"
    />
  );
}

function EllipsisIcon() {
  return (
    <Ellipsis
      className="notepane-action-icon notepane-icon-ellipsis"
      data-icon-family="system-symbol"
      data-icon-pack="lucide"
      size={24}
      strokeWidth={1.9}
      aria-hidden="true"
    />
  );
}

function ModeTransitionIcon({ fromMode, toMode, compact = false }) {
  const FromGlyph = fromMode === "sticky" ? InlineStickyGlyph : InlineTabsGlyph;
  const ToGlyph = toMode === "sticky" ? InlineStickyGlyph : InlineTabsGlyph;

  if (compact) {
    return (
      <svg
        className="notepane-action-icon notepane-mode-transition-icon lucide lucide-mode-transition"
        data-icon-family="system-symbol"
        data-icon-pack="lucide"
        data-icon-tone={toMode}
        data-icon-layout="compact"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <ToGlyph x={2} />
      </svg>
    );
  }

  return (
    <svg
      className="notepane-action-icon notepane-mode-transition-icon lucide lucide-mode-transition"
      data-icon-family="system-symbol"
      data-icon-pack="lucide"
      data-icon-tone={toMode}
      data-icon-layout="transition"
      width="58"
      height="24"
      viewBox="0 0 58 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <FromGlyph x={1} />
      <path className="mode-transition-arrow" d="M26 12h10" />
      <path className="mode-transition-arrow-head" d="m33 9 3 3-3 3" />
      <ToGlyph x={40} />
    </svg>
  );
}

function InlineTabsGlyph({ x }) {
  return (
    <g className="mode-tabs-glyph" transform={`translate(${x} 0)`}>
      <rect x="1" y="5" width="18" height="15" rx="2" />
      <path d="M7 5v15" />
      <path d="M1 9.5h6" />
      <path d="M1 14h6" />
    </g>
  );
}

function InlineStickyGlyph({ x }) {
  return (
    <g className="mode-sticky-glyph" transform={`translate(${x} 0)`}>
      <path d="M2 4.5h15v10.2L12.3 20H2V4.5Z" />
      <path d="M17 14.7h-4.7V20" />
    </g>
  );
}

function DockIcon() {
  return (
    <PanelTopClose
      className="notepane-action-icon notepane-icon-dock"
      data-icon-family="system-symbol"
      data-icon-pack="lucide"
      data-icon-tone="dock"
      size={24}
      strokeWidth={1.9}
      aria-hidden="true"
    />
  );
}

function ColorWheel({ hsv, ariaLabel, onChange }) {
  const wheelRef = useRef(null);
  const canvasRef = useRef(null);
  const isDraggingRef = useRef(false);
  const thumb = useMemo(() => {
    const angle = (hsv.h * Math.PI) / 180;
    const radius = hsv.s * 50;
    return {
      x: 50 + Math.sin(angle) * radius,
      y: 50 - Math.cos(angle) * radius,
    };
  }, [hsv.h, hsv.s]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const size = 320;
    const center = size / 2;
    const radius = center - 1;
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext("2d", { willReadFrequently: false });
    const image = context.createImageData(size, size);

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const deltaX = x - center;
        const deltaY = y - center;
        const distance = Math.hypot(deltaX, deltaY);
        const index = (y * size + x) * 4;

        if (distance > radius) {
          image.data[index + 3] = 0;
          continue;
        }

        const saturation = clamp(distance / radius, 0, 1, 0);
        const hue = ((Math.atan2(deltaX, -deltaY) * 180) / Math.PI + 360) % 360;
        const [red, green, blue] = hsvToRgb(hue, saturation, 1);
        image.data[index] = red;
        image.data[index + 1] = green;
        image.data[index + 2] = blue;
        image.data[index + 3] = 255;
      }
    }

    context.putImageData(image, 0, 0);
  }, []);

  const updateFromPointer = useCallback(
    (event) => {
      const rect = wheelRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = event.clientX - centerX;
      const deltaY = event.clientY - centerY;
      const radius = rect.width / 2;
      const saturation = clamp(Math.hypot(deltaX, deltaY) / radius, 0, 1, 0);
      const hue = (Math.atan2(deltaX, -deltaY) * 180) / Math.PI;

      onChange({
        h: (hue + 360) % 360,
        s: saturation,
      });
    },
    [onChange],
  );

  const startDrag = useCallback(
    (event) => {
      event.preventDefault();
      isDraggingRef.current = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      updateFromPointer(event);
    },
    [updateFromPointer],
  );

  const moveDrag = useCallback(
    (event) => {
      if (!isDraggingRef.current) {
        return;
      }
      updateFromPointer(event);
    },
    [updateFromPointer],
  );

  const stopDrag = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const nudgeHue = useCallback(
    (delta) => {
      onChange({ h: (hsv.h + delta + 360) % 360 });
    },
    [hsv.h, onChange],
  );

  return (
    <div
      ref={wheelRef}
      className="color-wheel"
      role="slider"
      aria-label={ariaLabel}
      aria-valuetext={hsvToHex(hsv.h, hsv.s, hsv.v)}
      tabIndex={0}
      style={{
        "--wheel-color": hsvToHex(hsv.h, hsv.s, hsv.v),
        "--wheel-thumb-x": `${thumb.x}%`,
        "--wheel-thumb-y": `${thumb.y}%`,
      }}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowUp") {
          event.preventDefault();
          nudgeHue(8);
        }
        if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
          event.preventDefault();
          nudgeHue(-8);
        }
      }}
    >
      <canvas ref={canvasRef} className="color-wheel-canvas" aria-hidden="true" />
      <span className="color-wheel-crosshair" />
      <span className="color-wheel-thumb" />
    </div>
  );
}

function CropDialog({ sourceUrl, onApply, onClose }) {
  const imageRef = useRef(null);
  const dragStartRef = useRef(null);
  const [crop, setCrop] = useState(DEFAULT_CROP);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const startCrop = useCallback((event) => {
    const point = getImagePoint(event, imageRef.current);
    if (!point) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragStartRef.current = point;
    setCrop({ x: point.x, y: point.y, width: 0.001, height: 0.001 });
  }, []);

  const updateCrop = useCallback((event) => {
    if (!dragStartRef.current) {
      return;
    }

    const point = getImagePoint(event, imageRef.current);
    if (!point) {
      return;
    }

    const start = dragStartRef.current;
    const x = Math.min(start.x, point.x);
    const y = Math.min(start.y, point.y);
    const width = Math.max(Math.abs(point.x - start.x), 0.01);
    const height = Math.max(Math.abs(point.y - start.y), 0.01);
    setCrop({ x, y, width, height });
  }, []);

  const stopCrop = useCallback(() => {
    dragStartRef.current = null;
  }, []);

  const applySelectedCrop = useCallback(async () => {
    setError("");
    try {
      const croppedDataUrl = await cropImageToPng(imageRef.current, crop);
      onApply(croppedDataUrl);
    } catch (error) {
      setError(
        error.message ||
          "Crop failed. If this is an external image, download and re-upload it first.",
      );
    }
  }, [crop, onApply]);

  return (
    <div className="crop-dialog" role="dialog" aria-label="Crop image">
      <div className="crop-panel">
        <div
          className="crop-image-frame"
          onPointerDown={startCrop}
          onPointerMove={updateCrop}
          onPointerUp={stopCrop}
          onPointerCancel={stopCrop}
        >
          <img
            ref={imageRef}
            src={sourceUrl}
            crossOrigin="anonymous"
            alt=""
            draggable={false}
          />
          <div
            className="crop-selection"
            style={{
              left: `${crop.x * 100}%`,
              top: `${crop.y * 100}%`,
              width: `${crop.width * 100}%`,
              height: `${crop.height * 100}%`,
            }}
          />
        </div>
        <div className="crop-actions">
          <span>Drag on the image to choose a crop area.</span>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" onClick={() => void applySelectedCrop()}>
            Apply crop
          </button>
        </div>
        {error && <div className="crop-error">{error}</div>}
      </div>
    </div>
  );
}

function parseBlocksJSON(blocksJSON) {
  if (typeof blocksJSON !== "string" || blocksJSON.trim() === "") {
    return null;
  }

  try {
    const parsed = JSON.parse(blocksJSON);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function mergeNotes(notes, updatedNote) {
  const noteMap = new Map();
  for (const note of Array.isArray(notes) ? notes : []) {
    if (note?.id) {
      noteMap.set(note.id, note);
    }
  }

  if (updatedNote?.id) {
    noteMap.set(updatedNote.id, {
      ...noteMap.get(updatedNote.id),
      ...updatedNote,
    });
  }

  return [...noteMap.values()].sort(
    (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0),
  );
}

function mergeTrashedNotes(notes, updatedNote) {
  const noteMap = new Map();
  for (const note of Array.isArray(notes) ? notes : []) {
    if (note?.id) {
      noteMap.set(note.id, note);
    }
  }

  if (updatedNote?.id) {
    noteMap.set(updatedNote.id, {
      ...noteMap.get(updatedNote.id),
      ...updatedNote,
    });
  }

  return [...noteMap.values()].sort(
    (a, b) =>
      (b.trashedAt ?? 0) - (a.trashedAt ?? 0) ||
      (b.updatedAt ?? 0) - (a.updatedAt ?? 0),
  );
}

function normalizeTitle(value, fallback = DEFAULT_TITLE) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 80)
    : fallback;
}

function isTitleManuallyEdited(note) {
  return note?.titleManuallyEdited === true;
}

function getNoteDisplayTitle(note, blocks = null) {
  if (isTitleManuallyEdited(note)) {
    return normalizeTitle(note?.title);
  }

  const titleFromBlocks = deriveAutomaticTitleFromBlocks(
    blocks ?? parseBlocksJSON(note?.blocksJSON),
  );
  if (titleFromBlocks !== DEFAULT_TITLE) {
    return titleFromBlocks;
  }

  return deriveAutomaticTitleFromMarkdown(note?.markdown);
}

function deriveAutomaticTitleFromBlocks(blocks) {
  const titleText = extractFirstBlockTitleText(blocks);
  return normalizeAutomaticTitleText(titleText);
}

function deriveAutomaticTitleFromMarkdown(markdown) {
  if (typeof markdown !== "string") {
    return DEFAULT_TITLE;
  }

  const line = markdown
    .split(/\r?\n/)
    .find((candidate) => stripMarkdownTitleSyntax(candidate).trim());

  return normalizeAutomaticTitleText(line ? stripMarkdownTitleSyntax(line) : "");
}

function normalizeAutomaticTitleText(value) {
  if (typeof value !== "string") {
    return DEFAULT_TITLE;
  }

  const normalizedText = value.replace(/\s+/g, " ").trim();
  return normalizedText
    ? normalizedText.slice(0, AUTO_TITLE_MAX_LENGTH)
    : DEFAULT_TITLE;
}

function extractFirstBlockTitleText(blocks) {
  if (!Array.isArray(blocks)) {
    return "";
  }

  for (const block of blocks) {
    const contentText = extractBlockPlainText(block?.content);
    if (contentText.trim()) {
      return contentText;
    }

    const childText = extractFirstBlockTitleText(block?.children);
    if (childText.trim()) {
      return childText;
    }
  }

  return "";
}

function stripMarkdownTitleSyntax(value) {
  return String(value)
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .replace(/^\[[ xX]\]\s+/, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`~]/g, "");
}

function formatTrashTimestamp(value) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return "Deleted recently";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Deleted recently";
  }

  return `Deleted ${date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function getSessionShortcutLabel(index) {
  return `⌘${index + 1}`;
}

function getShortcutLabel(keys) {
  return `⌘${keys}`;
}

const FLOATING_EDITOR_MENU_MARGIN = 8;
const FLOATING_EDITOR_MENU_GAP = 5;
const BLOCKNOTE_FLOATING_MENU_SELECTOR = [
  ".bn-menu-dropdown",
  ".mantine-Popover-dropdown",
  "[data-menu-dropdown='true']",
].join(", ");
const BLOCKNOTE_NESTED_COLOR_ITEM_SELECTOR = [
  ".bn-color-picker-dropdown [data-test^='text-color-']",
  ".bn-color-picker-dropdown [data-test^='background-color-']",
].join(", ");
const BLOCKNOTE_VISIBLE_OVERFLOW_MENU_SELECTOR = [
  ".bn-drag-handle-menu",
  ".bn-table-handle-menu",
].join(", ");

function useBlockNoteFloatingMenuGuard() {
  useEffect(() => {
    let animationFrame = 0;

    const schedulePositionUpdate = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = window.requestAnimationFrame(repositionBlockNoteFloatingMenus);
      });
    };
    const scheduleDelayedPositionUpdate = (event) => {
      if (isBlockNoteFloatingMenuInteraction(event)) {
        return;
      }

      schedulePositionUpdate();
      window.setTimeout(schedulePositionUpdate, 0);
      window.setTimeout(schedulePositionUpdate, 80);
      window.setTimeout(schedulePositionUpdate, 180);
    };

    const observer = new MutationObserver(schedulePositionUpdate);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    window.addEventListener("resize", schedulePositionUpdate);
    window.addEventListener("scroll", scheduleDelayedPositionUpdate, true);
    document.addEventListener("mousedown", scheduleDelayedPositionUpdate, true);
    document.addEventListener(
      "pointerup",
      dispatchBlockNoteColorItemClick,
      true,
    );
    document.addEventListener("pointerup", scheduleDelayedPositionUpdate, true);
    document.addEventListener("click", scheduleDelayedPositionUpdate);
    document.addEventListener("keydown", scheduleDelayedPositionUpdate, true);
    document.addEventListener("selectionchange", scheduleDelayedPositionUpdate);
    scheduleDelayedPositionUpdate();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
      window.removeEventListener("resize", schedulePositionUpdate);
      window.removeEventListener("scroll", scheduleDelayedPositionUpdate, true);
      document.removeEventListener("mousedown", scheduleDelayedPositionUpdate, true);
      document.removeEventListener(
        "pointerup",
        dispatchBlockNoteColorItemClick,
        true,
      );
      document.removeEventListener("pointerup", scheduleDelayedPositionUpdate, true);
      document.removeEventListener("click", scheduleDelayedPositionUpdate);
      document.removeEventListener("keydown", scheduleDelayedPositionUpdate, true);
      document.removeEventListener("selectionchange", scheduleDelayedPositionUpdate);
    };
  }, []);
}

function dispatchBlockNoteColorItemClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const colorItem = target.closest(BLOCKNOTE_NESTED_COLOR_ITEM_SELECTOR);
  if (!(colorItem instanceof HTMLElement)) {
    return;
  }

  const colorMenu = colorItem.closest(".bn-color-picker-dropdown");
  if (!colorMenu) {
    return;
  }

  colorItem.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window,
    }),
  );
}

function isBlockNoteFloatingMenuInteraction(event) {
  const target = event?.target;
  return target instanceof Element && Boolean(target.closest(BLOCKNOTE_FLOATING_MENU_SELECTOR));
}

function repositionBlockNoteFloatingMenus() {
  for (const element of document.querySelectorAll(BLOCKNOTE_FLOATING_MENU_SELECTOR)) {
    if (
      !(element instanceof HTMLElement) ||
      element.closest(".editor-floating-menu")
    ) {
      continue;
    }

    if (isNestedBlockNoteFloatingMenu(element)) {
      keepNestedElementInsideViewport(element);
      continue;
    }

    keepElementInsideViewport(element);
  }
}

function isNestedBlockNoteFloatingMenu(element) {
  return Boolean(element.parentElement?.closest(BLOCKNOTE_FLOATING_MENU_SELECTOR));
}

function keepElementInsideViewport(element) {
  const computedStyle = window.getComputedStyle(element);
  if (
    computedStyle.display === "none" ||
    computedStyle.visibility === "hidden" ||
    Number(computedStyle.opacity) <= 0.01 ||
    element.getAttribute("aria-hidden") === "true"
  ) {
    return;
  }

  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0 || element.scrollHeight <= 0) {
    return;
  }

  const margin = FLOATING_EDITOR_MENU_MARGIN;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const maxWidth = Math.max(1, viewportWidth - margin * 2);
  const maxHeight = Math.max(80, viewportHeight - margin * 2);
  const hasNestedFloatingMenu = Boolean(
    element.querySelector(
      ".bn-menu-dropdown, .mantine-Menu-dropdown, .mantine-Popover-dropdown",
    ),
  );
  const measuredWidth = hasNestedFloatingMenu
    ? rect.width
    : Math.max(rect.width, element.scrollWidth || rect.width);
  const measuredHeight = hasNestedFloatingMenu
    ? rect.height
    : Math.max(rect.height, element.scrollHeight || rect.height);
  const desiredWidth = Math.min(
    measuredWidth,
    maxWidth,
  );
  const desiredHeight = Math.min(
    measuredHeight,
    maxHeight,
  );
  const left = clamp(
    rect.left,
    margin,
    Math.max(margin, viewportWidth - desiredWidth - margin),
  );
  const top = clamp(
    rect.top,
    margin,
    Math.max(margin, viewportHeight - desiredHeight - margin),
  );
  const containingRect = getFixedPositionContainingRect(element);
  const allowsVisibleOverflow =
    hasNestedFloatingMenu || element.matches(BLOCKNOTE_VISIBLE_OVERFLOW_MENU_SELECTOR);

  setImportantStyle(element, "position", "fixed");
  setImportantStyle(element, "transform", "none");
  setImportantStyle(element, "left", `${left - containingRect.left}px`);
  setImportantStyle(element, "top", `${top - containingRect.top}px`);
  setImportantStyle(element, "max-width", `${maxWidth}px`);
  setImportantStyle(element, "max-height", `${maxHeight}px`);
  setImportantStyle(element, "overflow", allowsVisibleOverflow ? "visible" : "auto");
}

function keepNestedElementInsideViewport(element) {
  const computedStyle = window.getComputedStyle(element);
  if (
    computedStyle.display === "none" ||
    computedStyle.visibility === "hidden" ||
    Number(computedStyle.opacity) <= 0.01 ||
    element.getAttribute("aria-hidden") === "true"
  ) {
    return;
  }

  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0 || element.scrollHeight <= 0) {
    return;
  }

  const margin = FLOATING_EDITOR_MENU_MARGIN;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const maxWidth = Math.max(1, viewportWidth - margin * 2);
  const maxHeight = Math.max(80, viewportHeight - margin * 2);
  const currentLeft = Number.parseFloat(computedStyle.left);
  const currentTop = Number.parseFloat(computedStyle.top);
  const baseLeft = Number.isFinite(currentLeft) ? currentLeft : 0;
  const baseTop = Number.isFinite(currentTop) ? currentTop : 0;
  let nextLeft = baseLeft;
  let nextTop = baseTop;

  if (rect.right > viewportWidth - margin) {
    nextLeft -= rect.right - (viewportWidth - margin);
  }
  if (rect.left + (nextLeft - baseLeft) < margin) {
    nextLeft += margin - (rect.left + (nextLeft - baseLeft));
  }
  if (rect.bottom > viewportHeight - margin) {
    nextTop -= rect.bottom - (viewportHeight - margin);
  }
  if (rect.top + (nextTop - baseTop) < margin) {
    nextTop += margin - (rect.top + (nextTop - baseTop));
  }

  setImportantStyle(element, "transform", "none");
  setImportantStyle(element, "left", `${nextLeft}px`);
  setImportantStyle(element, "top", `${nextTop}px`);
  setImportantStyle(element, "max-width", `${maxWidth}px`);
  setImportantStyle(element, "max-height", `${maxHeight}px`);
  setImportantStyle(element, "overflow", "auto");
}

function setImportantStyle(element, property, value) {
  if (
    element.style.getPropertyValue(property) === value &&
    element.style.getPropertyPriority(property) === "important"
  ) {
    return;
  }

  element.style.setProperty(property, value, "important");
}

function getFixedPositionContainingRect(element) {
  let parent = element.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const style = window.getComputedStyle(parent);
    if (
      style.transform !== "none" ||
      style.perspective !== "none" ||
      style.filter !== "none" ||
      style.backdropFilter !== "none" ||
      style.willChange.includes("transform")
    ) {
      const rect = parent.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
      };
    }
    parent = parent.parentElement;
  }

  return {
    left: 0,
    top: 0,
  };
}

function FloatingDropdownMenu({
  anchorRef,
  ariaLabel,
  children,
  className = "",
  id,
  isOpen,
  maxHeight = 220,
  maxWidth = 260,
  minWidth = 120,
  onRequestClose,
  preferredWidth = 180,
  align = "start",
}) {
  const [style, setStyle] = useState(null);
  const menuRef = useRef(null);

  const updatePosition = useCallback(() => {
    const anchorElement = anchorRef.current;
    if (!isOpen || !anchorElement) {
      setStyle(null);
      return;
    }

    setStyle(
      getFloatingDropdownMenuStyle(anchorElement, {
        align,
        maxHeight,
        maxWidth,
        minWidth,
        preferredWidth,
      }),
    );
  }, [
    align,
    anchorRef,
    isOpen,
    maxHeight,
    maxWidth,
    minWidth,
    preferredWidth,
  ]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setStyle(null);
      return undefined;
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen || !onRequestClose) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (
        menuRef.current?.contains(target) ||
        anchorRef.current?.contains(target)
      ) {
        return;
      }

      onRequestClose();
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onRequestClose();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [anchorRef, isOpen, onRequestClose]);

  if (!isOpen || !style || typeof document === "undefined") {
    return null;
  }
  const { placement, ...positionStyle } = style;

  return createPortal(
    <div
      ref={menuRef}
      id={id}
      className={`notepane-dropdown-menu ${className} editor-floating-menu`.trim()}
      role="listbox"
      aria-label={ariaLabel}
      data-placement={placement}
      style={positionStyle}
      onMouseDown={preventFocusLoss}
    >
      {children}
    </div>,
    document.body,
  );
}

function DropdownMenuOption({
  children,
  className = "",
  meta = null,
  selected = false,
  style,
  onClick,
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected ? "true" : "false"}
      className={`notepane-dropdown-option ${className}`.trim()}
      style={style}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={onClick}
    >
      <span className="notepane-dropdown-option-check" aria-hidden="true">
        {selected && <Check className="notepane-action-icon" />}
      </span>
      <span className="notepane-dropdown-option-label">{children}</span>
      {meta && <span className="notepane-dropdown-option-meta">{meta}</span>}
    </button>
  );
}

function AdaptiveTooltipPortal() {
  const [tooltip, setTooltip] = useState(null);
  const targetRef = useRef(null);

  const showTooltip = useCallback((target) => {
    const text = target?.getAttribute?.("data-tooltip")?.trim();
    if (!text) {
      return;
    }

    targetRef.current = target;
    setTooltip({ target, text });
  }, []);

  const hideTooltip = useCallback((target) => {
    if (target && targetRef.current !== target) {
      return;
    }

    targetRef.current = null;
    setTooltip(null);
  }, []);

  useEffect(() => {
    const handlePointerOver = (event) => {
      const target = getTooltipTarget(event.target);
      if (!target) {
        return;
      }

      if (
        event.relatedTarget instanceof Node &&
        target.contains(event.relatedTarget)
      ) {
        return;
      }

      showTooltip(target);
    };

    const handlePointerOut = (event) => {
      const target = getTooltipTarget(event.target);
      if (!target) {
        return;
      }

      if (
        event.relatedTarget instanceof Node &&
        target.contains(event.relatedTarget)
      ) {
        return;
      }

      hideTooltip(target);
    };

    const handleFocusIn = (event) => {
      const target = getTooltipTarget(event.target);
      if (target) {
        showTooltip(target);
      }
    };

    const handleFocusOut = (event) => {
      const target = getTooltipTarget(event.target);
      if (target) {
        hideTooltip(target);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        hideTooltip();
      }
    };

    document.addEventListener("pointerover", handlePointerOver, true);
    document.addEventListener("pointerout", handlePointerOut, true);
    document.addEventListener("focusin", handleFocusIn, true);
    document.addEventListener("focusout", handleFocusOut, true);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("pointerover", handlePointerOver, true);
      document.removeEventListener("pointerout", handlePointerOut, true);
      document.removeEventListener("focusin", handleFocusIn, true);
      document.removeEventListener("focusout", handleFocusOut, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [hideTooltip, showTooltip]);

  if (!tooltip || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AdaptiveTooltip target={tooltip.target} text={tooltip.text} />,
    document.body,
  );
}

function AdaptiveTooltip({ target, text }) {
  const tooltipRef = useRef(null);
  const [style, setStyle] = useState({
    left: 0,
    top: 0,
    visibility: "hidden",
  });
  const { placement, ...positionStyle } = style;

  const updatePosition = useCallback(() => {
    const tooltipElement = tooltipRef.current;
    if (!tooltipElement || !target || !document.documentElement.contains(target)) {
      return;
    }

    const anchorRect = target.getBoundingClientRect();
    const tooltipRect = tooltipElement.getBoundingClientRect();
    setStyle(
      getAdaptiveTooltipStyle(anchorRect, {
        width: tooltipRect.width,
        height: tooltipRect.height,
      }),
    );
  }, [target]);

  useLayoutEffect(() => {
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [updatePosition, text]);

  return (
    <div
      ref={tooltipRef}
      className="adaptive-tooltip"
      data-placement={placement}
      role="tooltip"
      style={positionStyle}
    >
      {text}
    </div>
  );
}

function getTooltipTarget(target) {
  if (!(target instanceof Element)) {
    return null;
  }

  return target.closest(".has-tooltip[data-tooltip]");
}

const ADAPTIVE_TOOLTIP_MARGIN = 8;
const ADAPTIVE_TOOLTIP_GAP = 8;

function getAdaptiveTooltipStyle(anchorRect, tooltipSize) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.max(1, tooltipSize.width);
  const height = Math.max(1, tooltipSize.height);
  const margin = ADAPTIVE_TOOLTIP_MARGIN;
  const gap = ADAPTIVE_TOOLTIP_GAP;
  const centeredLeft = anchorRect.left + anchorRect.width / 2 - width / 2;
  const clampLeft = (left) =>
    clamp(left, margin, Math.max(margin, viewportWidth - width - margin));
  const clampTop = (top) =>
    clamp(top, margin, Math.max(margin, viewportHeight - height - margin));
  const verticalCandidates = [
    {
      placement: "bottom",
      left: clampLeft(centeredLeft),
      top: anchorRect.bottom + gap,
    },
    {
      placement: "top",
      left: clampLeft(centeredLeft),
      top: anchorRect.top - height - gap,
    },
  ];
  const selectedVertical = verticalCandidates.find(
    (candidate) =>
      candidate.top >= margin &&
      candidate.top + height <= viewportHeight - margin,
  );
  const sidePlacement =
    anchorRect.left + anchorRect.width / 2 < viewportWidth / 2
      ? "right"
      : "left";
  const sideLeft =
    sidePlacement === "right"
      ? anchorRect.right + gap
      : anchorRect.left - width - gap;
  const selected =
    selectedVertical ?? {
      placement: sidePlacement,
      left: clampLeft(sideLeft),
      top: clampTop(anchorRect.top + anchorRect.height / 2 - height / 2),
    };

  return {
    left: `${selected.left}px`,
    top: `${clampTop(selected.top)}px`,
    placement: selected.placement,
    visibility: "visible",
  };
}

function getFloatingDropdownMenuStyle(
  anchorElement,
  { align, maxHeight, maxWidth, minWidth, preferredWidth },
) {
  const anchorRect = anchorElement.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const margin = FLOATING_EDITOR_MENU_MARGIN;
  const viewportAvailableWidth = Math.max(1, viewportWidth - margin * 2);
  const resolvedMaxWidth = clamp(maxWidth, 1, viewportAvailableWidth);
  const resolvedMinWidth = Math.min(
    resolvedMaxWidth,
    Math.max(1, minWidth, anchorRect.width),
  );
  const width = clamp(preferredWidth, resolvedMinWidth, resolvedMaxWidth);
  const spaceBelow = viewportHeight - anchorRect.bottom - margin;
  const spaceAbove = anchorRect.top - margin;
  const shouldOpenAbove =
    spaceBelow < Math.min(maxHeight, 132) && spaceAbove > spaceBelow;
  const availableHeight = shouldOpenAbove ? spaceAbove : spaceBelow;
  const height = Math.max(72, Math.min(maxHeight, availableHeight));
  const rawLeft =
    align === "end"
      ? anchorRect.right - width
      : align === "center"
        ? anchorRect.left + anchorRect.width / 2 - width / 2
        : anchorRect.left;
  const left = clamp(
    rawLeft,
    margin,
    Math.max(margin, viewportWidth - width - margin),
  );
  const top = shouldOpenAbove
    ? clamp(
        anchorRect.top - height - FLOATING_EDITOR_MENU_GAP,
        margin,
        Math.max(margin, viewportHeight - height - margin),
      )
    : clamp(
        anchorRect.bottom + FLOATING_EDITOR_MENU_GAP,
        margin,
        Math.max(margin, viewportHeight - height - margin),
      );

  return {
    left: `${left}px`,
    maxHeight: `${height}px`,
    placement: shouldOpenAbove ? "top" : "bottom",
    top: `${top}px`,
    width: `${width}px`,
  };
}

function EditorFontFamilyControl({
  className = "",
  fontFamily,
  fontOptions = EDITOR_BUILTIN_FONT_FAMILY_OPTIONS,
  onFontFamilyChange,
}) {
  const normalizedFontFamily = normalizeEditorFontFamily(fontFamily);
  const selectedFontOption = getEditorFontFamilyOption(
    normalizedFontFamily,
    fontOptions,
  );
  const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);
  const [fontQuery, setFontQuery] = useState("");
  const fontMenuAnchorRef = useRef(null);
  const filteredFontOptions = useMemo(
    () => filterEditorFontOptions(fontOptions, fontQuery),
    [fontOptions, fontQuery],
  );

  const closeFontMenu = useCallback(() => {
    setFontQuery("");
    setIsFontMenuOpen(false);
  }, []);

  const applyFontFamily = useCallback(
    (nextFontFamily) => {
      const normalizedValue = normalizeEditorFontFamily(nextFontFamily);
      const option = getEditorFontFamilyOption(normalizedValue, fontOptions);
      onFontFamilyChange(normalizedValue);
      setFontQuery(option.label === selectedFontOption.label ? "" : option.label);
      closeFontMenu();
    },
    [closeFontMenu, fontOptions, onFontFamilyChange, selectedFontOption.label],
  );

  return (
    <div
      ref={fontMenuAnchorRef}
      className={`editor-font-setting-control editor-font-family-control ${className}`.trim()}
      onMouseDown={preventFocusLoss}
    >
      <div className="editor-font-family-combobox">
        <input
          className="editor-font-family-input"
          aria-label="Editor font family"
          role="combobox"
          aria-expanded={isFontMenuOpen ? "true" : "false"}
          aria-haspopup="listbox"
          aria-controls="editor-font-family-options"
          spellCheck={false}
          placeholder={selectedFontOption.label}
          value={isFontMenuOpen ? fontQuery : selectedFontOption.label}
          onMouseDown={(event) => event.stopPropagation()}
          onFocus={() => {
            setFontQuery("");
            setIsFontMenuOpen(true);
          }}
          onChange={(event) => {
            setFontQuery(event.target.value);
            setIsFontMenuOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setIsFontMenuOpen(true);
              return;
            }

            if (event.key === "Enter") {
              event.preventDefault();
              const firstOption = filteredFontOptions[0];
              if (firstOption) {
                applyFontFamily(firstOption.value);
              }
              event.currentTarget.blur();
              return;
            }

            if (event.key === "Escape") {
              event.preventDefault();
              closeFontMenu();
              event.currentTarget.blur();
            }
          }}
        />
        <button
          type="button"
          className="editor-font-family-menu-button"
          aria-label="Open font family menu"
          aria-haspopup="listbox"
          aria-expanded={isFontMenuOpen ? "true" : "false"}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={() => {
            setFontQuery("");
            setIsFontMenuOpen((value) => !value);
          }}
        >
          ⌄
        </button>
        <FloatingDropdownMenu
          id="editor-font-family-options"
          anchorRef={fontMenuAnchorRef}
          ariaLabel="Font family options"
          className="editor-font-family-menu"
          isOpen={isFontMenuOpen}
          maxHeight={216}
          maxWidth={238}
          minWidth={168}
          onRequestClose={closeFontMenu}
          preferredWidth={218}
        >
          {filteredFontOptions.length > 0 ? (
            filteredFontOptions.map((option) => (
              <DropdownMenuOption
                key={option.value}
                className="editor-font-family-option"
                selected={option.value === normalizedFontFamily}
                style={{ "--font-option-family": option.css }}
                onClick={() => applyFontFamily(option.value)}
                meta={option.source === "installed" ? "Local" : null}
              >
                {option.label}
              </DropdownMenuOption>
            ))
          ) : (
            <div className="editor-font-family-empty">No fonts found</div>
          )}
        </FloatingDropdownMenu>
      </div>
    </div>
  );
}

function EditorFontSizeControl({
  className = "",
  draftValue,
  scale,
  onDraftChange,
  onCommit,
  onFontSizeChange,
}) {
  const currentFontSize = editorFontScaleToSize(scale);
  const [isSizeMenuOpen, setIsSizeMenuOpen] = useState(false);
  const sizeMenuAnchorRef = useRef(null);

  const closeSizeMenu = useCallback(() => {
    setIsSizeMenuOpen(false);
  }, []);

  const applyFontSize = useCallback(
    (nextSize) => {
      const normalizedSize = normalizeEditorFontSize(nextSize, currentFontSize);
      onDraftChange(String(normalizedSize));
      onFontSizeChange(normalizedSize);
      closeSizeMenu();
    },
    [closeSizeMenu, currentFontSize, onDraftChange, onFontSizeChange],
  );

  return (
    <div
      ref={sizeMenuAnchorRef}
      className={`editor-font-setting-control editor-font-size-control ${className}`.trim()}
      onMouseDown={preventFocusLoss}
    >
      <div className="editor-font-size-combobox">
        <input
          className="editor-font-size-input"
          aria-label="Editor font size"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          min={MIN_EDITOR_FONT_SIZE_PX}
          max={MAX_EDITOR_FONT_SIZE_PX}
          value={draftValue}
          onMouseDown={(event) => event.stopPropagation()}
          onChange={(event) => {
            const nextValue = event.target.value.trim();
            const nextSize = Number(nextValue);
            onDraftChange(nextValue);
            if (
              /^\d{1,3}$/.test(nextValue) &&
              Number.isFinite(nextSize) &&
              nextSize >= MIN_EDITOR_FONT_SIZE_PX &&
              nextSize <= MAX_EDITOR_FONT_SIZE_PX
            ) {
              onFontSizeChange(nextSize);
            }
          }}
          onFocus={() => setIsSizeMenuOpen(false)}
          onBlur={onCommit}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setIsSizeMenuOpen(true);
              return;
            }
            if (event.key === "Enter") {
              event.preventDefault();
              onCommit();
              event.currentTarget.blur();
              return;
            }
            if (event.key === "Escape") {
              event.preventDefault();
              onDraftChange(String(currentFontSize));
              closeSizeMenu();
              event.currentTarget.blur();
            }
          }}
        />
        <button
          type="button"
          className="editor-font-size-menu-button"
          aria-label="Open font size menu"
          aria-haspopup="listbox"
          aria-expanded={isSizeMenuOpen ? "true" : "false"}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={() => setIsSizeMenuOpen((value) => !value)}
        >
          ⌄
        </button>
        <FloatingDropdownMenu
          anchorRef={sizeMenuAnchorRef}
          ariaLabel="Editor font size presets"
          className="editor-font-size-menu"
          isOpen={isSizeMenuOpen}
          align="end"
          maxHeight={196}
          maxWidth={104}
          minWidth={76}
          onRequestClose={closeSizeMenu}
          preferredWidth={86}
        >
          {EDITOR_FONT_SIZE_PRESETS.map((fontSize) => (
            <DropdownMenuOption
              key={fontSize}
              className="editor-font-size-option"
              selected={currentFontSize === fontSize}
              onClick={() => applyFontSize(fontSize)}
            >
              {fontSize}
            </DropdownMenuOption>
          ))}
        </FloatingDropdownMenu>
      </div>
    </div>
  );
}

function normalizeAppTheme(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    mode: source.mode === "dark" ? "dark" : "light",
  };
}

function normalizeLayoutMode(value) {
  return value === "sticky" ? "sticky" : DEFAULT_LAYOUT_MODE;
}

function normalizeEditorPreferences(
  value,
  fallback = DEFAULT_EDITOR_PREFERENCES,
) {
  const source = value && typeof value === "object" ? value : {};
  const fallbackSource = fallback && typeof fallback === "object"
    ? fallback
    : DEFAULT_EDITOR_PREFERENCES;

  return {
    editorFontScale: normalizeEditorFontScale(
      source.editorFontScale,
      fallbackSource.editorFontScale,
    ),
    editorFontFamily: normalizeEditorFontFamily(
      source.editorFontFamily,
      fallbackSource.editorFontFamily,
    ),
    showTableOfContents:
      typeof source.showTableOfContents === "boolean"
        ? source.showTableOfContents
        : Boolean(fallbackSource.showTableOfContents),
  };
}

function normalizeTheme(value) {
  const source = value && typeof value === "object" ? value : {};
  const migratedTabTextColor =
    isHexColor(source.textColor) &&
    source.textColor.toLowerCase() !== "#211b0c"
      ? source.textColor.toLowerCase()
      : DEFAULT_THEME.tabTextColor;

  return {
    tabTextColor: normalizeOptionalHexColor(
      source.tabTextColor,
      migratedTabTextColor,
    ),
    tabTextOpacity: normalizeOpacity(
      source.tabTextOpacity,
      DEFAULT_THEME.tabTextOpacity,
    ),
  };
}

function isHexColor(value) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function normalizeOptionalHexColor(value, fallback = null) {
  return isHexColor(value)
    ? value.toLowerCase()
    : isHexColor(fallback)
      ? fallback.toLowerCase()
      : null;
}

function normalizeOpacity(value, fallback = DEFAULT_THEME.tabTextOpacity) {
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
    : DEFAULT_THEME.tabTextOpacity;
}

function normalizeEditorFontScale(value, fallback = DEFAULT_EDITOR_FONT_SCALE) {
  const numericValue = Number(value);
  const fallbackValue = Number(fallback);
  const resolvedValue = Number.isFinite(numericValue)
    ? numericValue
    : Number.isFinite(fallbackValue)
      ? fallbackValue
      : DEFAULT_EDITOR_FONT_SCALE;

  return Math.round(
    clamp(resolvedValue, MIN_EDITOR_FONT_SCALE, MAX_EDITOR_FONT_SCALE) * 100,
  ) / 100;
}

function normalizeEditorFontSize(value, fallback = BASE_EDITOR_FONT_SIZE_PX) {
  const numericValue = Number(value);
  const fallbackValue = Number(fallback);
  const resolvedValue = Number.isFinite(numericValue)
    ? numericValue
    : Number.isFinite(fallbackValue)
      ? fallbackValue
      : BASE_EDITOR_FONT_SIZE_PX;

  return Math.round(
    clamp(resolvedValue, MIN_EDITOR_FONT_SIZE_PX, MAX_EDITOR_FONT_SIZE_PX),
  );
}

function editorFontScaleToSize(scale) {
  return normalizeEditorFontSize(
    normalizeEditorFontScale(scale) * BASE_EDITOR_FONT_SIZE_PX,
  );
}

function editorFontSizeToScale(fontSize) {
  return normalizeEditorFontScale(
    normalizeEditorFontSize(fontSize) / BASE_EDITOR_FONT_SIZE_PX,
  );
}

function normalizeEditorFontFamily(value, fallback = DEFAULT_EDITOR_FONT_FAMILY) {
  const normalizedValue = normalizeEditorFontFamilyValue(value);
  if (isAllowedEditorFontFamily(normalizedValue)) {
    return normalizedValue;
  }

  const normalizedFallback = normalizeEditorFontFamilyValue(fallback);
  return isAllowedEditorFontFamily(normalizedFallback)
    ? normalizedFallback
    : DEFAULT_EDITOR_FONT_FAMILY;
}

function normalizeEditorFontFamilyValue(value) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmedValue = value.replace(/\s+/g, " ").trim();
  if (trimmedValue.toLowerCase().startsWith(LOCAL_FONT_VALUE_PREFIX)) {
    const family = normalizeInstalledFontFamily(
      trimmedValue.slice(LOCAL_FONT_VALUE_PREFIX.length),
    );
    return family ? `${LOCAL_FONT_VALUE_PREFIX}${family}` : "";
  }

  return trimmedValue.toLowerCase();
}

function isAllowedEditorFontFamily(value) {
  return (
    EDITOR_BUILTIN_FONT_FAMILY_OPTIONS.some((option) => option.value === value) ||
    Boolean(parseLocalFontFamilyValue(value))
  );
}

function getEditorFontFamilyOptions(installedFontFamilies = [], selectedValue = "") {
  const options = [...EDITOR_BUILTIN_FONT_FAMILY_OPTIONS];
  const seenValues = new Set(options.map((option) => option.value));

  for (const family of installedFontFamilies) {
    const normalizedFamily = normalizeInstalledFontFamily(family);
    if (!normalizedFamily) {
      continue;
    }

    const value = `${LOCAL_FONT_VALUE_PREFIX}${normalizedFamily}`;
    if (seenValues.has(value)) {
      continue;
    }

    seenValues.add(value);
    options.push({
      value,
      label: normalizedFamily,
      css: `${quoteFontFamily(normalizedFamily)}, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif`,
      source: "installed",
    });
  }

  const selectedFamily = parseLocalFontFamilyValue(selectedValue);
  if (selectedFamily) {
    const selectedValueKey = `${LOCAL_FONT_VALUE_PREFIX}${selectedFamily}`;
    if (!seenValues.has(selectedValueKey)) {
      options.push({
        value: selectedValueKey,
        label: selectedFamily,
        css: `${quoteFontFamily(selectedFamily)}, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif`,
        source: "installed",
      });
    }
  }

  return options;
}

function filterEditorFontOptions(fontOptions = [], query = "") {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return fontOptions.slice(0, 96);
  }

  return fontOptions
    .filter((option) =>
      `${option.label} ${option.value}`.toLowerCase().includes(normalizedQuery),
    )
    .slice(0, 96);
}

function getEditorFontFamilyOption(value, fontOptions = []) {
  const normalizedValue = normalizeEditorFontFamily(value);
  return (
    fontOptions.find((option) => option.value === normalizedValue) ??
    getEditorFontFamilyOptions([], normalizedValue).find(
      (option) => option.value === normalizedValue,
    ) ??
    EDITOR_BUILTIN_FONT_FAMILY_OPTIONS[0]
  );
}

function getEditorFontFamilyCss(value, fontOptions = []) {
  return (
    fontOptions.find(
      (option) => option.value === normalizeEditorFontFamily(value),
    )?.css ??
    getEditorFontFamilyOption(value, fontOptions).css ??
    EDITOR_BUILTIN_FONT_FAMILY_OPTIONS[0].css
  );
}

function parseLocalFontFamilyValue(value) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmedValue = value.replace(/\s+/g, " ").trim();
  if (!trimmedValue.toLowerCase().startsWith(LOCAL_FONT_VALUE_PREFIX)) {
    return "";
  }

  return normalizeInstalledFontFamily(
    trimmedValue.slice(LOCAL_FONT_VALUE_PREFIX.length),
  );
}

function normalizeInstalledFontFamily(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/["\\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function quoteFontFamily(value) {
  return `"${normalizeInstalledFontFamily(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function resolveTabTextColor(theme, appThemeMode = DEFAULT_APP_THEME.mode) {
  const normalizedTheme = normalizeTheme(theme);
  const modeDefaults =
    MODE_TAB_TEXT_DEFAULTS[appThemeMode] ?? MODE_TAB_TEXT_DEFAULTS.light;
  return isHexColor(normalizedTheme.tabTextColor)
    ? normalizedTheme.tabTextColor
    : modeDefaults.tabTextColor;
}

function resolveThemeAccentColor(theme, fallbackColor) {
  const normalizedTheme = normalizeTheme(theme);
  return isHexColor(normalizedTheme.tabTextColor)
    ? normalizedTheme.tabTextColor
    : normalizeOptionalHexColor(fallbackColor, DEFAULT_STICKY_ACCENT_COLOR);
}

function resolveSessionTabAccentColor(theme, fallbackColor = null) {
  const normalizedTheme = normalizeTheme(theme);
  return isHexColor(normalizedTheme.tabTextColor)
    ? normalizedTheme.tabTextColor
    : normalizeOptionalHexColor(fallbackColor);
}

function resolveStickyAccentColor(theme, noteIndex = 0) {
  return resolveThemeAccentColor(theme, resolveDefaultStickyAccentColor(noteIndex));
}

function resolveTabTextOpacity(theme) {
  return normalizeTheme(theme).tabTextOpacity;
}

function resolveDefaultStickyAccentColor(noteIndex = 0) {
  return STICKY_PASTEL_PALETTE[
    Math.abs(Number.isFinite(noteIndex) ? noteIndex : 0) %
      STICKY_PASTEL_PALETTE.length
  ];
}

function getSessionTabStyle(
  theme,
  appThemeMode = DEFAULT_APP_THEME.mode,
  noteIndex = 0,
) {
  const accentColor = resolveSessionTabAccentColor(
    theme,
    resolveDefaultStickyAccentColor(noteIndex),
  );
  const tabTextOpacity = resolveTabTextOpacity(theme);

  if (!accentColor && tabTextOpacity === DEFAULT_THEME.tabTextOpacity) {
    return {};
  }

  const resolvedAccentColor = accentColor ?? DEFAULT_STICKY_ACCENT_COLOR;
  const displayAccentColor =
    appThemeMode === "dark"
      ? mixHexColors(resolvedAccentColor, "#000000", SESSION_TAB_DARK_MODE_TONE_MIX)
      : resolvedAccentColor;
  const modeBase =
    SESSION_TAB_MODE_BASE_COLORS[appThemeMode] ?? SESSION_TAB_MODE_BASE_COLORS.light;
  const activeEffectiveBackground = blendHexOverHex(
    displayAccentColor,
    modeBase.active,
    tabTextOpacity,
  );
  const activeTextColor = getSessionTabContrastingTextColor(activeEffectiveBackground);
  const inactiveTextColor = hexToCssRgb(activeTextColor, 0.72);
  const activeBorderColor = hexToCssRgb(activeTextColor, 0.34);
  const activeShadowColor = hexToCssRgb(activeTextColor, 0.12);
  const inactiveShadowColor = hexToCssRgb(activeTextColor, 0.04);
  const tabBackground = hexToCssRgb(displayAccentColor, tabTextOpacity);

  return {
    "--session-tab-active-bg": tabBackground,
    "--session-tab-hover-bg": tabBackground,
    "--session-tab-inactive-bg": tabBackground,
    "--session-tab-text-color": activeTextColor,
    "--session-tab-inactive-text-color": inactiveTextColor,
    "--session-tab-border-color": activeBorderColor,
    "--session-tab-active-shadow": `inset 0 0 0 1px ${activeBorderColor}, 0 7px 16px ${activeShadowColor}`,
    "--session-tab-inactive-shadow": `inset 0 0 0 1px ${inactiveShadowColor}`,
    "--session-tab-dot-bg": hexToCssRgb(displayAccentColor, 0.24),
    "--session-tab-dot-text-color": activeTextColor,
  };
}

function getStickyShellStyle(
  theme,
  accentColor,
  appThemeMode = DEFAULT_APP_THEME.mode,
) {
  const opacity = resolveTabTextOpacity(theme);
  const baseBackground = appThemeMode === "dark" ? "#191919" : "#ffffff";
  const effectiveBackground = blendHexOverHex(accentColor, baseBackground, opacity);
  const textColor = getContrastingTextColor(
    effectiveBackground,
    "#37352f",
    "#f7f7f4",
  );
  const isLightBackground = textColor === "#37352f";
  const headerColor = isLightBackground
    ? mixHexColors(accentColor, "#ffffff", 0.46)
    : mixHexColors(accentColor, "#000000", 0.08);
  const headerEffectiveBackground = blendHexOverHex(
    headerColor,
    baseBackground,
    Math.max(opacity, 0.96),
  );
  const panelColor = isLightBackground
    ? mixHexColors(accentColor, "#ffffff", 0.34)
    : mixHexColors(accentColor, "#ffffff", 0.08);
  const panelOpacity = Math.min(opacity + 0.04, 1);
  const panelEffectiveBackground = blendHexOverHex(
    panelColor,
    baseBackground,
    panelOpacity,
  );
  const panelTextColor = getContrastingTextColor(
    panelEffectiveBackground,
    "#37352f",
    "#f7f7f4",
  );
  const isLightPanelBackground = panelTextColor === "#37352f";
  const mutedColor = hexToCssRgb(textColor, isLightBackground ? 0.72 : 0.78);
  const panelMutedColor = hexToCssRgb(
    panelTextColor,
    isLightPanelBackground ? 0.68 : 0.76,
  );
  const borderColor = hexToCssRgb(textColor, isLightBackground ? 0.14 : 0.24);
  const tableBorderColor = getReadableBoundaryColor(
    effectiveBackground,
    textColor,
  );
  const tableControlBackground = mixHexColors(
    effectiveBackground,
    "#000000",
    isLightBackground ? 0.055 : 0.11,
  );
  const tableControlHoverBackground = mixHexColors(
    effectiveBackground,
    "#000000",
    isLightBackground ? 0.09 : 0.16,
  );
  const tableControlBorderColor = mixHexColors(
    effectiveBackground,
    textColor,
    isLightBackground ? 0.18 : 0.22,
  );
  const portalMenuBackground = mixHexColors(
    effectiveBackground,
    isLightBackground ? "#ffffff" : "#000000",
    isLightBackground ? 0.18 : 0.1,
  );
  const portalMenuHoverBackground = mixHexColors(
    portalMenuBackground,
    textColor,
    isLightBackground ? 0.08 : 0.14,
  );
  const portalMenuBorderColor = mixHexColors(
    portalMenuBackground,
    textColor,
    isLightBackground ? 0.16 : 0.22,
  );
  const tableControlShadow = isLightBackground
    ? "0 5px 12px rgb(55 53 47 / 0.12), inset 0 1px 0 rgb(255 255 255 / 0.28)"
    : "0 7px 16px rgb(0 0 0 / 0.34), inset 0 1px 0 rgb(255 255 255 / 0.08)";
  const portalMenuShadow = isLightBackground
    ? "0 12px 26px rgb(55 53 47 / 0.16), inset 0 1px 0 rgb(255 255 255 / 0.38)"
    : "0 14px 34px rgb(0 0 0 / 0.46), inset 0 1px 0 rgb(255 255 255 / 0.08)";
  const blockNoteShadowColor = isLightBackground
    ? "rgb(55 53 47 / 0.18)"
    : "rgb(0 0 0 / 0.48)";
  const controlBackground = isLightBackground
    ? "rgb(255 255 255 / 0.46)"
    : "rgb(0 0 0 / 0.20)";
  const controlHoverBackground = isLightBackground
    ? "rgb(255 255 255 / 0.68)"
    : "rgb(255 255 255 / 0.16)";
  const codeBackground = isLightBackground
    ? "rgb(255 255 255 / 0.52)"
    : "rgb(0 0 0 / 0.30)";
  const glassHighlight = isLightBackground
    ? "rgb(255 255 255 / 0.52)"
    : "rgb(255 255 255 / 0.14)";
  const glassLowlight = isLightBackground
    ? "rgb(55 53 47 / 0.10)"
    : "rgb(0 0 0 / 0.34)";
  const glassStroke = isLightBackground
    ? "rgb(255 255 255 / 0.46)"
    : "rgb(255 255 255 / 0.12)";
  const selectedBackground = isLightBackground ? "#37352f" : "#f7f7f4";
  const selectedText = isLightBackground ? "#ffffff" : "#191919";
  const iconColor = isLightBackground ? "#4f534f" : "#f1f1ef";
  const iconActiveColor = isLightBackground ? "#2f3437" : "#ffffff";
  const iconSurfaceFill = isLightBackground
    ? "rgb(255 255 255 / 0.40)"
    : "rgb(255 255 255 / 0.10)";
  const iconMutedFill = hexToCssRgb(textColor, isLightBackground ? 0.10 : 0.14);

  return {
    "--sticky-note-accent-color": accentColor,
    "--sticky-effective-bg": effectiveBackground,
    "--sticky-note-bg": hexToCssRgb(accentColor, opacity),
    "--sticky-note-header-bg": headerEffectiveBackground,
    "--sticky-note-panel-bg": hexToCssRgb(panelColor, panelOpacity),
    "--sticky-text-color": textColor,
    "--sticky-muted-color": mutedColor,
    "--sticky-panel-text": panelTextColor,
    "--sticky-panel-muted": panelMutedColor,
    "--sticky-border-color": borderColor,
    "--sticky-table-border-color": tableBorderColor,
    "--sticky-table-control-border-color": tableControlBorderColor,
    "--sticky-table-control-bg": tableControlBackground,
    "--sticky-table-control-hover-bg": tableControlHoverBackground,
    "--sticky-table-control-text": textColor,
    "--sticky-table-control-shadow": tableControlShadow,
    "--sticky-portal-menu-bg": portalMenuBackground,
    "--sticky-portal-menu-hover-bg": portalMenuHoverBackground,
    "--sticky-portal-menu-border-color": portalMenuBorderColor,
    "--sticky-portal-menu-shadow": portalMenuShadow,
    "--sticky-control-bg": controlBackground,
    "--sticky-control-hover-bg": controlHoverBackground,
    "--sticky-code-bg": codeBackground,
    "--sticky-code-text": textColor,
    "--sticky-glass-highlight": glassHighlight,
    "--sticky-glass-lowlight": glassLowlight,
    "--sticky-glass-stroke": glassStroke,
    "--bn-colors-editor-text": textColor,
    "--bn-colors-menu-text": textColor,
    "--bn-colors-menu-background": portalMenuBackground,
    "--bn-colors-tooltip-text": textColor,
    "--bn-colors-tooltip-background": portalMenuHoverBackground,
    "--bn-colors-hovered-text": textColor,
    "--bn-colors-hovered-background": portalMenuHoverBackground,
    "--bn-colors-selected-text": selectedText,
    "--bn-colors-selected-background": selectedBackground,
    "--bn-colors-disabled-text": hexToCssRgb(textColor, isLightBackground ? 0.42 : 0.48),
    "--bn-colors-disabled-background": hexToCssRgb(textColor, isLightBackground ? 0.08 : 0.12),
    "--bn-colors-border": borderColor,
    "--bn-colors-shadow": blockNoteShadowColor,
    "--bn-colors-side-menu": mutedColor,
    "--icon-chrome-color": iconColor,
    "--icon-chrome-active-color": iconActiveColor,
    "--icon-surface-fill": iconSurfaceFill,
    "--icon-muted-fill": iconMutedFill,
  };
}

function hexToRgb(hexColor) {
  const hex = isHexColor(hexColor)
    ? hexColor.slice(1)
    : MODE_TAB_TEXT_DEFAULTS.light.tabTextColor.slice(1);
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

function hexToCssRgb(hexColor, opacity = DEFAULT_THEME.tabTextOpacity) {
  const [red, green, blue] = hexToRgb(hexColor);
  return `rgb(${red} ${green} ${blue} / ${normalizeOpacity(opacity)})`;
}

function mixHexColors(hexColor, mixColor, mixAmount) {
  const sourceRgb = hexToRgb(hexColor);
  const mixRgb = hexToRgb(mixColor);
  const amount = clamp(mixAmount, 0, 1, 0);
  return rgbToHex(
    sourceRgb[0] * (1 - amount) + mixRgb[0] * amount,
    sourceRgb[1] * (1 - amount) + mixRgb[1] * amount,
    sourceRgb[2] * (1 - amount) + mixRgb[2] * amount,
  );
}

function blendHexOverHex(foregroundHexColor, backgroundHexColor, foregroundOpacity) {
  const foregroundRgb = hexToRgb(foregroundHexColor);
  const backgroundRgb = hexToRgb(backgroundHexColor);
  const opacity = normalizeOpacity(foregroundOpacity);
  return rgbToHex(
    foregroundRgb[0] * opacity + backgroundRgb[0] * (1 - opacity),
    foregroundRgb[1] * opacity + backgroundRgb[1] * (1 - opacity),
    foregroundRgb[2] * opacity + backgroundRgb[2] * (1 - opacity),
  );
}

function getContrastingTextColor(
  backgroundHexColor,
  darkTextColor = SESSION_TAB_CONTRAST_TEXT.dark,
  lightTextColor = SESSION_TAB_CONTRAST_TEXT.light,
) {
  const darkContrast = getContrastRatio(backgroundHexColor, darkTextColor);
  const lightContrast = getContrastRatio(backgroundHexColor, lightTextColor);
  return darkContrast >= lightContrast ? darkTextColor : lightTextColor;
}

function getSessionTabContrastingTextColor(backgroundHexColor) {
  return getRelativeLuminance(backgroundHexColor) > 0.46
    ? SESSION_TAB_CONTRAST_TEXT.dark
    : SESSION_TAB_CONTRAST_TEXT.light;
}

function getReadableBoundaryColor(
  backgroundHexColor,
  targetHexColor,
  minimumContrast = 3,
) {
  for (let mixAmount = 0.24; mixAmount <= 1; mixAmount += 0.04) {
    const candidateColor = mixHexColors(
      backgroundHexColor,
      targetHexColor,
      mixAmount,
    );

    if (getContrastRatio(candidateColor, backgroundHexColor) >= minimumContrast) {
      return candidateColor;
    }
  }

  return targetHexColor;
}

function getContrastRatio(firstHexColor, secondHexColor) {
  const firstLuminance = getRelativeLuminance(firstHexColor);
  const secondLuminance = getRelativeLuminance(secondHexColor);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function getRelativeLuminance(hexColor) {
  const [red, green, blue] = hexToRgb(hexColor).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function hexToHsv(hexColor) {
  const [red, green, blue] = hexToRgb(hexColor).map((value) => value / 255);
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;

  if (delta !== 0) {
    if (max === red) {
      hue = 60 * (((green - blue) / delta) % 6);
    } else if (max === green) {
      hue = 60 * ((blue - red) / delta + 2);
    } else {
      hue = 60 * ((red - green) / delta + 4);
    }
  }

  const saturation = max === 0 ? 0 : delta / max;
  return {
    h: (hue + 360) % 360,
    s: saturation,
    v: max,
  };
}

function hsvToHex(hue, saturation, value) {
  return `#${hsvToRgb(hue, saturation, value)
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function hsvToRgb(hue, saturation, value) {
  const normalizedHue = ((hue % 360) + 360) % 360;
  const chroma = value * saturation;
  const huePrime = normalizedHue / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime >= 0 && huePrime < 1) {
    red = chroma;
    green = x;
  } else if (huePrime < 2) {
    red = x;
    green = chroma;
  } else if (huePrime < 3) {
    green = chroma;
    blue = x;
  } else if (huePrime < 4) {
    green = x;
    blue = chroma;
  } else if (huePrime < 5) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  const match = value - chroma;
  return [red, green, blue].map((channel) =>
    Math.round((channel + match) * 255),
  );
}

function formatColorValues(hexColor, opacity = DEFAULT_THEME.tabTextOpacity) {
  const [red, green, blue] = hexToRgb(hexColor);
  const hsl = rgbToHsl(red, green, blue);
  const lch = rgbToLch(red, green, blue);
  const alphaSuffix = formatColorAlphaSuffix(opacity);

  return [
    {
      label: "HEX",
      value: hexColor.slice(1).toLowerCase(),
    },
    {
      label: "HSL",
      value: `hsl(${Math.round(hsl.h)}deg ${Math.round(hsl.s * 100)}% ${Math.round(hsl.l * 100)}%${alphaSuffix})`,
    },
    {
      label: "RGB",
      value: `rgb(${red} ${green} ${blue}${alphaSuffix})`,
    },
    {
      label: "LCH",
      value: `lch(${Math.round(lch.l)}% ${Math.round(lch.c)} ${Math.round(lch.h)}deg${alphaSuffix})`,
    },
  ];
}

function formatColorAlphaSuffix(opacity) {
  const normalizedOpacity = normalizeOpacity(opacity);
  if (normalizedOpacity >= 1) {
    return "";
  }

  return ` / ${Math.round(normalizedOpacity * 100)}%`;
}

async function writeClipboardText(value) {
  const text = String(value ?? "");

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall back to the legacy copy path below.
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

function parseColorValue(label, value) {
  const normalizedLabel = String(label).toUpperCase();
  if (normalizedLabel === "HEX") {
    return parseHexColorValue(value);
  }
  if (normalizedLabel === "HSL") {
    return parseHslColorValue(value);
  }
  if (normalizedLabel === "RGB") {
    return parseRgbColorValue(value);
  }
  if (normalizedLabel === "LCH") {
    return parseLchColorValue(value);
  }

  return null;
}

function parseHexColorValue(value) {
  const hex = value.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(hex)) {
    return null;
  }

  return `#${hex.slice(0, 6).toLowerCase()}`;
}

function parseHslColorValue(value) {
  if (!isCompleteFunctionalColorValue(value, "hsl")) {
    return null;
  }

  const numbers = extractColorNumbers(value);
  if (numbers.length < 3) {
    return null;
  }

  const [hue, saturation, lightness] = numbers;
  const [red, green, blue] = hslToRgb(
    hue,
    clamp(saturation / 100, 0, 1, 0),
    clamp(lightness / 100, 0, 1, 0),
  );

  return rgbToHex(red, green, blue);
}

function parseRgbColorValue(value) {
  if (!isCompleteFunctionalColorValue(value, "rgb")) {
    return null;
  }

  const numbers = extractColorNumbers(value);
  if (numbers.length < 3) {
    return null;
  }

  const [red, green, blue] = numbers;
  return rgbToHex(
    clamp(Math.round(red), 0, 255, 0),
    clamp(Math.round(green), 0, 255, 0),
    clamp(Math.round(blue), 0, 255, 0),
  );
}

function parseLchColorValue(value) {
  if (!isCompleteFunctionalColorValue(value, "lch")) {
    return null;
  }

  const numbers = extractColorNumbers(value);
  if (numbers.length < 3) {
    return null;
  }

  const [lightness, chroma, hue] = numbers;
  const [red, green, blue] = lchToRgb(
    clamp(lightness, 0, 100, 0),
    Math.max(0, chroma),
    hue,
  );

  return rgbToHex(red, green, blue);
}

function isCompleteFunctionalColorValue(value, functionName) {
  const trimmedValue = String(value).trim();
  const lowerValue = trimmedValue.toLowerCase();
  if (!lowerValue.startsWith(`${functionName}(`)) {
    return true;
  }

  return trimmedValue.endsWith(")");
}

function extractColorNumbers(value) {
  return (String(value).match(/[-+]?\d*\.?\d+/g) || [])
    .map(Number)
    .filter(Number.isFinite);
}

function rgbToHsl(red, green, blue) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { h: 0, s: 0, l: lightness };
  }

  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue;
  if (max === r) {
    hue = (g - b) / delta + (g < b ? 6 : 0);
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }

  return { h: hue * 60, s: saturation, l: lightness };
}

function hslToRgb(hue, saturation, lightness) {
  const normalizedHue = ((hue % 360) + 360) % 360;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePrime = normalizedHue / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime >= 0 && huePrime < 1) {
    red = chroma;
    green = x;
  } else if (huePrime < 2) {
    red = x;
    green = chroma;
  } else if (huePrime < 3) {
    green = chroma;
    blue = x;
  } else if (huePrime < 4) {
    green = x;
    blue = chroma;
  } else if (huePrime < 5) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  const match = lightness - chroma / 2;
  return [red, green, blue].map((channel) =>
    clamp(Math.round((channel + match) * 255), 0, 255, 0),
  );
}

function rgbToLch(red, green, blue) {
  const r = srgbToLinear(red / 255);
  const g = srgbToLinear(green / 255);
  const b = srgbToLinear(blue / 255);
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const fx = labPivot(x);
  const fy = labPivot(y);
  const fz = labPivot(z);
  const l = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const labB = 200 * (fy - fz);
  const c = Math.sqrt(a * a + labB * labB);
  const h = (Math.atan2(labB, a) * 180) / Math.PI;
  return {
    l: clamp(l, 0, 100, 0),
    c,
    h: (h + 360) % 360,
  };
}

function lchToRgb(lightness, chroma, hue) {
  const hueRadians = (hue * Math.PI) / 180;
  const a = Math.cos(hueRadians) * chroma;
  const b = Math.sin(hueRadians) * chroma;
  const fy = (lightness + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const x = inverseLabPivot(fx) * 0.95047;
  const y = inverseLabPivot(fy);
  const z = inverseLabPivot(fz) * 1.08883;

  return [
    linearToSrgb(3.2404542 * x - 1.5371385 * y - 0.4985314 * z),
    linearToSrgb(-0.969266 * x + 1.8760108 * y + 0.041556 * z),
    linearToSrgb(0.0556434 * x - 0.2040259 * y + 1.0572252 * z),
  ];
}

function srgbToLinear(value) {
  return value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(value) {
  const srgb = value <= 0.0031308
    ? 12.92 * value
    : 1.055 * value ** (1 / 2.4) - 0.055;
  return clamp(Math.round(srgb * 255), 0, 255, 0);
}

function labPivot(value) {
  return value > 216 / 24389
    ? Math.cbrt(value)
    : (24389 / 27 * value + 16) / 116;
}

function inverseLabPivot(value) {
  const cubed = value ** 3;
  return cubed > 216 / 24389
    ? cubed
    : (116 * value - 16) / (24389 / 27);
}

function rgbToHex(red, green, blue) {
  return `#${[red, green, blue]
    .map((channel) => clamp(Math.round(channel), 0, 255, 0).toString(16).padStart(2, "0"))
    .join("")}`;
}

function clamp(value, minimum, maximum, fallback = minimum) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(value, minimum), maximum);
}

function nextAnimationFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function isEditorShortcutTarget(target) {
  if (!(target instanceof Element)) {
    return false;
  }

  if (
    target.closest(
      ".sticky-header, .session-sidebar, .image-tools, .crop-dialog, .preferences-panel, .preferences-window",
    )
  ) {
    return false;
  }

  return Boolean(
    target.closest(".bn-container") ||
      target.closest("[data-testid='sticky-editor-surface']"),
  );
}

function isEditableFormTarget(target) {
  return target instanceof Element && Boolean(target.closest("input, textarea, select"));
}

function isSelectionInsideCodeBlock(editor) {
  try {
    return editor.transact(
      (transaction) =>
        Boolean(transaction.selection.$from.parent.type.spec.code) &&
        Boolean(transaction.selection.$to.parent.type.spec.code),
    );
  } catch {
    return false;
  }
}

function normalizePastedMarkdownForBlockNote(markdown) {
  const normalizedLineEndings = String(markdown).replace(/\r\n?/g, "\n");
  const normalizedTables = normalizeWrappedMarkdownTables(normalizedLineEndings);

  return {
    markdown: normalizedTables,
    changed: normalizedTables !== normalizedLineEndings,
  };
}

function normalizeWrappedMarkdownTables(markdown) {
  const lines = markdown.split("\n");
  const normalizedLines = [];
  let index = 0;

  while (index < lines.length) {
    if (isMarkdownFenceStart(lines[index])) {
      const fencedBlock = collectMarkdownFence(lines, index);
      normalizedLines.push(...fencedBlock.lines);
      index = fencedBlock.nextIndex;
      continue;
    }

    if (!isMarkdownTableHeaderAt(lines, index)) {
      normalizedLines.push(lines[index]);
      index += 1;
      continue;
    }

    const headerLine = lines[index];
    const separatorLine = lines[index + 1];
    const columnCount = parseMarkdownTableCells(headerLine).length;
    normalizedLines.push(headerLine, separatorLine);
    index += 2;

    while (index < lines.length) {
      const firstRowLine = lines[index];
      if (firstRowLine.trim() === "" || isMarkdownFenceStart(firstRowLine)) {
        break;
      }

      if (!firstRowLine.includes("|")) {
        break;
      }

      let logicalRow = "";
      let physicalLineCount = 0;

      while (index < lines.length) {
        const currentLine = lines[index];
        const nextLine = lines[index + 1] ?? "";
        const hasStartedRow = physicalLineCount > 0;

        if (currentLine.trim() === "") {
          break;
        }

        if (
          hasStartedRow &&
          currentLine.trim().startsWith("|") &&
          isLogicalMarkdownTableRowComplete(
            logicalRow,
            physicalLineCount,
            currentLine,
            columnCount,
          )
        ) {
          break;
        }

        if (!hasStartedRow && !currentLine.includes("|")) {
          break;
        }

        logicalRow = appendWrappedMarkdownTableLine(logicalRow, currentLine);
        physicalLineCount += 1;
        index += 1;

        if (
          isLogicalMarkdownTableRowComplete(
            logicalRow,
            physicalLineCount,
            nextLine,
            columnCount,
          )
        ) {
          break;
        }
      }

      if (!logicalRow) {
        break;
      }

      normalizedLines.push(logicalRow);
    }
  }

  return normalizedLines.join("\n");
}

function isMarkdownTableHeaderAt(lines, index) {
  return (
    index + 1 < lines.length &&
    lines[index].includes("|") &&
    isMarkdownTableSeparatorLine(lines[index + 1])
  );
}

function isMarkdownTableSeparatorLine(line) {
  return (
    line.includes("|") &&
    /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(line)
  );
}

function appendWrappedMarkdownTableLine(logicalRow, line) {
  const normalizedLine = line.trim();
  return logicalRow ? `${logicalRow}<br>${normalizedLine}` : normalizedLine;
}

function isLogicalMarkdownTableRowComplete(
  logicalRow,
  physicalLineCount,
  nextLine,
  columnCount,
) {
  const cells = parseMarkdownTableCells(logicalRow);
  if (cells.length < columnCount) {
    return false;
  }

  if (logicalRow.trim().endsWith("|")) {
    return true;
  }

  const trimmedNextLine = nextLine.trim();
  if (trimmedNextLine === "" || isMarkdownFenceStart(trimmedNextLine)) {
    return true;
  }

  if (physicalLineCount === 1 && trimmedNextLine.startsWith("|")) {
    return true;
  }

  return false;
}

function parseMarkdownTableCells(line) {
  const trimmed = String(line).trim();
  const withoutLeadingPipe = trimmed.startsWith("|") ? trimmed.slice(1) : trimmed;
  const content = withoutLeadingPipe.endsWith("|")
    ? withoutLeadingPipe.slice(0, -1)
    : withoutLeadingPipe;
  const cells = [];
  let currentCell = "";

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    if (character === "\\" && content[index + 1] === "|") {
      currentCell += "|";
      index += 1;
      continue;
    }

    if (character === "|") {
      cells.push(currentCell.trim());
      currentCell = "";
      continue;
    }

    currentCell += character;
  }

  cells.push(currentCell.trim());
  return cells;
}

function isMarkdownFenceStart(line) {
  return /^ {0,3}(`{3,}|~{3,})/.test(String(line));
}

function collectMarkdownFence(lines, startIndex) {
  const startLine = lines[startIndex];
  const fenceMatch = startLine.match(/^ {0,3}(`{3,}|~{3,})/);
  if (!fenceMatch) {
    return { lines: [startLine], nextIndex: startIndex + 1 };
  }

  const fence = fenceMatch[1];
  const fenceCharacter = fence[0];
  const fenceLength = fence.length;
  const fencedLines = [startLine];
  let index = startIndex + 1;

  while (index < lines.length) {
    fencedLines.push(lines[index]);
    if (
      new RegExp(`^ {0,3}${escapeRegExp(fenceCharacter)}{${fenceLength},}\\s*$`).test(
        lines[index],
      )
    ) {
      index += 1;
      break;
    }
    index += 1;
  }

  return { lines: fencedLines, nextIndex: index };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasVisibleTextSelection() {
  const selection = window.getSelection();
  return Boolean(selection && !selection.isCollapsed && selection.toString());
}

function selectAllBlocks(editor) {
  if (editor.document.length === 0) {
    return;
  }

  selectAllEditorDocument(editor);
  if (hasVisibleTextSelection()) {
    return;
  }

  try {
    editor.focus();
    editor.setSelection(editor.document[0], editor.document[editor.document.length - 1]);
  } catch {
    // Some block types only support the ProseMirror whole-document selection above.
  }
}

function selectAllEditorDocument(editor) {
  const view = editor.prosemirrorView;
  const state = view?.state;
  if (!view || !state) {
    return;
  }

  const wholeTextSelection = TextSelection.between(
    state.doc.resolve(0),
    state.doc.resolve(state.doc.content.size),
  );

  view.dispatch(
    state.tr
      .setSelection(wholeTextSelection)
      .scrollIntoView(),
  );
  view.focus();
}

function isEmptyEditorSurfacePointer(event) {
  if (event.button !== 0) {
    return false;
  }

  const target = event.target;
  if (!(target instanceof Element)) {
    return false;
  }

  if (
    target.closest(
      [
        ".bn-block-outer",
        ".bn-side-menu",
        ".bn-table-handle",
        ".bn-table-cell-handle",
        ".bn-formatting-toolbar",
        "[role='toolbar']",
        "[role='listbox']",
        "button",
        "input",
        "textarea",
        "select",
        "a",
      ].join(", "),
    )
  ) {
    return false;
  }

  return Boolean(target.closest("[data-testid='sticky-editor-surface']"));
}

function focusLastEditorBlock(editor) {
  const lastBlock = editor.document.at(-1);
  if (!lastBlock) {
    editor.focus();
    return;
  }

  editor.focus();
  try {
    editor.setTextCursorPosition(lastBlock, "end");
    return;
  } catch {
    // Non-text blocks can reject text cursor placement.
  }

  try {
    editor.setTextCursorPosition(lastBlock, "start");
    return;
  } catch {
    // Some media/table blocks cannot receive a text cursor.
  }

  try {
    editor.setSelection(lastBlock, lastBlock);
  } catch {
    // Final fallback: keep editor focused even if block selection is unavailable.
  }
}

async function cutCurrentBlocks(editor, activeImageBlockId, scheduleSave) {
  const blocks = resolveBlocksForCut(editor, activeImageBlockId);
  if (blocks.length === 0) {
    return;
  }

  try {
    const markdown = await editor.blocksToMarkdownLossy(blocks);
    await navigator.clipboard?.writeText(markdown);
  } catch {
    // Clipboard write is best-effort; the block removal should still happen.
  }

  const topLevelIds = new Set(editor.document.map((block) => block.id));
  const topLevelBlocks = blocks.filter((block) => topLevelIds.has(block.id));
  const removesEveryTopLevelBlock = topLevelBlocks.length === editor.document.length;

  if (removesEveryTopLevelBlock) {
    const { insertedBlocks } = editor.replaceBlocks(editor.document, [
      { type: "paragraph" },
    ]);
    editor.setTextCursorPosition(insertedBlocks[0], "start");
    scheduleSave();
    return;
  }

  const firstTopLevelIndex = editor.document.findIndex(
    (block) => block.id === topLevelBlocks[0]?.id,
  );
  const nextCursorBlock =
    firstTopLevelIndex >= 0
      ? editor.document[firstTopLevelIndex + topLevelBlocks.length] ||
        editor.document[firstTopLevelIndex - 1]
      : null;

  editor.removeBlocks(blocks);
  if (nextCursorBlock) {
    editor.setTextCursorPosition(nextCursorBlock, "start");
  } else if (editor.document[0]) {
    editor.setTextCursorPosition(editor.document[0], "start");
  }
  scheduleSave();
}

function resolveBlocksForCut(editor, activeImageBlockId) {
  const selectedBlocks = editor.getSelection()?.blocks;
  if (selectedBlocks?.length) {
    return selectedBlocks;
  }

  const activeImageBlock = findBlockById(editor.document, activeImageBlockId);
  if (activeImageBlock) {
    return [activeImageBlock];
  }

  try {
    return [editor.getTextCursorPosition().block];
  } catch {
    return [];
  }
}

function extractTableOfContentsEntries(blocks) {
  const entries = [];

  collectBlocks(blocks, (block) => {
    if (block?.type !== "heading" || !block.id) {
      return;
    }

    const title = extractBlockPlainText(block.content).trim();
    if (!title) {
      return;
    }

    entries.push({
      id: block.id,
      title,
      level: getHeadingLevel(block),
    });
  });

  return entries;
}

function extractBlockPlainText(content) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content.map(extractBlockPlainText).join("");
  }

  if (content && typeof content === "object") {
    if (typeof content.text === "string") {
      return content.text;
    }

    if (Array.isArray(content.rows)) {
      return content.rows
        .flatMap((row) => Array.isArray(row?.cells) ? row.cells : [])
        .map(extractBlockPlainText)
        .find((text) => text.trim()) ?? "";
    }

    return extractBlockPlainText(content.content);
  }

  return "";
}

function getHeadingLevel(block) {
  const level = Number(
    block?.props?.level ??
      block?.props?.headingLevel ??
      block?.props?.depth ??
      1,
  );

  return clamp(Math.round(level), 1, 6, 1);
}

function scrollEditorBlockIntoView(blockId) {
  const blockElement = getEditorBlockElement(blockId);
  blockElement?.scrollIntoView({
    block: "start",
    inline: "nearest",
    behavior: "smooth",
  });
}

function getEditorBlockElement(blockId) {
  if (!blockId) {
    return null;
  }

  const escapedBlockId =
    window.CSS?.escape?.(blockId) ?? String(blockId).replace(/["'\\]/g, "\\$&");
  const selectors = [
    `[data-id="${escapedBlockId}"]`,
    `[data-block-id="${escapedBlockId}"]`,
    `#${escapedBlockId}`,
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    const blockElement = element?.closest?.(".bn-block-outer") ?? element;
    if (blockElement) {
      return blockElement;
    }
  }

  return null;
}

function findBlockById(blocks, blockId) {
  if (!blockId) {
    return null;
  }

  for (const block of blocks) {
    if (block.id === blockId) {
      return block;
    }

    const childBlock = findBlockById(block.children || [], blockId);
    if (childBlock) {
      return childBlock;
    }
  }

  return null;
}

function findImageBlockBySource(blocks, sourceUrl) {
  const imageBlocks = [];
  collectBlocks(blocks, (block) => {
    if (block.type === "image" && block.props?.url) {
      imageBlocks.push(block);
    }
  });

  return (
    imageBlocks.find((block) => urlsMatch(block.props.url, sourceUrl)) ||
    (imageBlocks.length === 1 ? imageBlocks[0] : null)
  );
}

function collectBlocks(blocks, callback) {
  for (const block of Array.isArray(blocks) ? blocks : []) {
    if (!block) {
      continue;
    }

    callback(block);
    collectBlocks(block.children || [], callback);
  }
}

function urlsMatch(left, right) {
  if (!left || !right) {
    return false;
  }

  if (left === right) {
    return true;
  }

  try {
    return new URL(left, window.location.href).href === new URL(right, window.location.href).href;
  } catch {
    return false;
  }
}

function imageFileName(name, url) {
  const fallbackExtension = extensionFromSource(url);
  const sourceName =
    name ||
    (() => {
      try {
        const pathname = new URL(url, window.location.href).pathname;
        return decodeURIComponent(pathname.split("/").filter(Boolean).pop() || "");
      } catch {
        return "";
      }
    })() ||
    `image.${fallbackExtension}`;

  const sanitized = sourceName
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return /\.[a-z0-9]{2,5}$/i.test(sanitized)
    ? sanitized
    : `${sanitized || "image"}.${fallbackExtension}`;
}

function ensurePngName(name) {
  return name.replace(/\.[a-z0-9]{2,5}$/i, "") + ".png";
}

function extensionFromSource(source) {
  if (/^data:image\/jpeg/i.test(source)) {
    return "jpg";
  }
  if (/^data:image\/gif/i.test(source)) {
    return "gif";
  }
  if (/^data:image\/webp/i.test(source)) {
    return "webp";
  }
  if (/\.(jpe?g)(?:[?#]|$)/i.test(source)) {
    return "jpg";
  }
  if (/\.(gif)(?:[?#]|$)/i.test(source)) {
    return "gif";
  }
  if (/\.(webp)(?:[?#]|$)/i.test(source)) {
    return "webp";
  }
  return "png";
}

function downloadInBrowser(url, fileName) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noreferrer";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

function preventFocusLoss(event) {
  event.preventDefault();
}

function getImagePoint(event, image) {
  if (!image) {
    return null;
  }

  const rect = image.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  return {
    x: clamp((event.clientX - rect.left) / rect.width, 0, 1, 0),
    y: clamp((event.clientY - rect.top) / rect.height, 0, 1, 0),
  };
}

async function cropImageToPng(image, crop) {
  await waitForImage(image);

  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;
  const sx = Math.floor(crop.x * sourceWidth);
  const sy = Math.floor(crop.y * sourceHeight);
  const sw = Math.max(1, Math.floor(crop.width * sourceWidth));
  const sh = Math.max(1, Math.floor(crop.height * sourceHeight));

  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const context = canvas.getContext("2d");
  context.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas.toDataURL("image/png");
}

function waitForImage(image) {
  if (!image) {
    return Promise.reject(new Error("No image selected."));
  }

  if (image.complete && image.naturalWidth > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener(
      "error",
      () => reject(new Error("Image could not be loaded for cropping.")),
      { once: true },
    );
  });
}

function uploadFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => {
      reject(reader.error ?? new Error("Could not read selected file."));
    });
    reader.readAsDataURL(file);
  });
}

createRoot(document.getElementById("root")).render(<App />);
