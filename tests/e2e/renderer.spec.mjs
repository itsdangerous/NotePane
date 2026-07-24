import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome to BlockNote!" }))
    .toBeVisible();
});

test("renders the demo block set", async ({ page }) => {
  await expect(page.getByTestId("sticky-shell")).toBeVisible();
  await expect(page.getByTestId("sticky-header")).toBeVisible();
  await expect(page.locator("[aria-label='NotePane wordmark']")).toBeVisible();
  await expect(page.getByTestId("session-sidebar").locator("[aria-label='NotePane wordmark']"))
    .toBeVisible();
  await expect(page.locator(".sticky-header [aria-label='NotePane wordmark']"))
    .toHaveCount(0);
  await expect(page.getByTestId("sticky-editor-surface")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Heading", exact: true }))
    .toBeVisible();
  await expect(page.getByRole("heading", { name: "Toggle Heading", exact: true }))
    .toBeVisible();
  await expect(page.getByText("Check List Item")).toBeVisible();
  await expect(page.getByText("console.log('Hello, world!');")).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByText("Add file")).toBeVisible();
  await expect(page.getByRole("link", { name: "Link" })).toBeVisible();
});

test("keeps sticky chrome outside the editable BlockNote surface", async ({ page }) => {
  await expect(page.getByTestId("session-sidebar")).toBeVisible();
  await expect(page.getByRole("tablist", { name: "Note sessions" })).toBeVisible();
  await expect(page.getByLabel("Session name")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Theme" })).toHaveCount(0);
  await expect(page.getByRole("switch", { name: "Theme mode" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Preferences" })).toHaveCount(0);
  await expect(page.getByRole("slider", { name: "Theme color" })).toHaveCount(0);
  await expect(page.getByLabel("Background transparency")).toHaveCount(0);
  await expect(page.getByRole("slider", { name: "Color opacity" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Export note" })).toBeVisible();
  await expect(page.locator("[aria-label='NotePane wordmark']")).toBeVisible();
  await expect(page.getByTestId("session-sidebar").locator("[aria-label='NotePane wordmark']"))
    .toBeVisible();
  await expect(page.getByTestId("session-sidebar").getByRole("button", { name: "Hide sidebar" }))
    .toBeVisible();
  await expect(
    page.locator(
      ".sticky-header input[aria-label='Session name'], .sticky-header input[aria-label='Note title']",
    ),
  ).toHaveCount(0);
  await expect(page.locator(".session-settings")).toHaveCount(0);
  await expect(page.locator(".color-panel")).toHaveCount(0);
  await expect(page.getByText("BlockNote Sticky")).toHaveCount(0);
  await expect(page.locator(".sticky-grip")).toHaveCount(0);

  const dragRegions = await page.evaluate(() => {
    const header = document.querySelector("[data-testid='sticky-header']");
    const editorSurface = document.querySelector("[data-testid='sticky-editor-surface']");
    const sidebar = document.querySelector("[data-testid='session-sidebar']");
    const sidebarTopbar = document.querySelector(".session-sidebar-topbar");
    const stickyBody = document.querySelector(".sticky-body");
    const toggle = document.querySelector(".sidebar-toggle");
    const actions = document.querySelector(".sticky-header-actions");
    return {
      header: getComputedStyle(header).getPropertyValue("-webkit-app-region"),
      editorSurface: getComputedStyle(editorSurface).getPropertyValue("-webkit-app-region"),
      sidebar: getComputedStyle(sidebar).getPropertyValue("-webkit-app-region"),
      sidebarTopbar: getComputedStyle(sidebarTopbar).getPropertyValue("-webkit-app-region"),
      sidebarAnimationName: getComputedStyle(sidebar).animationName,
      stickyBodyAnimationName: getComputedStyle(stickyBody).animationName,
      toggle: getComputedStyle(toggle).getPropertyValue("-webkit-app-region"),
      actions: getComputedStyle(actions).getPropertyValue("-webkit-app-region"),
    };
  });

  expect(dragRegions.header).toBe("drag");
  expect(dragRegions.editorSurface).toBe("no-drag");
  expect(dragRegions.sidebar).toBe("no-drag");
  expect(dragRegions.sidebarTopbar).toBe("no-drag");
  expect(dragRegions.sidebarAnimationName).toBe("none");
  expect(dragRegions.stickyBodyAnimationName).toBe("none");
  expect(dragRegions.toggle).toBe("no-drag");
  expect(dragRegions.actions).toBe("no-drag");
});

test("keeps light/dark mode global across sidebar sessions", async ({ page }) => {
  const modeSwitch = page.getByRole("switch", { name: "Theme mode" });
  const lightIconColors = await getActionIconColors(page);

  await expectThemeSwitchThumbCentered(page, "light");

  await modeSwitch.click();
  await expect(page.getByTestId("sticky-shell")).toHaveAttribute("data-theme-mode", "dark");
  await expect(modeSwitch).toHaveAttribute("aria-checked", "true");
  await expectThemeSwitchThumbCentered(page, "dark");
  const darkIconColors = await getActionIconColors(page);
  expect(darkIconColors.layout).not.toBe(lightIconColors.layout);
  expect(darkIconColors.sidebar).not.toBe(lightIconColors.sidebar);
  expect(darkIconColors.share).not.toBe(lightIconColors.share);
  await expect.poll(async () => {
    return await page.evaluate(() => ({
      bodyThemeMode: document.body.dataset.themeMode,
      bodyHasDarkClass: document.body.classList.contains("theme-dark"),
      bodyPanelBackground: getComputedStyle(document.body)
        .getPropertyValue("--sticky-panel-bg")
        .trim(),
      blockNoteColorSchemes: [...document.querySelectorAll(".bn-root")]
        .map((element) => element.getAttribute("data-color-scheme")),
    }));
  }).toMatchObject({
    bodyThemeMode: "dark",
    bodyHasDarkClass: true,
    bodyPanelBackground: "#242424",
    blockNoteColorSchemes: expect.arrayContaining(["dark"]),
  });

  await page.getByRole("button", { name: "New session" }).click();
  await expect(page.getByRole("tab")).toHaveCount(2);
  await expect(page.getByRole("tab").nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("sticky-shell")).toHaveAttribute("data-theme-mode", "dark");
  await expect(modeSwitch).toHaveAttribute("aria-checked", "true");

  await page.getByRole("tab").first().click();
  await expect(page.getByRole("tab").first()).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("sticky-shell")).toHaveAttribute("data-theme-mode", "dark");
  await expect(modeSwitch).toHaveAttribute("aria-checked", "true");

  await modeSwitch.click();
  await expect(page.getByTestId("sticky-shell")).toHaveAttribute("data-theme-mode", "light");
  await expect(modeSwitch).toHaveAttribute("aria-checked", "false");
  await expectThemeSwitchThumbCentered(page, "light");
  await expect.poll(async () => {
    return await page.evaluate(() => ({
      bodyThemeMode: document.body.dataset.themeMode,
      bodyHasLightClass: document.body.classList.contains("theme-light"),
      bodyPanelBackground: getComputedStyle(document.body)
        .getPropertyValue("--sticky-panel-bg")
        .trim(),
      blockNoteColorSchemes: [...document.querySelectorAll(".bn-root")]
        .map((element) => element.getAttribute("data-color-scheme")),
    }));
  }).toMatchObject({
    bodyThemeMode: "light",
    bodyHasLightClass: true,
    bodyPanelBackground: "#ffffff",
    blockNoteColorSchemes: expect.arrayContaining(["light"]),
  });
});

test("supports light/dark mode and sidebar tab text customization", async ({ page }) => {
  await page.evaluate(() => {
    window.EyeDropper = class {
      async open() {
        return { sRGBHex: "#00ff31" };
      }
    };
  });

  const modeSwitch = page.getByRole("switch", { name: "Theme mode" });
  await expect(modeSwitch).toHaveAttribute("aria-checked", "false");

  await modeSwitch.click();
  await expect(page.getByTestId("sticky-shell")).toHaveAttribute("data-theme-mode", "dark");
  await expect(modeSwitch).toHaveAttribute("aria-checked", "true");
  await expect.poll(async () => {
    return await page.evaluate(() => {
      const shell = document.querySelector("[data-testid='sticky-shell']");
      const editor = document.querySelector(".bn-editor");
      return {
        shellBackground: getComputedStyle(shell).backgroundColor,
        editorText: getComputedStyle(editor).color,
      };
    });
  }).toMatchObject({
    shellBackground: "rgb(25, 25, 25)",
    editorText: "rgb(241, 241, 239)",
  });

  await modeSwitch.click();
  await expect(page.getByTestId("sticky-shell")).toHaveAttribute("data-theme-mode", "light");
  await expect(modeSwitch).toHaveAttribute("aria-checked", "false");

  await page.keyboard.press(modifierShortcut(","));
  const preferencesPanel = page.getByRole("dialog", { name: "Preferences panel" });
  await expect(preferencesPanel).toBeVisible();
  await expect(preferencesPanel.getByRole("switch", { name: "Theme mode" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Color wheel mode" })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Tab color target" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Tab background" })).toHaveCount(0);
  await expect(page.getByRole("slider", { name: "Tab background color" })).toHaveCount(0);
  await expect(page.getByRole("slider", { name: "Tab text color" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Eyedropper" })).toBeEnabled();
  await expect(page.getByRole("slider", { name: "Color brightness" })).toBeVisible();
  const opacitySlider = page.getByRole("slider", { name: "Color opacity" });
  await expect(opacitySlider).toBeVisible();
  await expect(opacitySlider).toHaveValue("1");

  const editorSurfaceBox = await page.getByTestId("sticky-editor-surface").boundingBox();
  await page.mouse.move(editorSurfaceBox.x + 24, editorSurfaceBox.y + 24);
  await expect.poll(() => getTabCssValue(page, 0, "backgroundColor"))
    .toBe("rgb(241, 241, 239)");
  const initialActiveBackground = await getTabCssValue(page, 0, "backgroundColor");
  await page.getByRole("button", { name: "Eyedropper" }).click();
  await expect(page.getByLabel("HEX tab text color value")).toHaveValue(/^00ff31$/);
  await expectActiveTabColor(page, "color", "rgb(0, 255, 49)");
  await opacitySlider.evaluate((input) => {
    input.value = "0.42";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(opacitySlider).toHaveValue("0.42");
  await expectActiveTabColor(page, "color", "rgba(0, 255, 49, 0.42)");
  await opacitySlider.evaluate((input) => {
    input.value = "1";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expectActiveTabColor(page, "color", "rgb(0, 255, 49)");
  await page.mouse.move(editorSurfaceBox.x + 24, editorSurfaceBox.y + 24);
  expect(await getTabCssValue(page, 0, "backgroundColor")).toBe(initialActiveBackground);

  const wheel = page.getByRole("slider", { name: "Tab text color" });
  const box = await wheel.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + 2);
  await expect(page.getByLabel("HEX tab text color value")).toHaveValue(/^ff[0-9a-f]{4}$/);

  await page.getByLabel("Color brightness").evaluate((input) => {
    input.value = "0.86";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.mouse.click(box.x + box.width - 2, box.y + box.height / 2);
  await expect(page.getByLabel("Color brightness")).toHaveValue("0.86");

  await expect(page.getByLabel("HEX tab text color value")).toHaveValue(/[0-9a-f]{6}/);
  await expect(page.getByLabel("HSL tab text color value")).toHaveValue(/hsl\(/);
  await expect(page.getByLabel("RGB tab text color value")).toHaveValue(/rgb\(/);
  await expect(page.getByLabel("LCH tab text color value")).toHaveValue(/lch\(/);
  await expect(page.getByRole("button", { name: "Copy HEX" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy HSL" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy RGB" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy LCH" })).toBeVisible();

  await page.getByLabel("HEX tab text color value").fill("00ff31");
  await expectActiveTabColor(page, "color", "rgb(0, 255, 49)");
  expect(await getTabCssValue(page, 0, "backgroundColor")).toBe(initialActiveBackground);

  await page.getByRole("button", { name: "New session" }).click();
  await expect(page.getByRole("tab")).toHaveCount(2);
  await expect(page.getByRole("tab").nth(1)).toHaveAttribute("aria-selected", "true");

  const inactiveBackground = await getTabCssValue(page, 0, "backgroundColor");
  const activeBackground = await getTabCssValue(page, 1, "backgroundColor");
  expect(inactiveBackground).not.toBe(activeBackground);
  expect(inactiveBackground).not.toBe("rgb(0, 255, 49)");

  await page.getByRole("tab").first().click();
  await page.keyboard.press("Escape");
  await expect(preferencesPanel).toHaveCount(0);
  await page.keyboard.press(modifierShortcut(","));

  await expect(page.getByRole("slider", { name: "Tab text color" })).toBeVisible();

  await page.getByLabel("HSL tab text color value").fill("hsl(0deg 100% 50%)");
  await expectActiveTabColor(page, "color", "rgb(255, 0, 0)");

  await page.getByLabel("RGB tab text color value").fill("rgb(0 0 255)");
  await expectActiveTabColor(page, "color", "rgb(0, 0, 255)");

  await page.getByLabel("LCH tab text color value").fill("lch(100% 0 0deg)");
  await expectActiveTabColor(page, "color", "rgb(255, 255, 255)");

  const styles = await page.evaluate(() => ({
    bodyBackground: getComputedStyle(document.body).backgroundColor,
    removedGlobalBackgroundVar: getComputedStyle(
      document.querySelector("[data-testid='sticky-shell']"),
    ).getPropertyValue("--sticky-bg-rgb"),
  }));

  expect(styles.bodyBackground).toBe("rgba(0, 0, 0, 0)");
  expect(styles.removedGlobalBackgroundVar).toBe("");
});

test("uses sticky pastel color and carries it back to the session tab", async ({ page }) => {
  const tabModeHeaderHeight = await getHeaderHeight(page);
  const tabsModeButtonMetrics = await page.evaluate(() => {
    const button = document.querySelector(".layout-mode-button");
    const icon = button.querySelector(".notepane-action-icon");
    const label = button.querySelector(".layout-mode-label");
    const buttonRect = button.getBoundingClientRect();
    const iconRect = icon.getBoundingClientRect();

    return {
      buttonWidth: Math.round(buttonRect.width),
      iconWidth: Math.round(iconRect.width),
      iconTone: icon.getAttribute("data-icon-tone"),
      label: label.textContent.trim(),
    };
  });

  expect(tabsModeButtonMetrics.buttonWidth).toBeGreaterThanOrEqual(78);
  expect(tabsModeButtonMetrics.iconWidth).toBeGreaterThanOrEqual(24);
  expect(tabsModeButtonMetrics.iconTone).toBe("sticky");
  expect(tabsModeButtonMetrics.label).toBe("Sticky");

  await page.getByRole("button", { name: "Layout mode" }).click();
  await expect(page.getByTestId("sticky-shell")).toHaveAttribute(
    "data-layout-mode",
    "sticky",
  );
  const stickyModeButtonMetrics = await page.evaluate(() => {
    const button = document.querySelector(".layout-mode-button");
    const icon = button.querySelector(".notepane-action-icon");
    const label = button.querySelector(".layout-mode-label");
    const buttonRect = button.getBoundingClientRect();
    const iconRect = icon.getBoundingClientRect();

    return {
      buttonWidth: Math.round(buttonRect.width),
      iconWidth: Math.round(iconRect.width),
      iconTone: icon.getAttribute("data-icon-tone"),
      label: label.textContent.trim(),
    };
  });

  expect(stickyModeButtonMetrics.buttonWidth).toBeGreaterThanOrEqual(78);
  expect(stickyModeButtonMetrics.iconWidth).toBeGreaterThanOrEqual(24);
  expect(stickyModeButtonMetrics.iconTone).toBe("tabs");
  expect(stickyModeButtonMetrics.label).toBe("Tabs");

  await expect(page.getByRole("button", { name: "Sticky color" })).toBeVisible();
  await expect(page.locator(".sticky-color-button .notepane-icon-palette"))
    .toHaveAttribute("data-icon-tone", "palette");
  await expect(page.getByRole("button", { name: "Pin window" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pin window" }))
    .toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".sticky-pin-button .notepane-icon-pin"))
    .toHaveAttribute("data-pin-state", "unpinned");
  await expect(page.getByRole("switch", { name: "Theme mode" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Hide sidebar" })).toHaveCount(0);
  await expect(page.locator("[aria-label='NotePane wordmark']")).toHaveCount(0);
  await expect.poll(() => getHeaderHeight(page)).toBeLessThan(tabModeHeaderHeight);

  await page.getByRole("button", { name: "Pin window" }).click();
  await expect(page.getByRole("button", { name: "Unpin window" }))
    .toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".sticky-pin-button .notepane-icon-pin"))
    .toHaveAttribute("data-pin-state", "pinned");
  await expect.poll(() =>
    page.evaluate(() =>
      getComputedStyle(document.querySelector(".sticky-pin-button")).color,
    ),
  ).toBe("rgb(206, 45, 59)");
  await page.getByRole("button", { name: "Unpin window" }).click();
  await expect(page.getByRole("button", { name: "Pin window" }))
    .toHaveAttribute("aria-pressed", "false");

  await page.getByRole("button", { name: "Sticky color" }).click();
  const preferencesPanel = page.getByRole("dialog", { name: "Preferences panel" });
  await expect(preferencesPanel).toBeVisible();
  await expect(page.getByRole("group", { name: "Pastel colors" })).toBeVisible();
  await expect(page.getByRole("slider", { name: "Sticky color" })).toBeVisible();
  await expect(page.getByRole("slider", { name: "Color opacity" })).toBeVisible();

  await page.getByRole("button", { name: "Pastel color 2" }).click();
  await expect(page.getByLabel("HEX sticky color value")).toHaveValue("ffd7e8");
  await expect.poll(async () => {
    return await page.evaluate(() => {
      const shell = document.querySelector("[data-testid='sticky-shell']");
      return getComputedStyle(shell).backgroundColor;
    });
  }).toBe("rgb(255, 215, 232)");

  await page.getByLabel("Color opacity").evaluate((input) => {
    input.value = "0.5";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect.poll(async () => {
    return await page.evaluate(() => {
      const shell = document.querySelector("[data-testid='sticky-shell']");
      return getComputedStyle(shell).backgroundColor;
    });
  }).toBe("rgba(255, 215, 232, 0.5)");

  await page.getByRole("button", { name: "Layout mode" }).click();
  await expect(page.getByTestId("sticky-shell")).toHaveAttribute(
    "data-layout-mode",
    "tabs",
  );
  await expect(page.getByRole("button", { name: "Pin window" })).toHaveCount(0);
  await expect(page.getByRole("switch", { name: "Theme mode" })).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(1);
  await expectActiveTabColor(page, "color", "rgba(255, 215, 232, 0.5)");
});

async function getHeaderHeight(page) {
  return await page.evaluate(() => {
    return document.querySelector("[data-testid='sticky-header']")
      ?.getBoundingClientRect().height;
  });
}

async function expectActiveTabColor(page, property, expectedValue) {
  await expect.poll(async () => {
    return await page.evaluate(() => {
      const activeTab = document.querySelector(".session-tab-row.active");
      return activeTab ? getComputedStyle(activeTab) : null;
    });
  }).not.toBeNull();

  await expect.poll(async () => {
    return await page.evaluate((styleProperty) => {
      const activeTab = document.querySelector(".session-tab-row.active");
      return getComputedStyle(activeTab)[styleProperty];
    }, property);
  }).toBe(expectedValue);
}

async function getTabCssValue(page, tabIndex, property) {
  return await page.evaluate(
    ({ targetTabIndex, styleProperty }) => {
      const tab = document.querySelectorAll(".session-tab-row")[targetTabIndex];
      return getComputedStyle(tab)[styleProperty];
    },
    { targetTabIndex: tabIndex, styleProperty: property },
  );
}

async function expectNewSessionButtonBelowLastTab(page) {
  await expect(page.locator(".session-tab-row.is-entering")).toHaveCount(0);

  const layout = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".session-tab-row")];
    const lastRow = rows.at(-1);
    const addButton = document.querySelector(".session-add-button");
    const sidebar = document.querySelector("[data-testid='session-sidebar']");

    if (!lastRow || !addButton || !sidebar) {
      return null;
    }

    const lastRowRect = lastRow.getBoundingClientRect();
    const addButtonRect = addButton.getBoundingClientRect();
    const sidebarRect = sidebar.getBoundingClientRect();

    return {
      gapFromLastTab: Math.round(addButtonRect.top - lastRowRect.bottom),
      distanceFromSidebarBottom: Math.round(sidebarRect.bottom - addButtonRect.bottom),
    };
  });

  expect(layout).not.toBeNull();
  expect(layout.gapFromLastTab).toBeGreaterThanOrEqual(0);
  expect(layout.gapFromLastTab).toBeLessThanOrEqual(8);
  expect(layout.distanceFromSidebarBottom).toBeGreaterThan(160);
}

test("opens export format choices from a single export icon", async ({ page }) => {
  const tooltipPlacement = await page.evaluate(() => {
    const exportButton = document.querySelector(".export-icon-button");
    const tooltip = getComputedStyle(exportButton, "::after");
    return {
      right: tooltip.right,
    };
  });

  expect(tooltipPlacement.right).toBe("0px");

  await page.getByRole("button", { name: "Export note" }).click();

  const exportMenu = page.getByRole("menu", { name: "Export format" });
  await expect(exportMenu).toBeVisible();
  await expect(exportMenu.getByRole("menuitem", { name: "Export as PNG" }))
    .toBeVisible();
  await expect(exportMenu.getByRole("menuitem", { name: "Export as PDF" }))
    .toBeVisible();
});

test("uses transparent chrome-free styles while exporting", async ({ page }) => {
  const exportStyles = await page.evaluate(() => {
    const surfaceElement = document.querySelector("[data-testid='sticky-editor-surface']");
    surfaceElement.querySelector(".bn-editor").style.paddingBottom = "780px";
    const originalSurfaceRectHeight = surfaceElement.getBoundingClientRect().height;
    document.body.classList.add("is-exporting");
    const shell = getComputedStyle(document.querySelector("[data-testid='sticky-shell']"));
    const header = getComputedStyle(document.querySelector("[data-testid='sticky-header']"));
    const sidebar = getComputedStyle(document.querySelector("[data-testid='session-sidebar']"));
    const surface = getComputedStyle(
      document.querySelector("[data-testid='sticky-editor-surface']"),
    );
    const editor = getComputedStyle(document.querySelector(".bn-editor"));
    const surfaceRect = surfaceElement.getBoundingClientRect();
    const values = {
      headerDisplay: header.display,
      sidebarDisplay: sidebar.display,
      shellBackgroundImage: shell.backgroundImage,
      shellTextColor: shell.color,
      surfaceBackgroundImage: surface.backgroundImage,
      surfaceBackgroundColor: surface.backgroundColor,
      surfaceRectHeight: surfaceRect.height,
      surfaceScrollHeight: surfaceElement.scrollHeight,
      originalSurfaceRectHeight,
      editorTextColor: editor.color,
      codeBackground: getComputedStyle(document.querySelector("[data-content-type='codeBlock']")).backgroundColor,
    };
    document.body.classList.remove("is-exporting");
    surfaceElement.querySelector(".bn-editor").style.paddingBottom = "";
    return values;
  });

  expect(exportStyles.headerDisplay).toBe("none");
  expect(exportStyles.sidebarDisplay).toBe("none");
  expect(exportStyles.shellBackgroundImage).toBe("none");
  expect(exportStyles.shellTextColor).toBe("rgb(55, 53, 47)");
  expect(exportStyles.surfaceBackgroundImage).toBe("none");
  expect(exportStyles.surfaceBackgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(exportStyles.editorTextColor).toBe("rgb(55, 53, 47)");
  expect(exportStyles.codeBackground).toBe("rgb(247, 247, 245)");
  expect(exportStyles.surfaceRectHeight).toBeGreaterThan(
    exportStyles.originalSurfaceRectHeight,
  );
  expect(exportStyles.surfaceRectHeight).toBeGreaterThanOrEqual(
    exportStyles.surfaceScrollHeight - 1,
  );
});

test("creates and switches note sessions from the sidebar", async ({ page }) => {
  await expect(page.getByRole("tab")).toHaveCount(1);
  await expect(page.getByText("⌘1")).toBeVisible();
  await page.keyboard.press(modifierShortcut("T"));
  await expect(page.getByRole("tab")).toHaveCount(2);
  await expect(page.getByRole("tab").nth(1)).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "New session" }).click();

  await expect(page.getByRole("tab")).toHaveCount(3);
  await expect(page.getByRole("tab").nth(2)).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("⌘2")).toBeVisible();
  await expect(page.getByText("⌘3")).toBeVisible();
  await expectNewSessionButtonBelowLastTab(page);

  await page.keyboard.press(modifierShortcut("1"));
  await expect(page.getByRole("tab").nth(0)).toHaveAttribute("aria-selected", "true");

  await page.keyboard.press(modifierShortcut("2"));
  await expect(page.getByRole("tab").nth(1)).toHaveAttribute("aria-selected", "true");

  await page.keyboard.press(modifierOptionShortcut("ArrowRight"));
  await expect(page.getByRole("tab").nth(2)).toHaveAttribute("aria-selected", "true");

  await page.keyboard.press(modifierOptionShortcut("ArrowRight"));
  await expect(page.getByRole("tab").nth(0)).toHaveAttribute("aria-selected", "true");

  await page.keyboard.press(modifierOptionShortcut("ArrowLeft"));
  await expect(page.getByRole("tab").nth(2)).toHaveAttribute("aria-selected", "true");

  await page.keyboard.press(modifierShortcut("W"));
  await expect(page.getByRole("tab")).toHaveCount(2);
  await expect(page.getByRole("tab").nth(1)).toHaveAttribute("aria-selected", "true");
});

test("scrolls the sidebar when many session tabs exist", async ({ page }) => {
  const newSessionButton = page.getByRole("button", { name: "New session" });

  for (let index = 0; index < 24; index += 1) {
    await newSessionButton.click();
  }

  await expect(page.getByRole("tab")).toHaveCount(25);

  const scrollMetrics = await page.evaluate(() => {
    const sidebar = document.querySelector("[data-testid='session-sidebar']");
    const sidebarContent = document.querySelector("[data-testid='session-sidebar-scroll']");
    const addButton = document.querySelector(".session-add-button");
    const lastTab = document.querySelector(".session-tab-row:last-child");
    sidebarContent.scrollTop = sidebarContent.scrollHeight;

    return {
      sidebarTop: Math.round(sidebar.getBoundingClientRect().top),
      contentTop: Math.round(sidebarContent.getBoundingClientRect().top),
      clientHeight: sidebarContent.clientHeight,
      scrollHeight: sidebarContent.scrollHeight,
      scrollTop: sidebarContent.scrollTop,
      addButtonTop: Math.round(addButton.getBoundingClientRect().top),
      lastTabBottom: Math.round(lastTab.getBoundingClientRect().bottom),
    };
  });

  expect(scrollMetrics.contentTop).toBeGreaterThan(scrollMetrics.sidebarTop);
  expect(scrollMetrics.scrollHeight).toBeGreaterThan(scrollMetrics.clientHeight);
  expect(scrollMetrics.scrollTop).toBeGreaterThan(0);
  expect(scrollMetrics.addButtonTop - scrollMetrics.lastTabBottom)
    .toBeGreaterThanOrEqual(0);
  expect(scrollMetrics.addButtonTop - scrollMetrics.lastTabBottom)
    .toBeLessThanOrEqual(8);
});

test("resizes and collapses the sidebar from its right edge", async ({ page }) => {
  const sidebar = page.getByTestId("session-sidebar");
  const resizeHandle = page.getByRole("separator", { name: "Resize sidebar" });
  const initialBox = await sidebar.boundingBox();
  const handleBox = await resizeHandle.boundingBox();

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + 40);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + 64, handleBox.y + 40);
  await page.mouse.up();

  const resizedBox = await sidebar.boundingBox();
  expect(Math.round(resizedBox.width)).toBeGreaterThan(Math.round(initialBox.width) + 36);

  const resizedHandleBox = await resizeHandle.boundingBox();
  await page.mouse.move(resizedHandleBox.x + resizedHandleBox.width / 2, resizedHandleBox.y + 40);
  await page.mouse.down();
  await page.mouse.move(resizedHandleBox.x - 260, resizedHandleBox.y + 40);
  await page.mouse.up();

  await expect(sidebar).toBeVisible();
  await expect(sidebar).toHaveAttribute("data-sidebar-state", "compact");
  await expect(sidebar.locator("[aria-label='NotePane wordmark']")).toBeHidden();
  await expect(sidebar.locator(".brand-wordmark-text")).toBeHidden();
  await expect(sidebar.locator(".session-name").first()).toBeHidden();
  await expect(sidebar.locator(".session-shortcut").first()).toBeHidden();
  await expect(page.getByRole("button", { name: "Show sidebar" })).toBeVisible();

  await page.getByRole("button", { name: "Show sidebar" }).click();
  await expect(page.getByTestId("session-sidebar")).toBeVisible();
  await expect(page.getByTestId("session-sidebar")).toHaveAttribute("data-sidebar-state", "expanded");
  await expect(page.getByTestId("session-sidebar").getByRole("button", { name: "Hide sidebar" }))
    .toBeVisible();
});

test("keeps the new session control aligned with session rows", async ({ page }) => {
  await page.getByRole("button", { name: "New session" }).click();

  const metrics = await page.evaluate(() => {
    const firstRow = document.querySelector(".session-tab-row");
    const addButton = document.querySelector(".session-add-button");
    const rowRect = firstRow.getBoundingClientRect();
    const addRect = addButton.getBoundingClientRect();

    return {
      rowLeft: Math.round(rowRect.left),
      addLeft: Math.round(addRect.left),
      rowWidth: Math.round(rowRect.width),
      addWidth: Math.round(addRect.width),
      rowHeight: Math.round(rowRect.height),
      addHeight: Math.round(addRect.height),
    };
  });

  expect(metrics.addLeft).toBe(metrics.rowLeft);
  expect(metrics.addWidth).toBe(metrics.rowWidth);
  expect(metrics.addHeight).toBeGreaterThanOrEqual(metrics.rowHeight);
});

test("creates blank sessions after the initial template note", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Welcome to BlockNote!" }))
    .toBeVisible();

  await page.getByRole("button", { name: "New session" }).click();

  await expect(page.getByRole("tab")).toHaveCount(2);
  await expect(page.getByRole("tab").nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Welcome to BlockNote!" }))
    .toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Heading", exact: true }))
    .toHaveCount(0);
  await expect(page.getByText("console.log('Hello, world!');"))
    .toHaveCount(0);

  await clickLastEmptyParagraph(page);
  await page.keyboard.type("new blank session");
  await expect(page.getByText("new blank session")).toBeVisible();
});

test("renames a session by double-clicking its tab", async ({ page }) => {
  await page.getByRole("tab").first().dblclick();
  await page.getByLabel("Session name").fill("Renamed session");
  await page.keyboard.press("Enter");

  await expect(page.getByRole("tab", { name: /Renamed session/ })).toBeVisible();
  await expect(page.getByLabel("Session name")).toHaveCount(0);
});

test("deletes sidebar sessions while preserving the last remaining tab", async ({ page }) => {
  await page.getByRole("button", { name: "New session" }).click();

  await expect(page.getByRole("tab")).toHaveCount(2);
  const secondDeleteButton = page.locator(".session-delete-button").nth(1);
  await expect(secondDeleteButton).toHaveAttribute(
    "aria-label",
    "Delete session Untitled",
  );
  const editorSurfaceBox = await page.getByTestId("sticky-editor-surface").boundingBox();
  await page.mouse.move(editorSurfaceBox.x + 24, editorSurfaceBox.y + 24);
  await expect(secondDeleteButton).toBeHidden();
  await page.getByRole("tab").nth(1).hover();
  await expect(secondDeleteButton).toBeVisible();
  const deleteButtonRightGap = await page.evaluate(() => {
    const secondTab = document.querySelectorAll(".session-tab-row")[1];
    const deleteButton = secondTab.querySelector(".session-delete-button");
    const tabRect = secondTab.getBoundingClientRect();
    const deleteButtonRect = deleteButton.getBoundingClientRect();
    return Math.round(tabRect.right - deleteButtonRect.right);
  });
  expect(deleteButtonRightGap).toBeGreaterThanOrEqual(0);
  expect(deleteButtonRightGap).toBeLessThanOrEqual(4);
  await secondDeleteButton.click();

  await expect(page.getByRole("tab")).toHaveCount(1);
  await expect(page.locator(".session-delete-button").first()).toBeHidden();
  await expect(page.locator(".session-delete-button").first()).toBeDisabled();
});

test("opens BlockNote slash menu with core demo commands", async ({ page }) => {
  await clickLastEmptyParagraph(page);
  await page.keyboard.type("/");

  const slashMenu = page.getByRole("listbox");
  await expect(slashMenu).toBeVisible();

  for (const label of [
    "Heading 1",
    "Toggle List",
    "Check List",
    "Code Block",
    "Table",
    "Image",
    "Video",
    "Audio",
    "File",
    "Toggle Heading 1",
  ]) {
    await expect(slashMenu.getByText(label, { exact: true })).toBeVisible();
  }
});

test("keeps Enter and Shift+Enter behavior in the editor", async ({ page }) => {
  await clickLastEmptyParagraph(page);
  await page.keyboard.type("first line");
  await page.keyboard.press("Shift+Enter");
  await page.keyboard.type("second line");
  await page.keyboard.press("Enter");
  await page.keyboard.type("next block");

  await expect(page.getByText("first line")).toBeVisible();
  await expect(page.getByText("second line")).toBeVisible();
  await expect(page.getByText("next block")).toBeVisible();

  const blockCount = await page
    .locator(".bn-block-outer")
    .filter({ hasText: "next block" })
    .count();
  expect(blockCount).toBeGreaterThan(0);
});

test("focuses the last block when clicking empty editor space below blocks", async ({ page }) => {
  await page.addStyleTag({
    content: `
      [data-testid='sticky-editor-surface'] .bn-editor {
        padding-bottom: 420px !important;
      }
    `,
  });

  const emptyTailPoint = await page.evaluate(() => {
    const surface = document.querySelector("[data-testid='sticky-editor-surface']");
    surface.scrollTop = surface.scrollHeight;
    const blocks = surface.querySelectorAll(".bn-block-outer");
    const lastBlock = blocks[blocks.length - 1];
    const surfaceRect = surface.getBoundingClientRect();
    const lastBlockRect = lastBlock.getBoundingClientRect();
    const point = {
      x: surfaceRect.left + surfaceRect.width / 2,
      y: surfaceRect.bottom - 48,
    };

    if (point.y <= lastBlockRect.bottom + 8) {
      throw new Error("The test could not create empty editor space below the last block.");
    }

    return point;
  });

  await page.mouse.click(emptyTailPoint.x, emptyTailPoint.y);
  await page.keyboard.type("bottom empty space focus");

  await expect(page.getByText("bottom empty space focus")).toBeVisible();
});

test("toggles checklist and toggle heading without shell interference", async ({ page }) => {
  const checkbox = page.getByRole("checkbox").first();
  await expect(checkbox).not.toBeChecked();
  await checkbox.click();
  await expect(checkbox).toBeChecked();

  const toggleHeadingButton = page
    .locator(".bn-block-outer")
    .filter({ hasText: "Toggle Heading" })
    .locator("button")
    .first();
  await toggleHeadingButton.click();
  await expect(page.getByText("This child block is hidden and shown by the toggle heading."))
    .toBeVisible();
});

test("shows floating formatting toolbar after text selection", async ({ page }) => {
  const styledText = page.getByText("Styled Text");
  await styledText.scrollIntoViewIfNeeded();
  await styledText.dblclick();

  await expect(page.getByRole("toolbar")).toBeVisible();
  await expect(page.getByRole("button", { name: /bold/i })).toBeVisible();
});

test("shows table interaction UI when a table cell is selected", async ({ page }) => {
  await page.getByRole("cell", { name: "Table Cell" }).first().click();

  await expect(page.locator(".bn-table-handle, .bn-table-cell-handle").first())
    .toBeVisible();
});

test("deletes the current block with Command+X when no text is selected", async ({ page }) => {
  await clickLastEmptyParagraph(page);
  await page.keyboard.type("delete this block");
  await page.keyboard.press(modifierShortcut("X"));

  await expect(page.getByText("delete this block")).toHaveCount(0);
  await expect(page.getByRole("paragraph").filter({ hasText: /^$/ }).last())
    .toBeVisible();
});

test("shows image download and crop tools after selecting an image", async ({ page }) => {
  await page.locator("img.bn-visual-media").first().click();

  const imageTools = page.getByRole("toolbar", { name: "Image tools" });
  await expect(imageTools).toBeVisible();
  await expect(imageTools.getByRole("button", { name: "Download image" })).toBeVisible();
  await imageTools.getByRole("button", { name: "Crop image" }).click();
  await expect(page.getByRole("dialog", { name: "Crop image" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Apply crop" })).toBeVisible();
});

async function clickLastEmptyParagraph(page) {
  const emptyParagraphs = page.getByRole("paragraph").filter({ hasText: /^$/ });
  await emptyParagraphs.last().scrollIntoViewIfNeeded();
  await emptyParagraphs.last().click();
}

async function expectThemeSwitchThumbCentered(page, mode) {
  const targetRatio = mode === "dark" ? 0.75 : 0.25;

  await expect.poll(async () => {
    return await page.evaluate((expectedRatio) => {
      const track = document.querySelector(".theme-mode-switch-track");
      const thumb = document.querySelector(".theme-mode-switch-thumb");

      if (!track || !thumb) {
        return false;
      }

      const trackRect = track.getBoundingClientRect();
      const thumbRect = thumb.getBoundingClientRect();
      const expectedCenterX = trackRect.left + trackRect.width * expectedRatio;
      const expectedCenterY = trackRect.top + trackRect.height / 2;
      const actualCenterX = thumbRect.left + thumbRect.width / 2;
      const actualCenterY = thumbRect.top + thumbRect.height / 2;
      const xDelta = Math.abs(actualCenterX - expectedCenterX);
      const yDelta = Math.abs(actualCenterY - expectedCenterY);

      return xDelta <= 0.5 && yDelta <= 0.5;
    }, targetRatio);
  }).toBe(true);
}

async function getActionIconColors(page) {
  return await page.evaluate(() => {
    const readColor = (selector) =>
      getComputedStyle(document.querySelector(selector)).color;

    return {
      layout: readColor(".layout-mode-button"),
      sidebar: readColor(".sidebar-toggle"),
      share: readColor(".export-icon-button"),
    };
  });
}

function modifierShortcut(key) {
  return `${process.platform === "darwin" ? "Meta" : "Control"}+${key}`;
}

function modifierOptionShortcut(key) {
  return `${process.platform === "darwin" ? "Meta" : "Control"}+Alt+${key}`;
}
