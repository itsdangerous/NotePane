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
import { toPng } from "html-to-image";
import {
  Columns3,
  EllipsisVertical,
  PanelLeftClose,
  PanelLeftOpen,
  PanelTopClose,
  Pin,
  PinOff,
  SlidersHorizontal,
  StickyNote,
  Settings2,
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

function App() {
  const [note, setNote] = useState(null);
  const [notes, setNotes] = useState([]);
  const [appTheme, setAppTheme] = useState(DEFAULT_APP_THEME);
  const [layoutMode, setLayoutMode] = useState(DEFAULT_LAYOUT_MODE);
  const [installedFontFamilies, setInstalledFontFamilies] = useState([]);
  const [editorPreferences, setEditorPreferences] = useState(
    DEFAULT_EDITOR_PREFERENCES,
  );

  useEffect(() => {
    let cancelled = false;

    async function loadNote() {
      const noteId = new URLSearchParams(window.location.search).get("noteId");

      if (!electronApi) {
        const previewNote = {
          id: noteId || "browser-preview",
          title: DEFAULT_TITLE,
          blocksJSON: null,
          markdown: "",
          theme: DEFAULT_THEME,
          seedDemoContent: true,
          editorFontScale: DEFAULT_EDITOR_FONT_SCALE,
          editorFontFamily: DEFAULT_EDITOR_FONT_FAMILY,
          detached: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setNotes([previewNote]);
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
      ] = await Promise.all([
        electronApi.listNotes(),
        electronApi.getAppTheme?.(),
        electronApi.getLayoutMode?.(),
        electronApi.getEditorPreferences?.(),
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
            blocksJSON: null,
            markdown: "",
            theme: DEFAULT_THEME,
            seedDemoContent: true,
            editorFontScale: DEFAULT_EDITOR_FONT_SCALE,
            editorFontFamily: DEFAULT_EDITOR_FONT_FAMILY,
            detached: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
        setNotes(mergeNotes(loadedNotes, fallbackNote));
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
      const activeNote = payload?.activeNote;

      setNotes(nextNotes);
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
          blocksJSON: null,
          markdown: "",
          theme: DEFAULT_THEME,
          seedDemoContent: false,
          editorFontScale: editorPreferences.editorFontScale,
          editorFontFamily: editorPreferences.editorFontFamily,
          detached: false,
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
    async (noteId) => {
      if (notes.length <= 1) {
        return;
      }

      if (electronApi) {
        const result = await electronApi.deleteNote(noteId);
        const nextNotes = Array.isArray(result?.notes)
          ? result.notes
          : await electronApi.listNotes();
        const nextNote =
          result?.activeNote ??
          (note?.id === noteId
            ? nextNotes[0]
            : nextNotes.find((candidate) => candidate.id === note?.id));

        setNotes(nextNotes);
        if (nextNote) {
          setNote(nextNote);
        }
        return;
      }

      const deletedNoteIndex = notes.findIndex((candidate) => candidate.id === noteId);
      const nextNotes = notes.filter((candidate) => candidate.id !== noteId);
      setNotes(nextNotes);
      if (note?.id === noteId) {
        setNote(nextNotes[deletedNoteIndex] ?? nextNotes[deletedNoteIndex - 1] ?? null);
      }
    },
    [note, notes],
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
      appTheme={appTheme}
      layoutMode={layoutMode}
      onCreateNote={createSidebarNote}
      onDeleteNote={deleteSidebarNote}
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
  appTheme,
  layoutMode,
  onCreateNote,
  onDeleteNote,
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

  const [title, setTitle] = useState(normalizeTitle(note.title));
  const [theme, setTheme] = useState(normalizeTheme(note.theme));
  const editorFontScale = normalizeEditorFontScale(note.editorFontScale);
  const editorFontFamily = normalizeEditorFontFamily(note.editorFontFamily);
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
  const shellStyle = {
    ...(effectiveLayoutMode === "sticky"
      ? getStickyShellStyle(theme, stickyAccentColor)
      : {}),
    "--editor-font-scale": String(editorFontScale),
    "--editor-font-family": getEditorFontFamilyCss(
      editorFontFamily,
      editorFontOptions,
    ),
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [isColorPanelOpen, setIsColorPanelOpen] = useState(false);
  const [isPreferencesWindowOpen, setIsPreferencesWindowOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isEditorActive, setIsEditorActive] = useState(false);
  const [isEditorToolbarExpanded, setIsEditorToolbarExpanded] = useState(false);
  const [editorFontSizeDraft, setEditorFontSizeDraft] = useState(() =>
    String(editorFontScaleToSize(editorFontScale)),
  );
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [draftSessionTitle, setDraftSessionTitle] = useState("");
  const [enteringSessionIds, setEnteringSessionIds] = useState(() => new Set());
  const [removingSessionIds, setRemovingSessionIds] = useState(() => new Set());
  const [isPinned, setIsPinned] = useState(Boolean(note.alwaysOnTop));
  const [activeImageBlockId, setActiveImageBlockId] = useState(null);
  const [cropState, setCropState] = useState(null);
  const [exportMessage, setExportMessage] = useState("");
  const saveTimerRef = useRef(null);
  const appearanceTimerRef = useRef(null);
  const lastSavedBlocksRef = useRef("");
  const isSidebarCompact = effectiveLayoutMode === "tabs" && !isSidebarOpen;
  const sidebarState = isSidebarCompact ? "compact" : "expanded";
  const sidebarStyle = {
    "--session-sidebar-width": `${
      isSidebarCompact ? SIDEBAR_COMPACT_WIDTH : sidebarWidth
    }px`,
  };

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
    setIsPinned(Boolean(note.alwaysOnTop));
  }, [note.alwaysOnTop, note.id]);

  useEffect(() => {
    setTitle(normalizeTitle(note.title));
  }, [note.id]);

  useEffect(() => {
    setEditorFontSizeDraft(String(editorFontScaleToSize(editorFontScale)));
  }, [editorFontScale, note.id]);

  useEffect(() => {
    if (!isEditorActive || effectiveLayoutMode === "sticky") {
      setIsEditorToolbarExpanded(false);
    }
  }, [effectiveLayoutMode, isEditorActive, note.id]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      if (
        target.closest(".editor-toolbar-toggle") ||
        target.closest(".editor-typography-control") ||
        target.closest(".editor-floating-menu")
      ) {
        return;
      }

      setIsEditorToolbarExpanded(false);

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
      }
    } catch {
      editor.replaceBlocks(editor.document, [
        {
          type: "paragraph",
          content: note.markdown,
        },
      ]);
    }
  }, [editor, note.markdown, parsedStoredBlocks]);

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

    await electronApi?.saveContent({
      noteId: note.id,
      blocksJSON,
      markdown,
    });
  }, [editor, note.id]);

  const scheduleSave = useCallback(() => {
    if (!electronApi) {
      return;
    }

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(saveNow, 180);
  }, [saveNow]);

  const scheduleAppearanceSave = useCallback(
    (
      nextTitle,
      nextTheme,
      nextEditorFontScale = editorFontScale,
      nextEditorFontFamily = editorFontFamily,
    ) => {
      if (!electronApi) {
        return;
      }

      if (appearanceTimerRef.current) {
        window.clearTimeout(appearanceTimerRef.current);
      }

      appearanceTimerRef.current = window.setTimeout(() => {
        void electronApi.updateAppearance({
          noteId: note.id,
          title: normalizeTitle(nextTitle),
          theme: normalizeTheme(nextTheme),
          editorFontScale: normalizeEditorFontScale(nextEditorFontScale),
          editorFontFamily: normalizeEditorFontFamily(nextEditorFontFamily),
        });
      }, 160);
    },
    [editorFontFamily, editorFontScale, note.id],
  );

  const updateTheme = useCallback(
    (nextTheme) => {
      const normalizedTheme = normalizeTheme(nextTheme);
      setTheme(normalizedTheme);
      onNoteChanged({
        ...note,
        title: normalizeTitle(title),
        theme: normalizedTheme,
        editorFontScale,
        editorFontFamily,
      });
      scheduleAppearanceSave(
        title,
        normalizedTheme,
        editorFontScale,
        editorFontFamily,
      );
    },
    [editorFontFamily, editorFontScale, note, onNoteChanged, scheduleAppearanceSave, title],
  );

  const updateEditorFontScale = useCallback(
    (nextEditorFontScale) => {
      const normalizedEditorFontScale = normalizeEditorFontScale(nextEditorFontScale);
      setEditorFontSizeDraft(String(editorFontScaleToSize(normalizedEditorFontScale)));
      onNoteChanged({
        ...note,
        title: normalizeTitle(title),
        theme,
        editorFontScale: normalizedEditorFontScale,
        editorFontFamily,
      });
      scheduleAppearanceSave(
        title,
        theme,
        normalizedEditorFontScale,
        editorFontFamily,
      );
    },
    [editorFontFamily, note, onNoteChanged, scheduleAppearanceSave, theme, title],
  );

  const updateEditorFontFamily = useCallback(
    (nextEditorFontFamily) => {
      const normalizedEditorFontFamily = normalizeEditorFontFamily(nextEditorFontFamily);
      onNoteChanged({
        ...note,
        title: normalizeTitle(title),
        theme,
        editorFontScale,
        editorFontFamily: normalizedEditorFontFamily,
      });
      scheduleAppearanceSave(
        title,
        theme,
        editorFontScale,
        normalizedEditorFontFamily,
      );
    },
    [editorFontScale, note, onNoteChanged, scheduleAppearanceSave, theme, title],
  );

  const updateEditorFontSize = useCallback(
    (nextEditorFontSize) => {
      const normalizedEditorFontSize = normalizeEditorFontSize(nextEditorFontSize);
      setEditorFontSizeDraft(String(normalizedEditorFontSize));
      updateEditorFontScale(editorFontSizeToScale(normalizedEditorFontSize));
    },
    [updateEditorFontScale],
  );

  const commitEditorFontSizeDraft = useCallback(() => {
    updateEditorFontSize(editorFontSizeDraft);
  }, [editorFontSizeDraft, updateEditorFontSize]);

  const adjustEditorFontScale = useCallback(
    (direction) => {
      updateEditorFontScale(
        normalizeEditorFontScale(editorFontScale + direction * EDITOR_FONT_SCALE_STEP),
      );
    },
    [editorFontScale, updateEditorFontScale],
  );

  const openPreferences = useCallback(() => {
    setIsExportMenuOpen(false);
    setIsColorPanelOpen(false);
    setIsPreferencesWindowOpen(true);
  }, []);

  const toggleLayoutMode = useCallback(() => {
    setIsColorPanelOpen(false);
    setIsPreferencesWindowOpen(false);
    setIsExportMenuOpen(false);
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
        theme,
        alwaysOnTop: Boolean(resolvedPinned),
      });
    } catch (error) {
      setIsPinned(!nextPinned);
      onNoteChanged({
        ...note,
        title: normalizeTitle(title),
        theme,
        alwaysOnTop: !nextPinned,
      });
      setExportMessage(error.message || "Pin failed.");
    }
  }, [isPinned, note, onNoteChanged, theme, title]);

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
        setIsExportMenuOpen((value) => !value);
        setIsColorPanelOpen(false);
        setIsPreferencesWindowOpen(false);
        return;
      }

      if ((key === "+" || key === "=") && !event.altKey) {
        event.preventDefault();
        if (isEditorActive && isEditorShortcutTarget(event.target)) {
          adjustEditorFontScale(1);
        }
        return;
      }

      if ((key === "-" || key === "_") && !event.altKey) {
        event.preventDefault();
        if (isEditorActive && isEditorShortcutTarget(event.target)) {
          adjustEditorFontScale(-1);
        }
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
    isEditorActive,
    toggleLayoutMode,
  ]);

  useEffect(() => {
    if (!isColorPanelOpen && !isPreferencesWindowOpen) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsColorPanelOpen(false);
        setIsPreferencesWindowOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape, true);
    return () => {
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [isColorPanelOpen, isPreferencesWindowOpen]);

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

  const exportNote = useCallback(
    async (type) => {
      setIsExportMenuOpen(false);
      setExportMessage("");
      if (!electronApi) {
        setExportMessage("Export is available in the desktop app.");
        return;
      }

      document.body.classList.add("is-exporting");
      try {
        await nextAnimationFrame();
        await nextAnimationFrame();
        const rect = getCaptureRect();
        let dataUrl;
        if (type === "png") {
          try {
            dataUrl = await renderExportPng(rect);
          } catch {
            dataUrl = undefined;
          }
        }
        const result = await electronApi?.exportNote({
          noteId: note.id,
          title: normalizeTitle(title),
          type,
          rect,
          dataUrl,
        });

        if (!result?.canceled) {
          setExportMessage(`Exported ${type.toUpperCase()}`);
        }
      } catch (error) {
        setExportMessage(error.message || "Export failed.");
      } finally {
        document.body.classList.remove("is-exporting");
      }
    },
    [note.id, title],
  );

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
    setDraftSessionTitle(normalizeTitle(sessionNote.title));
  }, []);

  const cancelSessionRename = useCallback(() => {
    setEditingSessionId(null);
    setDraftSessionTitle("");
  }, []);

  const commitSessionRename = useCallback(
    async (sessionNote) => {
      const normalizedTitle = normalizeTitle(draftSessionTitle);
      setEditingSessionId(null);
      setDraftSessionTitle("");

      const updatedNote = {
        ...sessionNote,
        title: normalizedTitle,
      };

      if (sessionNote.id === note.id) {
        setTitle(normalizedTitle);
        onNoteChanged({
          ...note,
          title: normalizedTitle,
          theme,
          editorFontScale,
          editorFontFamily,
        });
        scheduleAppearanceSave(
          normalizedTitle,
          theme,
          editorFontScale,
          editorFontFamily,
        );
        return;
      }

      onNoteChanged(updatedNote);
      await electronApi?.updateAppearance({
        noteId: sessionNote.id,
        title: normalizedTitle,
        theme: normalizeTheme(sessionNote.theme),
        editorFontScale: normalizeEditorFontScale(sessionNote.editorFontScale),
        editorFontFamily: normalizeEditorFontFamily(sessionNote.editorFontFamily),
      });
    },
    [
      draftSessionTitle,
      editorFontFamily,
      editorFontScale,
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
        await onDeleteNote(sessionNote.id);
      } finally {
        setRemovingSessionIds((currentIds) => {
          const nextIds = new Set(currentIds);
          nextIds.delete(sessionNote.id);
          return nextIds;
        });
      }
    },
    [notes.length, onDeleteNote, removingSessionIds, saveNow],
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
                          onChange={(event) => setDraftSessionTitle(event.target.value)}
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
                      onDragStart={(event) => {
                        event.dataTransfer?.setData("application/x-notepane-note", sessionNote.id);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={(event) => void detachSessionNote(sessionNote, event)}
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={sessionNote.id === note.id}
                        className="session-tab-button has-tooltip"
                        data-tooltip={`Open ${normalizeTitle(sessionNote.title)} · ${getSessionShortcutLabel(index)}`}
                        onMouseDown={preventFocusLoss}
                        onClick={() => void selectSidebarNote(sessionNote.id)}
                        onDoubleClick={(event) => {
                          event.preventDefault();
                          startSessionRename(sessionNote);
                        }}
                      >
                        <span className="session-dot">{index + 1}</span>
                        <span className="session-name">
                          {normalizeTitle(sessionNote.title)}
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
                        <button
                          type="button"
                          className="session-delete-button has-tooltip"
                          aria-label={`Delete session ${normalizeTitle(sessionNote.title)}`}
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
                          ×
                        </button>
                      </span>
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
                <span aria-hidden="true">＋</span>
                <span>New session</span>
              </button>
            </div>
            <div
              className="session-sidebar-footer"
              data-testid="session-sidebar-footer"
              aria-label="Session sidebar controls"
            >
              <div className="session-sidebar-footer-actions">
                <HeaderModeSwitch
                  mode={appThemeMode}
                  onChange={onAppThemeModeChanged}
                />
                <PreferencesButton onClick={openPreferences} />
              </div>
              <LayoutModeSwitch
                mode={normalizedLayoutMode}
                onChange={toggleLayoutMode}
              />
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
          className="sticky-editor-surface"
          data-testid="sticky-editor-surface"
          data-editor-active={isEditorActive ? "true" : "false"}
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
          {isEditorActive && effectiveLayoutMode === "sticky" && !isEditorToolbarExpanded ? (
            <button
              type="button"
              className="editor-toolbar-toggle has-tooltip"
              aria-label="Show editor tools"
              aria-expanded="false"
              data-tooltip="Show editor tools"
              onMouseDown={preventFocusLoss}
              onClick={() => setIsEditorToolbarExpanded(true)}
            >
              <EditorToolsIcon />
            </button>
          ) : isEditorActive ? (
            <EditorTypographyControl
              draftValue={editorFontSizeDraft}
              fontFamily={editorFontFamily}
              fontOptions={editorFontOptions}
              leadingControl={
                effectiveLayoutMode === "sticky" ? (
                  <>
                    <LayoutModeSwitch
                      mode={normalizedLayoutMode}
                      onChange={toggleLayoutMode}
                    />
                    <button
                      type="button"
                      className="sticky-pin-button has-tooltip"
                      aria-label={isPinned ? "Unpin window" : "Pin window"}
                      aria-pressed={isPinned}
                      data-tooltip={`${isPinned ? "Unpin window" : "Pin window"} · ${getShortcutLabel("⇧P")}`}
                      onMouseDown={preventFocusLoss}
                      onClick={() => void togglePin()}
                    >
                      <PinIcon pinned={isPinned} />
                    </button>
                    <button
                      type="button"
                      className="sticky-color-button has-tooltip"
                      aria-label="Sticky color"
                      data-tooltip={`Sticky color · ${getShortcutLabel(",")}`}
                      style={{ "--sticky-color-preview": stickyAccentColor }}
                      onMouseDown={preventFocusLoss}
                      onClick={() => {
                        setIsColorPanelOpen((value) => !value);
                        setIsPreferencesWindowOpen(false);
                        setIsExportMenuOpen(false);
                      }}
                    >
                      <PaletteIcon />
                    </button>
                  </>
                ) : null
              }
              scale={editorFontScale}
              onDraftChange={setEditorFontSizeDraft}
              onCommit={commitEditorFontSizeDraft}
              onFontFamilyChange={updateEditorFontFamily}
              onFontSizeChange={updateEditorFontSize}
            />
          ) : null}
          {isExportMenuOpen && (
            <ExportMenu
              className="keyboard-export-menu"
              onExport={exportNote}
            />
          )}
          <BlockNoteView
            editor={editor}
            theme={appThemeMode}
            onChange={scheduleSave}
            portalElements={{ default: document.body }}
          />
        </section>
      </div>
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
      {isPreferencesWindowOpen && (
        <PreferencesWindow
          theme={theme}
          appThemeMode={appThemeMode}
          defaultColor={stickyAccentColor}
          editorPreferences={editorPreferences}
          fontOptions={editorFontOptions}
          onThemeChange={updateTheme}
          onAppThemeModeChange={onAppThemeModeChanged}
          onEditorPreferencesChange={onEditorPreferencesChanged}
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
      {exportMessage && <div className="sticky-toast">{exportMessage}</div>}
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
    () => formatColorValues(activeColor),
    [activeColor],
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

  const resetTabTextColor = useCallback(() => {
    onChange({
      ...theme,
      tabTextColor: null,
      tabTextOpacity: DEFAULT_THEME.tabTextOpacity,
    });
  }, [onChange, theme]);

  const copyValue = useCallback(async (value) => {
    try {
      await navigator.clipboard?.writeText(value);
    } catch {
      // Clipboard access depends on runtime permissions.
    }
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
        <button
          type="button"
          aria-label={isStickyVariant ? "Reset sticky color" : "Reset session tab color"}
          onMouseDown={preventFocusLoss}
          onClick={resetTabTextColor}
        >
          Reset
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
              ⧉
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
      <div className="preferences-section-title">Default editor</div>
      <div className="preferences-section-description">
        Used for newly created sessions. Existing sessions keep their own font settings.
      </div>
      <EditorTypographyControl
        className="preferences-typography-control"
        draftValue={defaultFontSizeDraft}
        fontFamily={normalizedEditorPreferences.editorFontFamily}
        fontOptions={fontOptions}
        scale={normalizedEditorPreferences.editorFontScale}
        onDraftChange={setDefaultFontSizeDraft}
        onCommit={commitDefaultFontSizeDraft}
        onFontFamilyChange={updateEditorPreferenceFontFamily}
        onFontSizeChange={updateEditorPreferenceFontSize}
      />
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

function PreferencesWindow({
  theme,
  appThemeMode,
  defaultColor,
  editorPreferences,
  fontOptions,
  onThemeChange,
  onAppThemeModeChange,
  onEditorPreferencesChange,
  onClose,
}) {
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
              App behavior, editor defaults, appearance, and keyboard commands.
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
          <nav className="preferences-window-sidebar" aria-label="Preferences sections">
            <a href="#preferences-general">General</a>
            <a href="#preferences-appearance">Appearance</a>
            <a href="#preferences-editor">Editor</a>
            <a href="#preferences-shortcuts">Shortcuts</a>
          </nav>
          <div className="preferences-window-content">
            <section
              id="preferences-general"
              className="preferences-section preferences-window-section"
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
            <section
              id="preferences-appearance"
              className="preferences-window-section"
            >
              <ColorSettingsSection
                theme={theme}
                variant="tabs"
                defaultColor={defaultColor}
                onChange={onThemeChange}
              />
            </section>
            <div
              id="preferences-editor"
              className="preferences-window-section"
            >
              <EditorPreferencesSection
                editorPreferences={editorPreferences}
                fontOptions={fontOptions}
                onEditorPreferencesChange={onEditorPreferencesChange}
              />
            </div>
            <div
              id="preferences-shortcuts"
              className="preferences-window-section"
            >
              <KeyboardShortcutsSection />
            </div>
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

function LayoutModeSwitch({ mode, onChange }) {
  const isSticky = mode === "sticky";
  return (
    <button
      type="button"
      className="layout-mode-button has-tooltip"
      aria-label="Layout mode"
      aria-pressed={isSticky}
      data-tooltip={`${isSticky ? "Tab sessions mode" : "Sticky windows mode"} · ${getShortcutLabel("⇧M")}`}
      onMouseDown={preventFocusLoss}
      onClick={onChange}
    >
      {isSticky ? <TabsModeIcon /> : <StickyModeIcon />}
      <span className="layout-mode-label">{isSticky ? "Tabs" : "Sticky"}</span>
    </button>
  );
}

function PreferencesButton({ onClick }) {
  return (
    <button
      type="button"
      className="preferences-icon-button has-tooltip"
      aria-label="Preferences"
      data-tooltip={`Preferences · ${getShortcutLabel(",")}`}
      onMouseDown={preventFocusLoss}
      onClick={onClick}
    >
      <SettingsIcon />
    </button>
  );
}

function ExportMenu({ className = "", onExport }) {
  return (
    <div
      className={`export-menu ${className}`.trim()}
      role="menu"
      aria-label="Export format"
    >
      <button
        type="button"
        role="menuitem"
        onMouseDown={preventFocusLoss}
        onClick={() => void onExport("png")}
      >
        Export as PNG
      </button>
      <button
        type="button"
        role="menuitem"
        onMouseDown={preventFocusLoss}
        onClick={() => void onExport("pdf")}
      >
        Export as PDF
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

function SettingsIcon() {
  return (
    <Settings2
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

function EditorToolsIcon() {
  return (
    <EllipsisVertical
      className="notepane-action-icon notepane-icon-editor-tools"
      data-icon-family="system-symbol"
      data-icon-pack="lucide"
      data-icon-tone="tools"
      size={24}
      strokeWidth={2}
      aria-hidden="true"
    />
  );
}

function PaletteIcon() {
  return (
    <SlidersHorizontal
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

function PinIcon({ pinned = false }) {
  const Icon = pinned ? Pin : PinOff;
  return (
    <Icon
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

function TabsModeIcon() {
  return (
    <Columns3
      className="notepane-action-icon notepane-icon-tabs"
      data-icon-family="system-symbol"
      data-icon-pack="lucide"
      data-icon-tone="tabs"
      size={26}
      strokeWidth={1.8}
      aria-hidden="true"
    />
  );
}

function StickyModeIcon() {
  return (
    <StickyNote
      className="notepane-action-icon notepane-icon-sticky"
      data-icon-family="system-symbol"
      data-icon-pack="lucide"
      data-icon-tone="sticky"
      size={26}
      strokeWidth={1.8}
      aria-hidden="true"
    />
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

function normalizeTitle(value) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 80)
    : DEFAULT_TITLE;
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

function useBlockNoteFloatingMenuGuard() {
  useEffect(() => {
    let animationFrame = 0;

    const schedulePositionUpdate = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = window.requestAnimationFrame(repositionBlockNoteFloatingMenus);
      });
    };
    const scheduleDelayedPositionUpdate = () => {
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
      document.removeEventListener("pointerup", scheduleDelayedPositionUpdate, true);
      document.removeEventListener("click", scheduleDelayedPositionUpdate);
      document.removeEventListener("keydown", scheduleDelayedPositionUpdate, true);
      document.removeEventListener("selectionchange", scheduleDelayedPositionUpdate);
    };
  }, []);
}

function repositionBlockNoteFloatingMenus() {
  for (const element of document.querySelectorAll(BLOCKNOTE_FLOATING_MENU_SELECTOR)) {
    if (!(element instanceof HTMLElement) || element.closest(".editor-floating-menu")) {
      continue;
    }

    keepElementInsideViewport(element);
  }
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
  const desiredWidth = Math.min(
    Math.max(rect.width, element.scrollWidth || rect.width),
    maxWidth,
  );
  const desiredHeight = Math.min(
    Math.max(rect.height, element.scrollHeight || rect.height),
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

  setImportantStyle(element, "position", "fixed");
  setImportantStyle(element, "transform", "none");
  setImportantStyle(element, "left", `${left - containingRect.left}px`);
  setImportantStyle(element, "top", `${top - containingRect.top}px`);
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

function FloatingEditorMenu({
  anchorRef,
  ariaLabel,
  children,
  className,
  id,
  isOpen,
  maxHeight = 220,
  preferredWidth = 180,
}) {
  const [style, setStyle] = useState(null);

  const updatePosition = useCallback(() => {
    const anchorElement = anchorRef.current;
    if (!isOpen || !anchorElement) {
      setStyle(null);
      return;
    }

    setStyle(
      getFloatingEditorMenuStyle(anchorElement, {
        maxHeight,
        preferredWidth,
      }),
    );
  }, [anchorRef, isOpen, maxHeight, preferredWidth]);

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

  if (!isOpen || !style || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      id={id}
      className={`${className} editor-floating-menu`.trim()}
      role="listbox"
      aria-label={ariaLabel}
      style={style}
      onMouseDown={preventFocusLoss}
    >
      {children}
    </div>,
    document.body,
  );
}

function getFloatingEditorMenuStyle(
  anchorElement,
  { maxHeight, preferredWidth },
) {
  const anchorRect = anchorElement.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const margin = FLOATING_EDITOR_MENU_MARGIN;
  const width = Math.max(
    1,
    Math.min(preferredWidth, viewportWidth - margin * 2),
  );
  const spaceBelow = viewportHeight - anchorRect.bottom - margin;
  const spaceAbove = anchorRect.top - margin;
  const shouldOpenAbove =
    spaceBelow < Math.min(maxHeight, 150) && spaceAbove > spaceBelow;
  const availableHeight = shouldOpenAbove ? spaceAbove : spaceBelow;
  const height = Math.max(80, Math.min(maxHeight, availableHeight));
  const left = clamp(
    anchorRect.left,
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
    top: `${top}px`,
    width: `${width}px`,
  };
}

function EditorTypographyControl({
  className = "",
  draftValue,
  fontFamily,
  fontOptions = EDITOR_BUILTIN_FONT_FAMILY_OPTIONS,
  leadingControl = null,
  scale,
  trailingControl = null,
  onDraftChange,
  onCommit,
  onFontFamilyChange,
  onFontSizeChange,
}) {
  const currentFontSize = editorFontScaleToSize(scale);
  const normalizedFontFamily = normalizeEditorFontFamily(fontFamily);
  const selectedFontOption = getEditorFontFamilyOption(
    normalizedFontFamily,
    fontOptions,
  );
  const [isSizeMenuOpen, setIsSizeMenuOpen] = useState(false);
  const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);
  const [fontQuery, setFontQuery] = useState("");
  const fontMenuAnchorRef = useRef(null);
  const sizeMenuAnchorRef = useRef(null);
  const filteredFontOptions = useMemo(
    () => filterEditorFontOptions(fontOptions, fontQuery),
    [fontOptions, fontQuery],
  );

  const applyFontSize = useCallback(
    (nextSize) => {
      const normalizedSize = normalizeEditorFontSize(nextSize, currentFontSize);
      onDraftChange(String(normalizedSize));
      onFontSizeChange(normalizedSize);
      setIsSizeMenuOpen(false);
    },
    [currentFontSize, onDraftChange, onFontSizeChange],
  );

  const applyFontFamily = useCallback(
    (nextFontFamily) => {
      const normalizedValue = normalizeEditorFontFamily(nextFontFamily);
      const option = getEditorFontFamilyOption(normalizedValue, fontOptions);
      onFontFamilyChange(normalizedValue);
      setFontQuery(option.label);
      setIsFontMenuOpen(false);
    },
    [fontOptions, onFontFamilyChange],
  );

  return (
    <div
      className={`editor-typography-control ${className}`.trim()}
      role="group"
      aria-label="Editor typography"
      onMouseDown={preventFocusLoss}
    >
      {leadingControl && (
        <div className="editor-typography-slot editor-typography-leading">
          {leadingControl}
        </div>
      )}
      <div ref={fontMenuAnchorRef} className="editor-font-family-combobox">
        <input
          className="editor-font-family-input"
          aria-label="Editor font family"
          role="combobox"
          aria-expanded={isFontMenuOpen ? "true" : "false"}
          aria-haspopup="listbox"
          aria-controls="editor-font-family-options"
          spellCheck={false}
          value={isFontMenuOpen ? fontQuery : selectedFontOption.label}
          onMouseDown={(event) => event.stopPropagation()}
          onFocus={() => {
            setFontQuery("");
            setIsFontMenuOpen(true);
            setIsSizeMenuOpen(false);
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
              setFontQuery("");
              setIsFontMenuOpen(false);
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
            setIsSizeMenuOpen(false);
          }}
        >
          ⌄
        </button>
        <FloatingEditorMenu
          id="editor-font-family-options"
          anchorRef={fontMenuAnchorRef}
          ariaLabel="Font family options"
          className="editor-font-family-menu"
          isOpen={isFontMenuOpen}
          maxHeight={228}
          preferredWidth={260}
        >
          {filteredFontOptions.length > 0 ? (
            filteredFontOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={
                  option.value === normalizedFontFamily ? "true" : "false"
                }
                style={{ "--font-option-family": option.css }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onClick={() => applyFontFamily(option.value)}
              >
                <span>{option.label}</span>
                {option.source === "installed" && (
                  <span className="editor-font-source">Local</span>
                )}
              </button>
            ))
          ) : (
            <div className="editor-font-family-empty">No fonts found</div>
          )}
        </FloatingEditorMenu>
      </div>
      <div ref={sizeMenuAnchorRef} className="editor-font-size-combobox">
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
            }
            if (event.key === "Enter") {
              event.preventDefault();
              onCommit();
              event.currentTarget.blur();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              onDraftChange(String(currentFontSize));
              setIsSizeMenuOpen(false);
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
        <FloatingEditorMenu
          anchorRef={sizeMenuAnchorRef}
          ariaLabel="Editor font size presets"
          className="editor-font-size-menu"
          isOpen={isSizeMenuOpen}
          maxHeight={190}
          preferredWidth={78}
        >
          {EDITOR_FONT_SIZE_PRESETS.map((fontSize) => (
            <button
              key={fontSize}
              type="button"
              role="option"
              aria-selected={currentFontSize === fontSize ? "true" : "false"}
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={() => applyFontSize(fontSize)}
            >
              {fontSize}
            </button>
          ))}
        </FloatingEditorMenu>
      </div>
      {trailingControl && (
        <div className="editor-typography-slot editor-typography-trailing">
          {trailingControl}
        </div>
      )}
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
  const activeTextColor = getContrastingTextColor(activeEffectiveBackground);
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

function getStickyShellStyle(theme, accentColor) {
  const opacity = resolveTabTextOpacity(theme);
  const effectiveBackground = blendHexOverHex(accentColor, "#ffffff", opacity);
  const isLightBackground = getRelativeLuminance(effectiveBackground) > 0.46;
  const headerColor = isLightBackground
    ? mixHexColors(accentColor, "#ffffff", 0.46)
    : mixHexColors(accentColor, "#000000", 0.08);
  const panelColor = isLightBackground
    ? mixHexColors(accentColor, "#ffffff", 0.34)
    : mixHexColors(accentColor, "#ffffff", 0.08);
  const textColor = isLightBackground ? "#37352f" : "#f7f7f4";
  const mutedColor = isLightBackground ? "#6f6d66" : "#cac7bd";
  const borderColor = isLightBackground
    ? "rgb(55 53 47 / 0.14)"
    : "rgb(255 255 255 / 0.24)";
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

  return {
    "--sticky-note-accent-color": accentColor,
    "--sticky-note-bg": hexToCssRgb(accentColor, opacity),
    "--sticky-note-header-bg": hexToCssRgb(headerColor, opacity),
    "--sticky-note-panel-bg": hexToCssRgb(panelColor, Math.min(opacity + 0.04, 1)),
    "--sticky-text-color": textColor,
    "--sticky-muted-color": mutedColor,
    "--sticky-panel-text": textColor,
    "--sticky-panel-muted": mutedColor,
    "--sticky-border-color": borderColor,
    "--sticky-control-bg": controlBackground,
    "--sticky-control-hover-bg": controlHoverBackground,
    "--sticky-code-bg": codeBackground,
    "--sticky-code-text": textColor,
    "--sticky-glass-highlight": glassHighlight,
    "--sticky-glass-lowlight": glassLowlight,
    "--sticky-glass-stroke": glassStroke,
    "--bn-colors-editor-text": textColor,
    "--bn-colors-menu-text": textColor,
    "--bn-colors-tooltip-text": textColor,
    "--bn-colors-hovered-text": textColor,
    "--bn-colors-selected-text": selectedText,
    "--bn-colors-selected-background": selectedBackground,
    "--bn-colors-border": borderColor,
    "--bn-colors-side-menu": mutedColor,
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

function getContrastingTextColor(backgroundHexColor) {
  return getRelativeLuminance(backgroundHexColor) > 0.46
    ? SESSION_TAB_CONTRAST_TEXT.dark
    : SESSION_TAB_CONTRAST_TEXT.light;
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

function formatColorValues(hexColor) {
  const [red, green, blue] = hexToRgb(hexColor);
  const hsl = rgbToHsl(red, green, blue);
  const lch = rgbToLch(red, green, blue);

  return [
    {
      label: "HEX",
      value: hexColor.slice(1).toLowerCase(),
    },
    {
      label: "HSL",
      value: `hsl(${Math.round(hsl.h)}deg ${Math.round(hsl.s * 100)}% ${Math.round(hsl.l * 100)}%)`,
    },
    {
      label: "RGB",
      value: `rgb(${red} ${green} ${blue})`,
    },
    {
      label: "LCH",
      value: `lch(${Math.round(lch.l)}% ${Math.round(lch.c)} ${Math.round(lch.h)}deg)`,
    },
  ];
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

  editor.focus();
  editor.setSelection(editor.document[0], editor.document[editor.document.length - 1]);
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
  for (const block of blocks) {
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

function getCaptureRect() {
  const surface = document.querySelector("[data-testid='sticky-editor-surface']");
  if (!surface) {
    return undefined;
  }

  const rect = surface.getBoundingClientRect();
  return {
    x: Math.max(0, Math.floor(rect.x)),
    y: Math.max(0, Math.floor(rect.y)),
    width: Math.max(
      1,
      Math.ceil(Math.max(rect.width, surface.scrollWidth, surface.clientWidth)),
    ),
    height: Math.max(
      1,
      Math.ceil(Math.max(rect.height, surface.scrollHeight, surface.clientHeight)),
    ),
  };
}

async function renderExportPng(rect) {
  const surface = document.querySelector("[data-testid='sticky-editor-surface']");
  if (!surface) {
    return undefined;
  }

  const width = rect?.width ?? Math.max(surface.scrollWidth, surface.clientWidth, 1);
  const height = rect?.height ?? Math.max(surface.scrollHeight, surface.clientHeight, 1);
  const pixelRatio = Math.min(2, window.devicePixelRatio || 1);

  return await toPng(surface, {
    backgroundColor: "transparent",
    cacheBust: true,
    canvasWidth: Math.ceil(width * pixelRatio),
    canvasHeight: Math.ceil(height * pixelRatio),
    pixelRatio,
    width,
    height,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      maxWidth: "none",
      maxHeight: "none",
    },
  });
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
