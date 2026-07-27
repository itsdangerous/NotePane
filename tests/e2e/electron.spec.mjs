import { _electron as electron, expect, test } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

test("Electron app opens a sticky window and persists editor content", async () => {
  const userDataDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "notepane-electron-"),
  );
  const exportDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "notepane-export-"),
  );
  const electronApp = await launchApp(userDataDirectory, exportDirectory);

  try {
    const page = await electronApp.firstWindow();
    await expect(page.getByTestId("sticky-editor-surface")).toBeVisible();
    await expect(page.getByText("Welcome to BlockNote!"))
      .toBeVisible();

    await page.getByRole("tab").first().dblclick();
    await page.getByLabel("Session name").fill("Project note");
    await page.keyboard.press("Enter");
    await page.getByRole("switch", { name: "Theme mode" }).click();
    await clickMenuItem(electronApp, "Preferences");
    await expect(page.getByRole("dialog", { name: "Preferences window" }))
      .toBeVisible();
    await page.getByLabel("RGB session tab color value").fill("rgb(255 255 255)");
    await page.getByRole("button", { name: "Close preferences" }).click();
    await expect(page.getByRole("dialog", { name: "Preferences window" }))
      .toHaveCount(0);
    await page.addStyleTag({
      content: ".bn-editor { padding-bottom: 1400px !important; }",
    });
    await page.getByRole("paragraph").filter({ hasText: /^$/ }).last().click();
    await page.keyboard.insertText("electron persistence probe");
    await page.keyboard.press(modifierShortcut("Shift+E"));
    await page.getByRole("menuitem", { name: "Export as PNG" }).click();
    await expect.poll(
      () => fs.existsSync(path.join(exportDirectory, "Project note.png")),
      { timeout: 20_000 },
    )
      .toBe(true);
    await page.keyboard.press(modifierShortcut("Shift+E"));
    await page.getByRole("menuitem", { name: "Export as PDF" }).click();
    await page.waitForTimeout(800);

    const notesPath = path.join(userDataDirectory, "notes.json");
    await expect.poll(() => fs.existsSync(notesPath)).toBe(true);
    await expect.poll(
      () => fs.existsSync(path.join(exportDirectory, "Project note.pdf")),
      { timeout: 20_000 },
    )
      .toBe(true);

    const persistedState = JSON.parse(fs.readFileSync(notesPath, "utf8"));
    const notes = persistedState.notes;
    expect(notes).toHaveLength(1);
    expect(persistedState.appTheme.mode).toBe("dark");
    expect(persistedState.layoutMode).toBe("tabs");
    expect(notes[0].title).toBe("Project note");
    expect(notes[0].theme.mode).toBeUndefined();
    expect(notes[0].theme.tabBackgroundColor).toBeUndefined();
    expect(notes[0].theme.tabTextColor).toBe("#ffffff");
    expect(notes[0].theme.tabTextOpacity).toBe(1);
    expect(notes[0].theme.backgroundColor).toBeUndefined();
    expect(notes[0].theme.backgroundOpacity).toBeUndefined();
    expect(notes[0].theme.textColor).toBeUndefined();
    expect(notes[0].markdown).toContain("electron persistence probe");
    expect(notes[0].blocksJSON).toContain("electron persistence probe");
    expect(notes[0].alwaysOnTop).toBe(false);
    expect(fs.statSync(path.join(exportDirectory, "Project note.png")).size)
      .toBeGreaterThan(1000);
    expect(fs.statSync(path.join(exportDirectory, "Project note.pdf")).size)
      .toBeGreaterThan(1000);
    const pngDimensions = readPngDimensions(
      path.join(exportDirectory, "Project note.png"),
    );
    expect(pngDimensions.height).toBeGreaterThan(pngDimensions.width);
    expect(pngDimensions.height).toBeGreaterThan(1200);
  } finally {
    await electronApp.close();
  }
});

