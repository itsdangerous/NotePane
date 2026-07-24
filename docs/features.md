# Features

## Desktop

- Multiple sticky windows
- Tab session mode: one primary window with sidebar note/session tabs
- Sticky mode: each session opens as an individual sticky window
- Switching into Sticky mode arranges sessions as compact sticky-note windows
- Closing an individual sticky window keeps it closed until Show All NotePanes or another Sticky-mode entry
- Sticky mode windows have per-session pastel color and opacity controls in the header
- Sticky color/opacity carries back to the sidebar session tab color when returning to Tab session mode
- Drag a session tab outside the sidebar to detach it into a separate window
- Dock a detached sticky window back into tab sessions
- Custom NotePane shell
- Padded draggable header with no visible title in tab session mode
- Editable title in sticky mode header
- Session rename by double-clicking a sidebar tab
- Hover-only session delete button in the sidebar tab row
- Header-right Light/Dark switch in Tab session mode
- Compact Sticky mode header without the Light/Dark switch
- Direct Sun/Moon switch for global Notion-style Light/Dark app theme
- Preferences panel via macOS app menu or `Command + ,`
- Sidebar tab text color customization
- Tab color wheel
- Color brightness/value slider that is preserved when the wheel color changes
- Color opacity slider for sidebar tab text
- Eyedropper for tab text color when the runtime supports the browser `EyeDropper` API
- Editable HEX/HSL/RGB/LCH tab text color values
- Copy buttons for HEX/HSL/RGB/LCH tab text color values
- New note/session: `Command + T` or `Command + N`
- New sidebar session: dashed `+` button directly under the last session tab
- Switch sidebar sessions: `Command + 1` through `Command + 9` on macOS
- Previous/next sidebar session: `Command + Option + Left/Right`, wrapping across the first and last tabs
- Close current tab in tab session mode: `Command + W`
- Show all sticky notes: `Command + Shift + 0`
- Cycle sticky windows: `Command + Backtick`
- Toggle always on top: `Command + Shift + P`
- Toggle Tab/Sticky mode: `Command + Shift + M`
- Toggle Light/Dark mode: `Command + Shift + L`
- Open export menu: `Command + Shift + E`
- Delayed hover tooltips for clickable controls
- Window bounds persistence
- Editor area is explicitly non-drag so BlockNote mouse interactions remain intact
- Single share-style export icon with PNG/PDF format choices
- PNG/PDF export hides app chrome and sticky background

## Editor

BlockNote handles editor interaction directly.

- `/` slash menu
- `Enter` creates the next block
- `Shift + Enter` creates a line break inside the current block
- Side menu
- Drag handles
- Block drag/drop
- Block nesting
- Formatting toolbar
- Link toolbar
- Table handles
- `Command + A` selects all editor blocks
- `Command + X` cuts/removes the current block when no text is selected

## Blocks

- Paragraph
- Heading
- Toggle Heading
- Quote
- Bullet List
- Numbered List
- Check List
- Toggle List
- Code Block
- Table
- File
- Image
- Video
- Audio

## Media tools

- Image blocks expose an app-level image toolbar after selection
- Image download uses the desktop save dialog
- Image crop replaces the selected image block with a cropped PNG data URL

## Local storage

Stored fields:

- note id
- BlockNote document JSON
- markdown fallback
- window bounds
- always-on-top flag
- detached/docked state
- note title
- app-wide theme mode: `appTheme.mode`, either `light` or `dark`
- app-wide layout mode: `layoutMode`, either `tabs` or `sticky`
- optional sidebar tab text color
- optional sidebar tab text opacity
- timestamps
