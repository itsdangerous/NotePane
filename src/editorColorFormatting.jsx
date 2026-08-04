import { useCallback } from "react";
import {
  BasicTextStyleButton,
  BlockTypeSelect,
  CreateLinkButton,
  FormattingToolbarController,
  getFormattingToolbarItems,
  TextAlignButton,
  useBlockNoteEditor,
  useComponentsContext,
  useEditorState,
} from "@blocknote/react";

const EDITOR_COLOR_VALUES = [
  "default",
  "gray",
  "brown",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "red",
];
const RECENT_EDITOR_COLOR_LIMIT = 5;
const CONTEXTUAL_FORMATTING_TOOL_KEYS = new Set([
  "tableCellMergeButton",
  "fileCaptionButton",
  "replaceFileButton",
  "fileRenameButton",
  "fileDeleteButton",
  "fileDownloadButton",
  "filePreviewButton",
]);
const FORMATTING_TOOLBAR_FLOATING_OPTIONS = {
  useFloatingOptions: {
    placement: "right-start",
  },
};

export function rememberEditorColor(recentColors, colorChoice) {
  if (!isEditorColorChoice(colorChoice)) {
    return recentColors;
  }

  return [
    colorChoice,
    ...recentColors.filter(
      (choice) =>
        choice.kind !== colorChoice.kind || choice.color !== colorChoice.color,
    ),
  ].slice(0, RECENT_EDITOR_COLOR_LIMIT);
}

export function applyEditorColor(editor, colorChoice) {
  if (!editor || !isEditorColorChoice(colorChoice)) {
    return false;
  }

  const styleType = colorChoice.kind === "text" ? "textColor" : "backgroundColor";
  try {
    if (colorChoice.color === "default") {
      editor.removeStyles({ [styleType]: "default" });
    } else {
      editor.addStyles({ [styleType]: colorChoice.color });
    }
    return true;
  } catch {
    return false;
  }
}

export function RecentColorFormattingToolbarController({
  recentColors,
  onColorUsed,
  portalElement,
}) {
  const Toolbar = useCallback(
    (props) => (
      <RecentColorFormattingToolbar
        {...props}
        recentColors={recentColors}
        onColorUsed={onColorUsed}
      />
    ),
    [onColorUsed, recentColors],
  );

  return (
    <FormattingToolbarController
      formattingToolbar={Toolbar}
      floatingUIOptions={FORMATTING_TOOLBAR_FLOATING_OPTIONS}
      portalElement={portalElement}
    />
  );
}

function RecentColorFormattingToolbar({
  blockTypeSelectItems,
  recentColors,
  onColorUsed,
}) {
  const Components = useComponentsContext();
  const contextualItems = getFormattingToolbarItems(blockTypeSelectItems).filter(
    (item) => CONTEXTUAL_FORMATTING_TOOL_KEYS.has(item.key),
  );

  if (!Components) {
    return null;
  }

  return (
    <Components.FormattingToolbar.Root
      className="bn-toolbar bn-formatting-toolbar notepane-formatting-toolbar"
    >
      <div className="notepane-formatting-type-row">
        <BlockTypeSelect items={blockTypeSelectItems} />
      </div>
      <div
        className="notepane-formatting-actions"
        role="group"
        aria-label="Text formatting"
      >
        <RecentColorStyleButton
          recentColors={recentColors}
          onColorUsed={onColorUsed}
        />
        <BasicTextStyleButton basicTextStyle="bold" />
        <BasicTextStyleButton basicTextStyle="italic" />
        <BasicTextStyleButton basicTextStyle="underline" />
        <BasicTextStyleButton basicTextStyle="strike" />
        <CreateLinkButton />
        <BasicTextStyleButton basicTextStyle="code" />
        <TextAlignButton textAlignment="left" />
        <TextAlignButton textAlignment="center" />
        <TextAlignButton textAlignment="right" />
      </div>
      <div
        className="notepane-formatting-contextual-actions"
        role="group"
        aria-label="Selected item actions"
      >
        {contextualItems}
      </div>
    </Components.FormattingToolbar.Root>
  );
}

