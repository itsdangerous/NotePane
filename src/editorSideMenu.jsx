import { useLayoutEffect, useState } from "react";
import {
  useBlockNoteEditor,
  useExtensionState,
} from "@blocknote/react";

export function BlockMenuHighlightController() {
  const editor = useBlockNoteEditor();
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
