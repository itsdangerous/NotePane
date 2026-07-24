# Architecture

## Stack

- Electron for macOS desktop windows
- React for the renderer
- BlockNote for the editor
- Vite for renderer build
- Local JSON file for persistence

## Runtime split

| Layer | Responsibility |
| --- | --- |
| `electron/main.cjs` | app lifecycle, tab/sticky window orchestration, native menu, note/session create/activate/delete/detach/attach IPC, export/download IPC |
| `electron/store.cjs` | local JSON persistence |
| `electron/preload.cjs` | safe renderer bridge |
| `src/main.jsx` | BlockNote editor, sidebar sessions, layout mode switch, app theme switch, preferences panel, export menu, image tools |
| `src/styles.css` | transparent sticky shell CSS |

The renderer owns editor behavior. The desktop shell does not override BlockNote keyboard or mouse behavior.

## Persistence flow

1. BlockNote emits `onChange`.
2. Renderer serializes `editor.document` to `blocksJSON`.
3. Renderer also stores a lossy markdown fallback.
4. IPC sends the payload to Electron main.
5. `StickyStore` writes `notes.json` atomically.

Appearance changes use a separate IPC path and persist the note title plus optional sidebar tab text color and opacity in the
matching local JSON note record. Light/Dark mode is app-wide state and is persisted separately at the root of
`notes.json` as `appTheme.mode`. Layout mode is also app-wide and is stored as root `layoutMode`.

Sidebar session changes use note list/create/activate/delete/detach/attach IPC calls. Activating a session changes the note bound to
the current window, then remounts the BlockNote editor with that note's stored document. Deleting the active session
switches the current window to the next remaining session. The final remaining session cannot be deleted.

## Window model

The app supports two layout modes.

- Default size: `960 x 720`
- Minimum size: `640 x 500`
- `alwaysOnTop` defaults to `false`
- transparent window background for real macOS-level note transparency
- Bounds are saved on move/resize/close
- Tab session mode keeps one primary tabs window for docked sessions
- Sticky mode opens every session as its own compact sticky-note window when entering the mode
- Sticky mode arranges note windows in a small grid using the current primary display work area
- Closing an individual sticky window records it as manually closed and does not immediately recreate it
- Show All NotePanes clears manually closed sticky windows and opens every note window again
- `Command + T` creates a new sidebar session tab; `Command + N` remains available for new note/session
- The dashed `+` directly under the last sidebar session tab creates a new note/session in the current tabs window
- Dragging a sidebar tab outside the sidebar detaches it into a separate window
- A detached sticky window can be docked back into the tabs window
- Sidebar tab close appears only on row hover and deletes a note/session when more than one session exists
- `Command + 1` through `Command + 9` activates the matching sidebar session on macOS
- `Command + Option + Left/Right` activates the previous/next sidebar session and wraps at the ends
- `Command + W` deletes the current sidebar session in tab session mode instead of closing the primary window
- Sidebar tab double-click starts inline rename

## BlockNote configuration

The renderer uses:

- `BlockNoteView`
- default BlockNote UI
- `portalElements={{ default: document.body }}`
- code block extension from `@blocknote/code-block`
- advanced table options
- data URL file uploads for local persistence

## Export and media

- Export is opened from one icon and then chooses PNG or PDF.
- PNG export captures the visible editor surface with Electron `capturePage`.
- PDF export uses Electron `printToPDF` with print CSS that hides app chrome.
- Both export paths temporarily remove app chrome/background styling so the exported content has no NotePane shell background.
- Image download is handled in Electron main so `data:`, `file:`, and `http(s):` image URLs can be saved through the native save dialog.
- Image crop is renderer-side canvas processing and updates the selected image block to a cropped PNG data URL.

## Theme mode and Preferences panel

The app theme is intentionally limited to a Notion-style binary mode:

- `light`
- `dark`

The Light/Dark mode drives the shell, header, sidebar, editor surface, BlockNote theme, text, code background, code
text, menus, image tools, and crop dialog through CSS tokens. Full-window custom background colors are deliberately
not supported because they conflict with editor-level colors such as text color, code background, code text, and user
authored inline colors.

Light/Dark mode is global for the whole app. Switching sidebar sessions or opening another sticky window does not
change the mode; all windows receive the same app theme via Electron IPC.

Session tab backgrounds are not customizable. They are derived only from the current Light/Dark mode and whether the
session is active or inactive.

The Light/Dark switch is shown directly in the Tab session mode header and does not require opening Preferences.
Sticky mode hides this switch to keep each sticky window compact; the app-wide shortcut/menu state still remains global.

The Preferences panel is opened from the macOS app menu or `Command + ,` and is only for sidebar tab text styling:

- circular hue/saturation wheel
- brightness/value slider that remains unchanged when hue/saturation changes
- opacity slider for the sidebar tab text alpha channel
- eyedropper integration through the browser `EyeDropper` API when available
- editable HEX/HSL/RGB/LCH fields
- HEX/HSL/RGB/LCH copy buttons

The selected or typed color is parsed back into the active session's `theme.tabTextColor`.
The opacity slider is parsed back into the active session's `theme.tabTextOpacity`.
Sticky-mode header color controls use the same fields for the sticky background, so returning to Tab session mode
keeps the selected color/opacity on that session tab.

## Sticky chrome boundary

Sticky styling is applied outside the BlockNote editor:

- `.sticky-header` has no title text in tab session mode.
- `.sticky-header` contains editable title in sticky mode.
- `.sticky-header` contains the sidebar toggle or title, drag strip, layout switch, and export controls.
- Sticky mode uses a shorter header and hides the Light/Dark switch.
- The sticky header exposes a color button for sticky background color/opacity.
- The Preferences panel contains only sidebar tab text color/opacity settings in Tab session mode.
- The export control uses a share-style icon and opens PNG/PDF choices.
- `.sticky-header` is the only drag region.
- `.sticky-editor-surface` is explicitly `no-drag`.
- Sidebar controls, header toggle, and image tools are explicitly `no-drag`.
- Clickable controls use pointer cursor, small hover animation, and delayed shortcut tooltips.
- BlockNote floating UI still portals to `document.body`.
- BlockNote block internals are not restyled.