function RecentColorStyleButton({ recentColors, onColorUsed }) {
  const Components = useComponentsContext();
  const editor = useBlockNoteEditor();
  const state = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      if (!currentEditor.isEditable) {
        return undefined;
      }

      const selectedBlocks = currentEditor.getSelection()?.blocks || [
        currentEditor.getTextCursorPosition().block,
      ];
      if (!selectedBlocks.some((block) => block.content !== undefined)) {
        return undefined;
      }

      const activeStyles = currentEditor.getActiveStyles();
      return {
        textColor: activeStyles.textColor || "default",
        backgroundColor: activeStyles.backgroundColor || "default",
      };
    },
  });

  if (!Components || !state) {
    return null;
  }

  const dictionary = editor.dictionary;
  const applyColor = (colorChoice) => {
    if (!applyEditorColor(editor, colorChoice)) {
      return;
    }

    onColorUsed(colorChoice);
    window.setTimeout(() => editor.focus(), 0);
  };

  return (
    <Components.Generic.Menu.Root>
      <Components.Generic.Menu.Trigger>
        <Components.FormattingToolbar.Button
          className="bn-button notepane-color-toolbar-button"
          label={dictionary.formatting_toolbar.colors.tooltip}
          mainTooltip={dictionary.formatting_toolbar.colors.tooltip}
          secondaryTooltip="Mod+Shift+H"
          icon={(
            <ActiveColorIcon
              textColor={state.textColor}
              backgroundColor={state.backgroundColor}
            />
          )}
        />
      </Components.Generic.Menu.Trigger>
      <Components.Generic.Menu.Dropdown
        className="bn-menu-dropdown bn-color-picker-dropdown notion-color-picker-dropdown"
      >
        <div className="notion-color-picker-content">
          {recentColors.length > 0 && (
            <ColorSection
              title="Recently used"
              choices={recentColors}
              state={state}
              colorLabels={dictionary.color_picker.colors}
              onSelect={applyColor}
              recent
            />
          )}
          <ColorSection
            title="Text color"
            choices={EDITOR_COLOR_VALUES.map((color) => ({ kind: "text", color }))}
            state={state}
            colorLabels={dictionary.color_picker.colors}
            onSelect={applyColor}
          />
          <ColorSection
            title="Background color"
            choices={EDITOR_COLOR_VALUES.map((color) => ({
              kind: "background",
              color,
            }))}
            state={state}
            colorLabels={dictionary.color_picker.colors}
            onSelect={applyColor}
          />
        </div>
      </Components.Generic.Menu.Dropdown>
    </Components.Generic.Menu.Root>
  );
}

function ColorSection({
  title,
  choices,
  state,
  colorLabels,
  onSelect,
  recent = false,
}) {
  const Components = useComponentsContext();

  return (
    <section
      className="notion-color-picker-section"
      aria-label={title}
      data-testid={recent ? "recent-editor-colors" : undefined}
    >
      <div className="notion-color-picker-label">{title}</div>
      <div className="notion-color-picker-grid">
        {choices.map((choice, index) => {
          const colorName = colorLabels[choice.color] || choice.color;
          const kindLabel = choice.kind === "text" ? "text color" : "background color";
          const label = `${colorName} ${kindLabel}`;
          const isActive = choice.kind === "text"
            ? state.textColor === choice.color
            : state.backgroundColor === choice.color;

          return (
            <Components.Generic.Menu.Item
              className="notion-color-swatch"
              aria-label={recent ? `Recent: ${label}` : label}
              data-active={isActive ? "true" : undefined}
              data-color-kind={choice.kind}
              data-color-value={choice.color}
              data-test={recent ? undefined : `${choice.kind}-color-${choice.color}`}
              data-testid={recent ? `recent-editor-color-${index}` : undefined}
              key={`${choice.kind}-${choice.color}`}
              onClick={() => onSelect(choice)}
            >
              <ColorChoiceIcon choice={choice} />
            </Components.Generic.Menu.Item>
          );
        })}
      </div>
    </section>
  );
}

function ActiveColorIcon({ textColor, backgroundColor }) {
  return (
    <span
      className="bn-color-icon notepane-editor-color-icon notepane-toolbar-color-icon"
      data-background-color={backgroundColor}
      data-text-color={textColor}
      aria-hidden="true"
    >
      A
    </span>
  );
}

function ColorChoiceIcon({ choice }) {
  return (
    <span
      className="bn-color-icon notepane-editor-color-icon notepane-color-choice-icon"
      data-background-color={choice.kind === "background" ? choice.color : "default"}
      data-text-color={choice.kind === "text" ? choice.color : "default"}
      aria-hidden="true"
    >
      {choice.kind === "text" ? "A" : ""}
    </span>
  );
}

function isEditorColorChoice(colorChoice) {
  return Boolean(
    colorChoice &&
      (colorChoice.kind === "text" || colorChoice.kind === "background") &&
      EDITOR_COLOR_VALUES.includes(colorChoice.color),
  );
}
