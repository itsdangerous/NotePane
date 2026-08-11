import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SideMenuExtension } from "@blocknote/core/extensions";
import {
  AddBlockButton,
  BlockColorsItem,
  DragHandleButton,
  DragHandleMenu,
  RemoveBlockItem,
  SideMenu,
  SideMenuController,
  useBlockNoteEditor,
  useExtension,
  useExtensionState,
} from "@blocknote/react";
import { Palette, Trash2 } from "lucide-react";

export function NotePaneSideMenuController({ portalElement }) {
  const editor = useBlockNoteEditor();
  const blockId = useExtensionState("sideMenu", {
    selector: (state) => state?.block?.id,
  });
  const blockIdRef = useRef(blockId);
  blockIdRef.current = blockId;

  useEffect(() => {
    const ownerDocument = editor.domElement?.ownerDocument;
    if (!ownerDocument) {
      return undefined;
    }
    const preserveDragPreviewWidth = (event) => {
      const button = event.target instanceof Element
        ? event.target.closest("button[draggable='true']")
        : null;
      if (!button?.querySelector("[data-test='dragHandle']")) {
        return;
      }
      const block = editor.domElement.querySelector(
        `.bn-block-outer[data-id="${escapeCssAttribute(blockIdRef.current)}"]`,
      );
      if (block) {
        ownerDocument.documentElement.style.setProperty(
          "--notepane-drag-preview-width",
          `${block.getBoundingClientRect().width}px`,
        );
      }
    };
    const clearDragPreviewWidth = () => {
      ownerDocument.documentElement.style.removeProperty(
        "--notepane-drag-preview-width",
      );
    };
    ownerDocument.addEventListener("dragstart", preserveDragPreviewWidth, true);
    ownerDocument.addEventListener("dragend", clearDragPreviewWidth, true);
    return () => {
      ownerDocument.removeEventListener("dragstart", preserveDragPreviewWidth, true);
      ownerDocument.removeEventListener("dragend", clearDragPreviewWidth, true);
      clearDragPreviewWidth();
    };
  }, [editor]);

  return (
    <SideMenuController
      portalElement={portalElement}
      sideMenu={NotePaneSideMenu}
    />
  );
}

function NotePaneSideMenu() {
  return (
    <SideMenu>
      <AddBlockButton />
      <DragHandleButton dragHandleMenu={NotePaneDragHandleMenu} />
    </SideMenu>
  );
}

function NotePaneDragHandleMenu() {
  return (
    <DragHandleMenu>
      <RemoveBlockItem>
        <span className="notepane-block-menu-item-content">
          <Trash2 aria-hidden="true" />
          Delete
        </span>
      </RemoveBlockItem>
      <BlockColorsItem>
        <span className="notepane-block-menu-item-content">
          <Palette aria-hidden="true" />
          Colors
        </span>
      </BlockColorsItem>
    </DragHandleMenu>
  );
}

export function BlockMenuHighlightController() {
  const editor = useBlockNoteEditor();
  const sideMenu = useExtension(SideMenuExtension);
  const blockId = useExtensionState("sideMenu", {
    selector: (state) => state?.block?.id,
  });
  const [openBlockId, setOpenBlockId] = useState(null);

  useLayoutEffect(() => {
    const ownerDocument = editor.domElement?.ownerDocument;
    if (!ownerDocument) {
      return undefined;
    }

    const syncHighlight = () => {
      const openHandle = ownerDocument.querySelector(
        ".bn-side-menu [data-test='dragHandle']",
      )?.closest("button[aria-expanded='true']");
      setOpenBlockId(openHandle && blockId ? String(blockId) : null);
    };

    const observer = new MutationObserver(syncHighlight);
    observer.observe(ownerDocument.body, {
      attributes: true,
      attributeFilter: ["aria-expanded"],
      childList: true,
      subtree: true,
    });
    syncHighlight();

    return () => {
      observer.disconnect();
    };
  }, [blockId, editor]);

  useEffect(() => {
    if (!openBlockId) {
      return undefined;
    }

    const ownerDocument = editor.domElement?.ownerDocument;
    if (!ownerDocument) {
      return undefined;
    }
    const deleteOpenBlock = (event) => {
      if (
        (event.key !== "Delete" && event.key !== "Backspace") ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey ||
        (event.target instanceof Element &&
          event.target.closest("input, textarea, select"))
      ) {
        return;
      }

      const block = editor.getBlock(openBlockId);
      if (!block) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const selectedBlocks = editor.getSelection()?.blocks;
      editor.removeBlocks(
        selectedBlocks?.some((selectedBlock) => selectedBlock.id === block.id)
          ? selectedBlocks
          : [block],
      );
      sideMenu.unfreezeMenu();
    };
    ownerDocument.addEventListener("keydown", deleteOpenBlock, true);
    return () => {
      ownerDocument.removeEventListener("keydown", deleteOpenBlock, true);
    };
  }, [editor, openBlockId, sideMenu]);

  if (!openBlockId) {
    return null;
  }

  const blockSelector = `.bn-editor .bn-block-outer[data-id="${escapeCssAttribute(
    openBlockId,
  )}"] > .bn-block`;
  return (
    <style data-block-menu-highlight={openBlockId}>
      {`${blockSelector} {
        background-color: color-mix(in srgb, var(--sticky-text-color) 7%, transparent);
        box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--sticky-text-color) 9%, transparent);
        animation: blockMenuSelectionIn 180ms ease-out both;
      }
      @media (prefers-reduced-motion: reduce) {
        ${blockSelector} { animation: none; }
      }`}
    </style>
  );
}

function escapeCssAttribute(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}