test("Electron menu actions respect tabs/sticky modes and toggle always-on-top", async () => {
  const userDataDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "notepane-electron-"),
  );
  const electronApp = await launchApp(userDataDirectory);

  try {
    const page = await electronApp.firstWindow();
    await expect(page.getByTestId("sticky-editor-surface")).toBeVisible();
    await expect(page.getByText("Welcome to BlockNote!"))
      .toBeVisible();

    await expect.poll(async () => {
      return await electronApp.evaluate(({ BrowserWindow }) => {
        return BrowserWindow.getAllWindows().length;
      });
    }).toBe(1);

    await clickMenuItem(electronApp, "New Tab");
    await expect.poll(async () => {
      return await electronApp.evaluate(({ BrowserWindow }) => {
        return BrowserWindow.getAllWindows().length;
      });
    }).toBe(1);
    await expect(page.getByRole("tab")).toHaveCount(2);

    await clickMenuItem(electronApp, "Close Tab / Window");
    await expect.poll(async () => {
      return await electronApp.evaluate(({ BrowserWindow }) => {
        return BrowserWindow.getAllWindows().length;
      });
    }).toBe(1);
    await expect(page.getByRole("tab")).toHaveCount(1);

    await clickMenuItem(electronApp, "New Note");
    await expect.poll(async () => {
      return await electronApp.evaluate(({ BrowserWindow }) => {
        return BrowserWindow.getAllWindows().length;
      });
    }).toBe(1);
    await expect(page.getByRole("tab")).toHaveCount(2);

    await clickMenuItem(electronApp, "Toggle Tabs / Sticky Mode");
    await expect.poll(async () => {
      return await electronApp.evaluate(({ BrowserWindow }) => {
        return BrowserWindow.getAllWindows().length;
      });
    }).toBe(2);
    await expect.poll(async () => {
      return await electronApp.evaluate(({ BrowserWindow }) => {
        return BrowserWindow.getAllWindows().map((window) => window.getBounds());
      });
    }).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          width: 420,
          height: 340,
        }),
      ]),
    );

    await electronApp.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows().at(-1)?.close();
    });
    await expect.poll(async () => {
      return await electronApp.evaluate(({ BrowserWindow }) => {
        return BrowserWindow.getAllWindows().length;
      });
    }).toBe(1);

    await electronApp.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows().at(-1)?.focus();
    });
    await expect.poll(async () => {
      return await electronApp.evaluate(({ BrowserWindow }) => {
        return BrowserWindow.getFocusedWindow()?.isAlwaysOnTop();
      });
    }).toBe(false);

    await clickMenuItem(electronApp, "Toggle Always On Top");
    await expect.poll(async () => {
      return await electronApp.evaluate(({ BrowserWindow }) => {
        return BrowserWindow.getFocusedWindow()?.isAlwaysOnTop();
      });
    }).toBe(true);
  } finally {
    await electronApp.close();
  }
});

