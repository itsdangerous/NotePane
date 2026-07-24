import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
const STICKY_PASTEL_PALETTE = [
  "#fff2b8",
  "#ffd7e8",
  "#dff4d7",
  "#d9efff",
  "#eadcff",
  "#ffe4ca",
];
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
      const [loadedNotes, loadedAppTheme, loadedLayoutMode] = await Promise.all([
        electronApi.listNotes(),
        electronApi.getAppTheme?.(),
        electronApi.getLayoutMode?.(),
      ]);
      const loadedNote = resolvedNoteId
        ? await electronApi.getNote(resolvedNoteId)
        : null;

      if (!cancelled) {
        setAppTheme(normalizeAppTheme(loadedAppTheme));
        setLayoutMode(normalizeLayoutMode(loadedLayoutMode));
        const fallbackNote =
          loadedNote ??
          loadedNotes[0] ?? {
            id: "missing-note",
            title: DEFAULT_TITLE,
            blocksJSON: null,
            markdown: "",
            theme: DEFAULT_THEME,
            seedDemoContent: true,
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
  }, []);

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
  });

  const [title, setTitle] = useState(normalizeTitle(note.title));
  const [theme, setTheme] = useState(normalizeTheme(note.theme));
  const appThemeMode = normalizeAppTheme(appTheme).mode;
  const normalizedLayoutMode = normalizeLayoutMode(layoutMode);
  const effectiveLayoutMode =
    normalizedLayoutMode === "sticky" || note.detached ? "sticky" : "tabs";
  const dockedNotes = useMemo(
    () => notes.filter((candidate) => !candidate.detached),
    [notes],
  );
  const visibleSessionNotes = dockedNotes.length > 0 ? dockedNotes : notes;
  const noteIndex = Math.max(
    0,
    notes.findIndex((candidate) => candidate.id === note.id),
  );
  const stickyAccentColor = resolveStickyAccentColor(theme, noteIndex);
  const shellStyle = effectiveLayoutMode === "sticky"
    ? getStickyShellStyle(theme, stickyAccentColor)
    : undefined;
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [isPreferencesPanelOpen, setIsPreferencesPanelOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
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
    (nextTitle, nextTheme) => {
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
        });
      }, 160);
    },
    [note.id],
  );

  const updateTitle = useCallback(
    (nextTitle) => {
      setTitle(nextTitle);
      onNoteChanged({
        ...note,
        title: normalizeTitle(nextTitle),
        theme,
      });
      scheduleAppearanceSave(nextTitle, theme);
    },
    [note, onNoteChanged, scheduleAppearanceSave, theme],
  );

  const commitTitle = useCallback(() => {
    const normalizedTitle = normalizeTitle(title);
    setTitle(normalizedTitle);
    onNoteChanged({
      ...note,
      title: normalizedTitle,
      theme,
    });
    scheduleAppearanceSave(normalizedTitle, theme);
  }, [note, onNoteChanged, scheduleAppearanceSave, theme, title]);

  const updateTheme = useCallback(
    (nextTheme) => {
      const normalizedTheme = normalizeTheme(nextTheme);
      setTheme(normalizedTheme);
      onNoteChanged({
        ...note,
        title: normalizeTitle(title),
        theme: normalizedTheme,
      });
      scheduleAppearanceSave(title, normalizedTheme);
    },
    [note, onNoteChanged, scheduleAppearanceSave, title],
  );

  const openPreferences = useCallback(() => {
    setIsExportMenuOpen(false);
    setIsPreferencesPanelOpen(true);
  }, []);

  const toggleLayoutMode = useCallback(() => {
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
    setIsPreferencesPanelOpen(false);
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
        setIsPreferencesPanelOpen(false);
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
    toggleLayoutMode,
  ]);

  useEffect(() => {
    if (!isPreferencesPanelOpen) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsPreferencesPanelOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape, true);
    return () => {
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [isPreferencesPanelOpen]);

  useEffect(() => {
    const handleEditorKeyDown = (event) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key !== "a" && key !== "x") {
        return;
      }

      if (!isEditorShortcutTarget(event.target)) {
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
  }, [activeImageBlockId, editor, scheduleSave]);

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
        const dataUrl = type === "png" ? await renderExportPng(rect) : undefined;
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
        });
        scheduleAppearanceSave(normalizedTitle, theme);
        return;
      }

      onNoteChanged(updatedNote);
      await electronApi?.updateAppearance({
        noteId: sessionNote.id,
        title: normalizedTitle,
        theme: normalizeTheme(sessionNote.theme),
      });
    },
    [draftSessionTitle, note, onNoteChanged, scheduleAppearanceSave, theme],
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
      <header className="sticky-header" data-testid="sticky-header">
        {effectiveLayoutMode === "tabs" ? (
          null
        ) : (
          <form
            className="sticky-title-form"
            draggable={note.detached}
            onDragStart={(event) => {
              event.dataTransfer?.setData("application/x-notepane-note", note.id);
              event.dataTransfer.effectAllowed = "move";
            }}
            onSubmit={(event) => {
              event.preventDefault();
              commitTitle();
            }}
          >
            <input
              aria-label="Note title"
              className="sticky-title-input"
              value={title}
              spellCheck={false}
              onChange={(event) => updateTitle(event.target.value)}
              onBlur={commitTitle}
              onFocus={(event) => event.target.select()}
            />
          </form>
        )}
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
          {effectiveLayoutMode === "sticky" && (
            <>
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
                  setIsPreferencesPanelOpen((value) => !value);
                  setIsExportMenuOpen(false);
                }}
              >
                <PaletteIcon />
              </button>
            </>
          )}
          <LayoutModeSwitch
            mode={normalizedLayoutMode}
            onChange={toggleLayoutMode}
          />
          {effectiveLayoutMode === "tabs" && (
            <HeaderModeSwitch
              mode={appThemeMode}
              onChange={onAppThemeModeChanged}
            />
          )}
          <div className="export-control">
            <button
              type="button"
              className="export-icon-button has-tooltip"
              aria-label="Export note"
              aria-expanded={isExportMenuOpen}
              data-tooltip={`Export · ${getShortcutLabel("⇧E")}`}
              onMouseDown={preventFocusLoss}
              onClick={() => {
                setIsExportMenuOpen((value) => !value);
                setIsPreferencesPanelOpen(false);
              }}
            >
              <ShareIcon />
            </button>
            {isExportMenuOpen && (
              <div className="export-menu" role="menu" aria-label="Export format">
                <button
                  type="button"
                  role="menuitem"
                  onMouseDown={preventFocusLoss}
                  onClick={() => void exportNote("png")}
                >
                  Export as PNG
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onMouseDown={preventFocusLoss}
                  onClick={() => void exportNote("pdf")}
                >
                  Export as PDF
                </button>
              </div>
            )}
          </div>
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
                      style={getSessionTabStyle(sessionNote.theme, appThemeMode)}
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
                      style={getSessionTabStyle(sessionNote.theme, appThemeMode)}
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
          onMouseDown={focusLastBlockFromEmptySurface}
        >
          <BlockNoteView
            editor={editor}
            theme={appThemeMode}
            onChange={scheduleSave}
            portalElements={{ default: document.body }}
          />
        </section>
      </div>
      {isPreferencesPanelOpen && (
        <PreferencesPanel
          theme={theme}
          appThemeMode={appThemeMode}
          variant={effectiveLayoutMode === "sticky" ? "sticky" : "tabs"}
          defaultColor={
            effectiveLayoutMode === "sticky" ? stickyAccentColor : undefined
          }
          onChange={updateTheme}
          onClose={() => setIsPreferencesPanelOpen(false)}
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

function PreferencesPanel({
  theme,
  appThemeMode,
  variant = "tabs",
  defaultColor,
  onChange,
  onClose,
}) {
  const isStickyVariant = variant === "sticky";
  const activeColor = isStickyVariant
    ? resolveThemeAccentColor(theme, defaultColor ?? STICKY_PASTEL_PALETTE[0])
    : resolveTabTextColor(theme, appThemeMode);
  const activeOpacity = resolveTabTextOpacity(theme);
  const valueAriaTarget = isStickyVariant ? "sticky color" : "tab text color";
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
    <div className="preferences-panel" role="dialog" aria-label="Preferences panel">
      <div className="preferences-panel-header">
        <div>
          <div className="preferences-title">
            {isStickyVariant ? "Sticky color" : "Preferences"}
          </div>
          <div className="preferences-subtitle">
            {isStickyVariant
              ? "Sticky background and tab color"
              : "Session tab text only"}
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
        <section className="preferences-section">
          <div className="preferences-section-title">
            {isStickyVariant ? "Pastel sticky color" : "Sidebar tab text color"}
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
            ariaLabel={isStickyVariant ? "Sticky color" : "Tab text color"}
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
              onInput={(event) =>
                updateTabTextOpacity(event.currentTarget.value)
              }
              onChange={(event) =>
                updateTabTextOpacity(event.target.value)
              }
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
              aria-label={isStickyVariant ? "Reset sticky color" : "Reset tab text color"}
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
  return (
    <svg
      className="notepane-action-icon notepane-icon-sidebar"
      data-icon-tone="sidebar"
      data-sidebar-icon-state={expanded ? "expanded" : "compact"}
      viewBox="0 0 28 28"
      width="24"
      height="24"
      aria-hidden="true"
    >
      <rect x="4" y="5" width="20" height="18" rx="6" fill="var(--icon-surface-fill)" />
      <rect x="6" y="7" width="5.6" height="14" rx="2.8" fill="var(--icon-muted-fill)" />
      <path d="M14.5 10h5.5M14.5 14h4.3M14.5 18h5.8" />
      <path
        className="sidebar-toggle-arrow"
        d={expanded ? "m9.5 11.5-2.5 2.5 2.5 2.5" : "m7.5 11.5 2.5 2.5-2.5 2.5"}
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      className="notepane-action-icon notepane-icon-share"
      data-icon-tone="share"
      viewBox="0 0 28 28"
      width="24"
      height="24"
      aria-hidden="true"
    >
      <rect x="6" y="11" width="16" height="11" rx="4" fill="var(--icon-surface-fill)" />
      <path d="M14 15V5.5" />
      <path d="M10.5 9 14 5.5 17.5 9" />
      <path d="M9 13.8v3.7a2.5 2.5 0 0 0 2.5 2.5h5a2.5 2.5 0 0 0 2.5-2.5v-3.7" />
    </svg>
  );
}

function PaletteIcon() {
  return (
    <svg
      className="notepane-action-icon notepane-icon-palette"
      data-icon-tone="palette"
      viewBox="0 0 28 28"
      width="24"
      height="24"
      aria-hidden="true"
    >
      <path
        d="M14 4.5c-5.2 0-9.4 3.8-9.4 8.6 0 4.2 3.7 7.6 8.2 7.6h1.5c1.1 0 1.6-1.3.9-2.1-.7-.8-.1-2 1-2h2.2c3 0 5-2.3 5-5C23.4 7.6 19.2 4.5 14 4.5Z"
        fill="var(--icon-surface-fill)"
      />
      <circle className="palette-accent" cx="10" cy="11" r="1.8" fill="var(--sticky-color-preview, currentColor)" />
      <circle className="palette-swatch" cx="13.4" cy="8.7" r="1.8" fill="var(--icon-muted-fill)" />
      <circle className="palette-swatch" cx="17.5" cy="9.7" r="1.8" fill="var(--icon-muted-fill)" />
      <circle className="palette-swatch" cx="19" cy="13.5" r="1.8" fill="var(--icon-muted-fill)" />
    </svg>
  );
}

function PinIcon({ pinned = false }) {
  return (
    <svg
      className="notepane-action-icon notepane-icon-pin"
      data-icon-tone="pin"
      data-pin-state={pinned ? "pinned" : "unpinned"}
      viewBox="0 0 28 28"
      width="24"
      height="24"
      aria-hidden="true"
    >
      <path
        className="pin-head"
        d="M10 4.8h8l-.9 7 3 3v1.7H7.9v-1.7l3-3L10 4.8Z"
        fill="var(--pin-head-fill)"
      />
      <path className="pin-stem" d="M14 16.6v6" />
      <path className="pin-point" d="M11.8 22.6h4.4" />
    </svg>
  );
}

function TabsModeIcon() {
  return (
    <svg
      className="notepane-action-icon notepane-icon-tabs"
      data-icon-tone="tabs"
      viewBox="0 0 30 30"
      width="26"
      height="26"
      aria-hidden="true"
    >
      <rect x="5" y="6" width="20" height="18" rx="6" fill="var(--icon-surface-fill)" />
      <rect x="6.5" y="7.5" width="7" height="15" rx="3.2" fill="var(--icon-muted-fill)" />
      <path d="M16 11h5.2M16 15h4M16 19h5.5" />
      <circle cx="10" cy="11" r="1" fill="currentColor" />
      <circle cx="10" cy="15" r="1" fill="currentColor" />
      <circle cx="10" cy="19" r="1" fill="currentColor" />
    </svg>
  );
}

function StickyModeIcon() {
  return (
    <svg
      className="notepane-action-icon notepane-icon-sticky"
      data-icon-tone="sticky"
      viewBox="0 0 30 30"
      width="26"
      height="26"
      aria-hidden="true"
    >
      <rect x="9" y="5.5" width="13" height="12" rx="4" fill="var(--icon-muted-fill)" />
      <rect x="6" y="9" width="13" height="12" rx="4" fill="var(--icon-muted-fill)" />
      <rect x="3.5" y="12.5" width="13" height="12" rx="4" fill="var(--icon-surface-fill)" />
      <path d="M7.2 17h5.2M7.2 20h3.8" />
      <path d="m20.5 8.8 2.7-2.7" />
    </svg>
  );
}

function DockIcon() {
  return (
    <svg
      className="notepane-action-icon notepane-icon-dock"
      data-icon-tone="dock"
      viewBox="0 0 28 28"
      width="24"
      height="24"
      aria-hidden="true"
    >
      <rect x="5" y="7" width="18" height="14" rx="5" fill="var(--icon-surface-fill)" />
      <path d="M9.5 12h9M9.5 16h5.5" />
      <path d="M7.5 21.2h13" />
    </svg>
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

function normalizeAppTheme(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    mode: source.mode === "dark" ? "dark" : "light",
  };
}

function normalizeLayoutMode(value) {
  return value === "sticky" ? "sticky" : DEFAULT_LAYOUT_MODE;
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
    : normalizeOptionalHexColor(fallbackColor, STICKY_PASTEL_PALETTE[0]);
}

function resolveStickyAccentColor(theme, noteIndex = 0) {
  const fallbackColor =
    STICKY_PASTEL_PALETTE[
      Math.abs(Number.isFinite(noteIndex) ? noteIndex : 0) %
        STICKY_PASTEL_PALETTE.length
    ];
  return resolveThemeAccentColor(theme, fallbackColor);
}

function resolveTabTextOpacity(theme) {
  return normalizeTheme(theme).tabTextOpacity;
}

function getSessionTabStyle(theme, appThemeMode = DEFAULT_APP_THEME.mode) {
  const tabTextColor = normalizeOptionalHexColor(theme?.tabTextColor);
  const tabTextOpacity = resolveTabTextOpacity(theme);

  if (!tabTextColor && tabTextOpacity === DEFAULT_THEME.tabTextOpacity) {
    return {};
  }

  return {
    "--session-tab-text-color": hexToCssRgb(
      resolveTabTextColor(theme, appThemeMode),
      tabTextOpacity,
    ),
  };
}

function getStickyShellStyle(theme, accentColor) {
  const opacity = resolveTabTextOpacity(theme);
  const headerColor = mixHexColors(accentColor, "#ffffff", 0.46);
  const panelColor = mixHexColors(accentColor, "#ffffff", 0.34);
  return {
    "--sticky-note-accent-color": accentColor,
    "--sticky-note-bg": hexToCssRgb(accentColor, opacity),
    "--sticky-note-header-bg": hexToCssRgb(headerColor, opacity),
    "--sticky-note-panel-bg": hexToCssRgb(panelColor, Math.min(opacity + 0.04, 1)),
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

  if (target.closest(".sticky-header, .session-sidebar, .image-tools, .crop-dialog, .preferences-panel")) {
    return false;
  }

  return Boolean(
    target.closest(".bn-container") ||
      target.closest("[data-testid='sticky-editor-surface']"),
  );
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
