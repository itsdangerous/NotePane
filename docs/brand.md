# NotePane Brand

## Name

Product name: `NotePane`

The name frames the app as a small, focused note window rather than only a classic sticky note.

## Signature colors

The app uses a quiet pastel system:

| Token | Hex | Use |
| --- | --- | --- |
| Pane Cream | `#FBF7EF` | Main note surface |
| Pastel Sage | `#DDEFD4` | Primary brand accent |
| Pastel Sky | `#D9ECF8` | Secondary brand accent |
| Graphite Ink | `#2F3437` | Primary text / icon contrast |

## Logo assets

- `assets/notepane-icon.svg` — editable app icon vector source
- `assets/notepane-icon.png` — canonical app icon raster source
- `build/icon.png` — generated development/Windows icon
- `build/icon.icns` — generated macOS app bundle icon
- `assets/notepane-wordmark.svg` — wordmark / font logo concept
- `assets/notepane-wordmark.png` — generated light-theme sidebar wordmark
- `assets/notepane-wordmark-dark.png` — generated dark-theme sidebar wordmark

Regenerate the packaged icon files after changing the source:

```bash
make icons
```