test("Electron creates sticky-mode tabs with a persisted default accent", async () => {
  const userDataDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "notepane-electron-"),
  );
  const electronApp = await launchApp(userDataDirectory);

  try {
    const page = await electronApp.firstWindow();
    await expect(page.getByTestId("sticky-editor-surface")).toBeVisible();

    await clickMenuItem(electronApp, "Toggle Tabs / Sticky Mode");
    await expect.poll(async () => {
      return await electronApp.evaluate(({ BrowserWindow }) => {
        return BrowserWindow.getAllWindows().length;
      });
    }).toBe(1);

    await clickMenuItem(electronApp, "New Tab");
    await expect.poll(async () => {
      return await electronApp.evaluate(({ BrowserWindow }) => {
        return BrowserWindow.getAllWindows().length;
      });
    }).toBe(2);

    await expect.poll(() => {
      const state = JSON.parse(
        fs.readFileSync(path.join(userDataDirectory, "notes.json"), "utf8"),
      );
      return state.notes.map((note) => note.theme);
    }).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tabTextColor: "#ffd7e8",
          tabTextOpacity: 1,
        }),
      ]),
    );

    await clickMenuItem(electronApp, "Toggle Tabs / Sticky Mode");
    await expect.poll(async () => {
      return await electronApp.evaluate(({ BrowserWindow }) => {
        return BrowserWindow.getAllWindows().length;
      });
    }).toBe(1);

    const tabsPage = getOpenPages(electronApp)[0] ?? await electronApp.firstWindow();
    await expect(tabsPage.getByRole("tab")).toHaveCount(2);
    await expect.poll(async () => {
      return await tabsPage.evaluate(() => {
        const tab = [...document.querySelectorAll(".session-tab-row")]
          .find((candidate) =>
            candidate.getAttribute("style")?.includes("rgb(255 215 232 / 1)"),
          );
        return tab
          ? {
              background: getComputedStyle(tab).backgroundColor,
              color: getComputedStyle(tab).color,
              boxShadow: getComputedStyle(tab).boxShadow,
            }
          : null;
      });
    }).toEqual({
      background: "rgb(255, 215, 232)",
      color: "rgba(31, 31, 31, 0.72)",
      boxShadow: "rgba(31, 31, 31, 0.04) 0px 0px 0px 1px inset",
    });
  } finally {
    await electronApp.close();
  }
});

test("Electron exposes installed font families to the renderer", async () => {
  test.skip(process.platform !== "darwin", "Installed font enumeration currently uses macOS system_profiler.");

  const userDataDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "notepane-electron-"),
  );
  const electronApp = await launchApp(userDataDirectory);

  try {
    const page = await electronApp.firstWindow();
    await expect(page.getByTestId("sticky-editor-surface")).toBeVisible();

    await expect.poll(async () => {
      const currentPage = getOpenPages(electronApp)[0];
      if (!currentPage) {
        return 0;
      }

      try {
        return await currentPage.evaluate(async () => {
          const fonts = await window.blocknoteSticky?.listFonts?.();
          return Array.isArray(fonts) ? fonts.length : 0;
        });
      } catch {
        return 0;
      }
    }, { timeout: 25_000 }).toBeGreaterThan(0);
  } finally {
    await electronApp.close();
  }
});

test("Electron vertically centers macOS traffic lights for tabs and sticky windows", async () => {
  test.skip(process.platform !== "darwin", "macOS traffic lights are only available on darwin.");

  const userDataDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "notepane-electron-"),
  );
  writeInitialNotes(userDataDirectory, [
    {
      id: "first-note",
      title: "First note",
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: "second-note",
      title: "Second note",
      createdAt: 2,
      updatedAt: 2,
    },
  ]);
  const electronApp = await launchApp(userDataDirectory);

  try {
    const page = await electronApp.firstWindow();
    await expect(page.getByTestId("sticky-header")).toBeVisible();

    await expect.poll(async () => {
      return await getWindowButtonPosition(electronApp, 0);
    }).toEqual({ x: 14, y: 15 });
    await expect.poll(async () => {
      return await getAllWindowShadowStates(electronApp);
    }).toEqual([true]);

    await clickMenuItem(electronApp, "Toggle Tabs / Sticky Mode");
    await expect.poll(async () => {
      return await electronApp.evaluate(({ BrowserWindow }) => {
        return BrowserWindow.getAllWindows().length;
      });
    }).toBe(2);

    await expect.poll(async () => {
      return await getAllWindowButtonPositions(electronApp);
    }).toEqual([
      { x: 14, y: 10 },
      { x: 14, y: 10 },
    ]);
    await expect.poll(async () => {
      return await getAllWindowShadowStates(electronApp);
    }).toEqual([true, true]);
  } finally {
    await electronApp.close();
  }
});

