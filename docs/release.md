# Release

## Local app run

```bash
make run
```

This builds the Vite renderer and launches Electron.

## macOS package

```bash
make app
```

The package is created by `electron-builder` using `electron-builder.yml`.

Output:

```text
release/
```

## Brew distribution

For Homebrew Cask distribution, publish the generated zip and create a cask that installs the generated `.app`.

Before public distribution:

- Set a final `appId`
- Confirm final app name `NotePane`
- Confirm final icon sources `build/icon.png` and `build/icon.icns`
- Sign with Developer ID
- Notarize with Apple
- Staple notarization ticket
- Update cask URL and SHA-256
