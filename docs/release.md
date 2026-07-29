# Release

## Local app run

```bash
make run
```

This builds the Vite renderer and launches Electron.
When run from WSL, this creates `release/win-unpacked/` and launches the Windows `NotePane.exe` directly.

## App Packages

```bash
npm run app
```

This creates a package for the current OS using `electron-builder.yml`.

Platform-specific package commands:

```bash
npm run app:mac
npm run app:win
```

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

## Windows Distribution

`npm run app:win` creates an NSIS installer in `release/`.
Run it on Windows, or install Wine first when cross-building from Linux/WSL.

Before public distribution:

- Confirm final `appId`
- Confirm Windows icon conversion from `build/icon.png`
- Sign with a Windows code signing certificate