async function getWindowButtonPosition(electronApp, windowIndex) {
  return await electronApp.evaluate(({ BrowserWindow }, index) => {
    const window = BrowserWindow.getAllWindows()[index];
    return window?.getWindowButtonPosition?.()
      ?? window?.getTrafficLightPosition?.()
      ?? window?.__notepaneTrafficLightPosition
      ?? null;
  }, windowIndex);
}

async function getAllWindowButtonPositions(electronApp) {
  return await electronApp.evaluate(({ BrowserWindow }) => {
    return BrowserWindow.getAllWindows().map((window) =>
      window?.getWindowButtonPosition?.()
        ?? window?.getTrafficLightPosition?.()
        ?? window?.__notepaneTrafficLightPosition
        ?? null
    );
  });
}

async function getAllWindowShadowStates(electronApp) {
  return await electronApp.evaluate(({ BrowserWindow }) => {
    return BrowserWindow.getAllWindows().map((window) => window?.hasShadow?.() ?? null);
  });
}

async function getFirstWindowBounds(electronApp) {
  return await electronApp.evaluate(({ BrowserWindow }) => {
    return BrowserWindow.getAllWindows()[0]?.getBounds() ?? null;
  });
}

test("Electron returns to tab session mode after every sticky window is closed", async () => {
  const userDataDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "notepane-electron-"),
  );
  writeInitialNotes(userDataDirectory, [
    {
      id: "first-note",
      title: "First note",
      theme: {
        tabTextColor: "#fff2b8",
        tabTextOpacity: 1,
      },
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: "second-note",
      title: "Second note",
      theme: {
        tabTextColor: "#d9efff",
        tabTextOpacity: 1,
      },
      createdAt: 2,
      updatedAt: 2,
    },
  ]);
  const electronApp = await launchApp(userDataDirectory);

  try {
    const page = await electronApp.firstWindow();
    await expect(page.getByTestId("sticky-editor-surface")).toBeVisible();
    await expect(page.getByRole("tab")).toHaveCount(2);

    await clickMenuItem(electronApp, "Toggle Tabs / Sticky Mode");
    await expect.poll(async () => {
      return await electronApp.evaluate(({ BrowserWindow }) => {
        return BrowserWindow.getAllWindows().length;
      });
    }).toBe(2);

    await electronApp.evaluate(({ BrowserWindow }) => {
      for (const window of BrowserWindow.getAllWindows()) {
        window.close();
      }
    });

    await expect.poll(async () => {
      return await electronApp.evaluate(({ BrowserWindow }) => {
        return BrowserWindow.getAllWindows().length;
      });
    }).toBe(1);

    await expect.poll(() => {
      const state = JSON.parse(
        fs.readFileSync(path.join(userDataDirectory, "notes.json"), "utf8"),
      );
      return state.layoutMode;
    }).toBe("tabs");

    await expect.poll(async () => {
      return await electronApp.evaluate(async ({ BrowserWindow }) => {
        const window = BrowserWindow.getAllWindows()[0];
        if (!window) {
          return null;
        }

        return await window.webContents.executeJavaScript(
          "document.querySelector('[data-testid=\"sticky-shell\"]')?.dataset.layoutMode ?? null",
          true,
        );
      });
    }, { timeout: 20_000 }).toBe("tabs");
  } finally {
    await electronApp.close();
  }
});

test("Electron sticky windows keep independent pin and color updates", async () => {
  const userDataDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "notepane-electron-"),
  );
  writeInitialNotes(userDataDirectory, [
    {
      id: "first-note",
      title: "First note",
      theme: {
        tabTextColor: "#fff2b8",
        tabTextOpacity: 1,
      },
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: "second-note",
      title: "Second note",
      theme: {
        tabTextColor: "#ffd7e8",
        tabTextOpacity: 1,
      },
      createdAt: 2,
      updatedAt: 2,
    },
  ]);
  const electronApp = await launchApp(userDataDirectory);

  try {
    const page = await electronApp.firstWindow();
    await expect(page.getByTestId("sticky-editor-surface")).toBeVisible();
    await expect(page.getByRole("tab")).toHaveCount(2);

    await clickMenuItem(electronApp, "Toggle Tabs / Sticky Mode");
    await expect.poll(async () => {
      return await electronApp.evaluate(({ BrowserWindow }) => {
        return BrowserWindow.getAllWindows().length;
      });
    }).toBe(2);

    const firstStickyPage = await getStickyPageByNoteId(electronApp, "first-note");
    const secondStickyPage = await getStickyPageByNoteId(electronApp, "second-note");
    await expect(firstStickyPage.getByTestId("sticky-title-drag-label"))
      .toHaveCount(0);
    await expect(secondStickyPage.getByTestId("sticky-title-drag-label"))
      .toHaveCount(0);

    await activateStickyEditorToolbar(firstStickyPage);
    await firstStickyPage.getByRole("button", { name: "Pin window" }).click();
    await expect(firstStickyPage.getByRole("button", { name: "Unpin window" }))
      .toHaveAttribute("aria-pressed", "true");
    await activateStickyEditorToolbar(secondStickyPage);
    await expect(secondStickyPage.getByRole("button", { name: "Pin window" }))
      .toHaveAttribute("aria-pressed", "false");
    await expect.poll(async () => {
      return await electronApp.evaluate(({ BrowserWindow }) => {
        return BrowserWindow.getAllWindows().map((window) => ({
          noteId: new URL(window.webContents.getURL()).searchParams.get("noteId"),
          alwaysOnTop: window.isAlwaysOnTop(),
        }));
      });
    }).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          noteId: "first-note",
          alwaysOnTop: true,
        }),
        expect.objectContaining({
          noteId: "second-note",
          alwaysOnTop: false,
        }),
      ]),
    );
    await expect.poll(() => {
      const state = JSON.parse(
        fs.readFileSync(path.join(userDataDirectory, "notes.json"), "utf8"),
      );
      return state.notes.map((note) => ({
        id: note.id,
        alwaysOnTop: note.alwaysOnTop,
      }));
    }).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "first-note",
          alwaysOnTop: true,
        }),
        expect.objectContaining({
          id: "second-note",
          alwaysOnTop: false,
        }),
      ]),
    );

    await activateStickyEditorToolbar(firstStickyPage);
    await firstStickyPage.getByRole("button", { name: "Sticky color" }).click();
    await firstStickyPage.getByRole("button", { name: "Pastel color 5" }).click();
    await expect(firstStickyPage.getByLabel("HEX sticky color value"))
      .toHaveValue("eadcff");
    await firstStickyPage.waitForTimeout(450);

    await expect.poll(() => getShellBackground(firstStickyPage))
      .toBe("rgb(234, 220, 255)");
    await expect.poll(() => getShellBackground(secondStickyPage))
      .not.toBe("rgb(234, 220, 255)");
  } finally {
    await electronApp.close();
  }
});

test("Electron moves a sticky window when dragging its header", async () => {
  const userDataDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "notepane-electron-"),
  );
  const electronApp = await launchApp(userDataDirectory);

  try {
    const page = await electronApp.firstWindow();
    await expect(page.getByTestId("sticky-editor-surface")).toBeVisible();

    await clickMenuItem(electronApp, "Toggle Tabs / Sticky Mode");
    await expect(page.getByTestId("sticky-shell")).toHaveAttribute(
      "data-layout-mode",
      "sticky",
    );

    const header = page.getByTestId("sticky-header");
    await expect(header).toBeVisible();

    const beforeBounds = await getFirstWindowBounds(electronApp);
    const headerBox = await header.boundingBox();
    await page.mouse.move(headerBox.x + headerBox.width - 84, headerBox.y + headerBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      headerBox.x + headerBox.width - 12,
      headerBox.y + headerBox.height / 2 + 36,
      { steps: 6 },
    );
    await page.mouse.up();

    await expect.poll(async () => {
      const nextBounds = await getFirstWindowBounds(electronApp);
      return (
        nextBounds.x - beforeBounds.x >= 40 &&
        nextBounds.y - beforeBounds.y >= 20
      );
    }).toBe(true);
  } finally {
    await electronApp.close();
  }
});

async function launchApp(userDataDirectory, exportDirectory) {
  return electron.launch({
    args: ["."],
    cwd: process.cwd(),
    env: {
      ...process.env,
      BLOCKNOTE_STICKY_USER_DATA_DIR: userDataDirectory,
      ...(exportDirectory
        ? { BLOCKNOTE_STICKY_EXPORT_DIR: exportDirectory }
        : {}),
      ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
    },
  });
}

function writeInitialNotes(userDataDirectory, notes) {
  fs.mkdirSync(userDataDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(userDataDirectory, "notes.json"),
    JSON.stringify(
      {
        version: 3,
        appTheme: { mode: "light" },
        layoutMode: "tabs",
        notes: notes.map((note, index) => ({
          id: note.id,
          title: note.title,
          blocksJSON: null,
          markdown: "",
          bounds: {
            x: 80 + index * 24,
            y: 80 + index * 24,
            width: 960,
            height: 720,
          },
          theme: note.theme,
          alwaysOnTop: false,
          detached: false,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        })),
      },
      null,
      2,
    ),
    "utf8",
  );
}

function readPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  const pngSignature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== pngSignature) {
    throw new Error(`Not a PNG file: ${filePath}`);
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

async function getStickyPageByNoteId(electronApp, noteId) {
  await expect.poll(async () => {
    const pages = getOpenPages(electronApp);
    const noteIds = await Promise.all(
      pages.map((page) => getPageNoteId(page)),
    );
    return noteIds.includes(noteId);
  }).toBe(true);

  for (const page of getOpenPages(electronApp)) {
    if (await getPageNoteId(page) === noteId) {
      return page;
    }
  }

  throw new Error(`Sticky page not found: ${noteId}`);
}

function getOpenPages(electronApp) {
  return electronApp.windows().filter((page) => !page.isClosed());
}

async function activateStickyEditorToolbar(page) {
  await page.bringToFront();
  await page.getByTestId("sticky-editor-surface").click({
    position: {
      x: 120,
      y: 72,
    },
  });
  const toolbar = page.getByRole("group", { name: "Editor typography" });
  if (await toolbar.count() === 0) {
    await page.getByRole("button", { name: "Show editor tools" }).click();
  }
  await expect(toolbar).toBeVisible();
}

async function getPageNoteId(page) {
  if (!page || page.isClosed()) {
    return null;
  }

  try {
    return new URL(page.url()).searchParams.get("noteId");
  } catch {
    return null;
  }
}

async function getShellBackground(page) {
  return await page.evaluate(() => {
    const shell = document.querySelector("[data-testid='sticky-shell']");
    return shell ? getComputedStyle(shell).backgroundColor : null;
  });
}

async function clickMenuItem(electronApp, label) {
  await electronApp.evaluate(({ Menu }, targetLabel) => {
    const menu = Menu.getApplicationMenu();
    const item = findMenuItem(menu, targetLabel);
    if (!item) {
      throw new Error(`Menu item not found: ${targetLabel}`);
    }
    item.click();

    function findMenuItem(menuOrSubmenu, labelToFind) {
      for (const item of menuOrSubmenu.items) {
        if (item.label === labelToFind) {
          return item;
        }
        if (item.submenu) {
          const nested = findMenuItem(item.submenu, labelToFind);
          if (nested) {
            return nested;
          }
        }
      }
      return null;
    }
  }, label);
}

function modifierShortcut(key) {
  return `${process.platform === "darwin" ? "Meta" : "Control"}+${key}`;
}
