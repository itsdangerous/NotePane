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
  await expect(page.getByTestId("session-sidebar-footer")).toBeVisible();
  await expect(page.getByTestId("session-sidebar-footer").getByRole("button", { name: "Preferences" }))
    .toBeVisible();
  await expect(page.getByTestId("session-sidebar-footer").getByRole("button", { name: "Layout mode" }))
    .toBeVisible();
  await expect(page.getByRole("slider", { name: "Theme color" })).toHaveCount(0);
  await expect(page.getByLabel("Background transparency")).toHaveCount(0);
  await expect(page.getByRole("slider", { name: "Color opacity" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Export note" })).toHaveCount(0);
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

  await clickLastEmptyParagraph(page);
  await expect(page.getByRole("button", { name: "Export note" })).toHaveCount(0);

  const dragRegions = await page.evaluate(() => {
    const header = document.querySelector("[data-testid='sticky-header']");
    const editorSurface = document.querySelector("[data-testid='sticky-editor-surface']");
    const sidebar = document.querySelector("[data-testid='session-sidebar']");
    const sidebarTopbar = document.querySelector(".session-sidebar-topbar");
    const sidebarFooter = document.querySelector(".session-sidebar-footer");
    const stickyBody = document.querySelector(".sticky-body");
    const toggle = document.querySelector(".sidebar-toggle");
    const actions = document.querySelector(".sticky-header-actions");
    const topbarRect = sidebarTopbar.getBoundingClientRect();
    const toggleRect = toggle.getBoundingClientRect();
    return {
      header: getComputedStyle(header).getPropertyValue("-webkit-app-region"),
      editorSurface: getComputedStyle(editorSurface).getPropertyValue("-webkit-app-region"),
      sidebar: getComputedStyle(sidebar).getPropertyValue("-webkit-app-region"),
      sidebarTopbar: getComputedStyle(sidebarTopbar).getPropertyValue("-webkit-app-region"),
      sidebarFooter: getComputedStyle(sidebarFooter).getPropertyValue("-webkit-app-region"),
      sidebarAnimationName: getComputedStyle(sidebar).animationName,
      stickyBodyAnimationName: getComputedStyle(stickyBody).animationName,
      toggle: getComputedStyle(toggle).getPropertyValue("-webkit-app-region"),
      toggleBackground: getComputedStyle(toggle).backgroundColor,
      toggleBorderStyle: getComputedStyle(toggle).borderStyle,
      toggleBoxShadow: getComputedStyle(toggle).boxShadow,
      toggleCenterDelta: Math.abs(
        (toggleRect.top + toggleRect.height / 2) -
          (topbarRect.top + topbarRect.height / 2),
      ),
      actions: getComputedStyle(actions).getPropertyValue("-webkit-app-region"),
      editorScrollbarColor: getComputedStyle(editorSurface)
        .getPropertyValue("scrollbar-color"),
      editorScrollbarWidth: getComputedStyle(editorSurface)
        .getPropertyValue("scrollbar-width"),
      editorScrollbarTrackVar: getComputedStyle(editorSurface)
        .getPropertyValue("--sticky-scrollbar-track"),
      editorScrollbarThumbVar: getComputedStyle(editorSurface)
        .getPropertyValue("--sticky-scrollbar-thumb"),
      editorScrollbarThumb: getComputedStyle(
        editorSurface,
        "::-webkit-scrollbar-thumb",
      ).backgroundColor,
      sidebarScrollbarThumb: getComputedStyle(
        sidebar.querySelector(".session-sidebar-content"),
        "::-webkit-scrollbar-thumb",
      ).backgroundColor,
    };
  });

  expect(dragRegions.header).toBe("drag");
  expect(dragRegions.editorSurface).toBe("no-drag");
  expect(dragRegions.sidebar).toBe("no-drag");
  expect(dragRegions.sidebarTopbar).toBe("no-drag");
  expect(dragRegions.sidebarFooter).toBe("no-drag");
  expect(dragRegions.sidebarAnimationName).toBe("none");
  expect(dragRegions.stickyBodyAnimationName).toBe("none");
  expect(dragRegions.toggle).toBe("no-drag");
  expect(dragRegions.toggleBackground).toBe("rgba(0, 0, 0, 0)");
  expect(dragRegions.toggleBorderStyle).toBe("none");
  expect(dragRegions.toggleBoxShadow).toBe("none");
  expect(dragRegions.toggleCenterDelta).toBeLessThanOrEqual(1);
  expect(dragRegions.actions).toBe("no-drag");
  expect(dragRegions.editorScrollbarColor).toBe("rgba(0, 0, 0, 0) rgba(0, 0, 0, 0)");
  expect(dragRegions.editorScrollbarWidth).toBe("none");
  expect(dragRegions.editorScrollbarTrackVar).toContain("color-mix");
  expect(dragRegions.editorScrollbarThumbVar).toContain("color-mix");
  expect(dragRegions.editorScrollbarThumb).toBe("rgba(0, 0, 0, 0)");
  expect(dragRegions.sidebarScrollbarThumb).not.toBe("rgb(255, 255, 255)");
});

test("keeps light/dark mode global across sidebar sessions", async ({ page }) => {
  await clickLastEmptyParagraph(page);
  const modeSwitch = page.getByRole("switch", { name: "Theme mode" });
  const lightIconColors = await getActionIconColors(page);
  await expectSystemSymbolIcons(page);

  await expectThemeSwitchThumbCentered(page, "light");

  await modeSwitch.click();
  await expect(page.getByTestId("sticky-shell")).toHaveAttribute("data-theme-mode", "dark");
  await expect(modeSwitch).toHaveAttribute("aria-checked", "true");
  await expectThemeSwitchThumbCentered(page, "dark");
  await clickLastEmptyParagraph(page);
  const darkIconColors = await getActionIconColors(page);
  expect(darkIconColors.layout).not.toBe(lightIconColors.layout);
  expect(darkIconColors.sidebar).not.toBe(lightIconColors.sidebar);
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

test("changes only the active editor typography", async ({ page }) => {
  const before = await getEditorScaleMetrics(page);

  await expect(page.getByRole("group", { name: "Editor typography" }))
    .toHaveCount(0);

  await page.keyboard.press(modifierShortcut("+"));
  await expect.poll(() => getEditorScaleMetrics(page)).toMatchObject({
    editorFontScale: "1",
    shellFontSize: before.shellFontSize,
    headerHeight: before.headerHeight,
    sidebarWidth: before.sidebarWidth,
  });

  await clickLastEmptyParagraph(page);
  await expect(page.getByRole("group", { name: "Editor typography" }))
    .toBeVisible();
  await expect(page.getByLabel("Editor font size")).toHaveValue("16");
  await expect(page.getByLabel("Editor font family")).toHaveValue("System");
  await expect(page.getByRole("button", { name: "Open font size menu" }))
    .toBeVisible();
  await page.getByRole("button", { name: "Open font family menu" }).click();
  await expect(page.getByRole("listbox", { name: "Font family options" }))
    .toBeVisible();
  await expectFloatingTypographyMenu(page, "Font family options");
  await expect(page.getByRole("option", { name: "Garamond" })).toBeVisible();
  await page.getByLabel("Editor font family").fill("gar");
  await expect(page.getByRole("option", { name: "Garamond" })).toBeVisible();
  await page.getByRole("option", { name: "Garamond" }).click();
  await expect.poll(() => getEditorScaleMetrics(page)).toMatchObject({
    editorFontFamily: expect.stringContaining("Garamond"),
  });
  await clickLastEmptyParagraph(page);

  await page.keyboard.press(modifierShortcut("+"));
  await expect.poll(() => getEditorScaleMetrics(page)).toMatchObject({
    shellFontSize: before.shellFontSize,
    headerHeight: before.headerHeight,
    sidebarWidth: before.sidebarWidth,
    editorFontScale: "1.08",
  });
  const enlarged = await getEditorScaleMetrics(page);
  expect(enlarged.editorFontSize).toBeGreaterThan(before.editorFontSize);
  await expect(page.getByLabel("Editor font size")).toHaveValue("17");

  await page.getByLabel("Editor font size").fill("20");
  await expect.poll(() => getEditorScaleMetrics(page)).toMatchObject({
    editorFontScale: "1.25",
    shellFontSize: before.shellFontSize,
    headerHeight: before.headerHeight,
    sidebarWidth: before.sidebarWidth,
  });
  await expect(page.getByLabel("Editor font size")).toHaveValue("20");

  await page.getByRole("button", { name: "Open font size menu" }).click();
  await expect(page.getByRole("listbox", { name: "Editor font size presets" }))
    .toBeVisible();
  await expectFloatingTypographyMenu(page, "Editor font size presets");
  await page.getByRole("option", { name: "48" }).click();
  await expect.poll(() => getEditorScaleMetrics(page)).toMatchObject({
    editorFontScale: "3",
    shellFontSize: before.shellFontSize,
    headerHeight: before.headerHeight,
    sidebarWidth: before.sidebarWidth,
  });
  await expect(page.getByLabel("Editor font size")).toHaveValue("48");

  await page.getByLabel("Editor font size").fill("18");
  await expect.poll(() => getEditorScaleMetrics(page)).toMatchObject({
    editorFontScale: "1.13",
    shellFontSize: before.shellFontSize,
    headerHeight: before.headerHeight,
    sidebarWidth: before.sidebarWidth,
  });

  await page.getByRole("button", { name: "New session" }).click();
  await expect(page.getByRole("tab")).toHaveCount(2);
  await expect(page.getByRole("tab").nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("group", { name: "Editor typography" }))
    .toHaveCount(0);
  await expect.poll(() => getEditorScaleMetrics(page)).toMatchObject({
    editorFontScale: "1",
    editorFontFamily: expect.stringContaining("SF Pro Text"),
    shellFontSize: before.shellFontSize,
    headerHeight: before.headerHeight,
    sidebarWidth: before.sidebarWidth,
  });

  await page.keyboard.press(modifierShortcut("-"));
  await expect.poll(() => getEditorScaleMetrics(page)).toMatchObject({
    editorFontScale: "1",
    shellFontSize: before.shellFontSize,
    headerHeight: before.headerHeight,
    sidebarWidth: before.sidebarWidth,
  });

  await clickLastEmptyParagraph(page);
  await page.keyboard.press(modifierShortcut("-"));
  await expect.poll(() => getEditorScaleMetrics(page)).toMatchObject({
    editorFontScale: "0.92",
    shellFontSize: before.shellFontSize,
    headerHeight: before.headerHeight,
    sidebarWidth: before.sidebarWidth,
  });

  await page.getByRole("tab").first().click();
  await expect(page.getByRole("tab").first()).toHaveAttribute("aria-selected", "true");
  await expect.poll(() => getEditorScaleMetrics(page)).toMatchObject({
    editorFontScale: "1.13",
    editorFontFamily: expect.stringContaining("Garamond"),
    shellFontSize: before.shellFontSize,
    headerHeight: before.headerHeight,
    sidebarWidth: before.sidebarWidth,
  });
});

test("uses preferences editor defaults for newly created sessions", async ({ page }) => {
  const before = await getEditorScaleMetrics(page);

  await page.keyboard.press(modifierShortcut(","));
  const preferencesPanel = page.getByRole("dialog", { name: "Preferences window" });
  await expect(preferencesPanel).toBeVisible();
  await expect(page.getByText("Default editor")).toBeVisible();
  await expect(page.getByText("Used for newly created sessions."))
    .toBeVisible();

  await page.getByLabel("Editor font family").fill("gar");
  await page.getByRole("option", { name: "Garamond" }).click();
  await page.getByLabel("Editor font size").fill("24");
  await page.getByRole("button", { name: "Close preferences" }).click();

  await page.getByRole("button", { name: "New session" }).click();
  await expect(page.getByRole("tab")).toHaveCount(2);
  await expect(page.getByRole("tab").nth(1)).toHaveAttribute("aria-selected", "true");
  await expect.poll(() => getEditorScaleMetrics(page)).toMatchObject({
    editorFontScale: "1.5",
    editorFontFamily: expect.stringContaining("Garamond"),
    shellFontSize: before.shellFontSize,
    headerHeight: before.headerHeight,
    sidebarWidth: before.sidebarWidth,
  });

  await page.getByRole("tab").first().click();
  await expect(page.getByRole("tab").first()).toHaveAttribute("aria-selected", "true");
  await expect.poll(() => getEditorScaleMetrics(page)).toMatchObject({
    editorFontScale: "1",
    editorFontFamily: expect.stringContaining("SF Pro Text"),
  });
});

test("keeps tab and command select-all outside the editor from moving chrome focus or selecting chrome", async ({ page }) => {
  const newSessionButton = page.getByRole("button", { name: "New session" });
  await newSessionButton.focus();
  await expect(newSessionButton).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(newSessionButton).toBeFocused();

  await page.keyboard.press(modifierShortcut("A"));
  const chromeSelection = await page.evaluate(() => window.getSelection()?.toString() ?? "");
  expect(chromeSelection).toBe("");

  await clickLastEmptyParagraph(page);
  await expect(page.getByRole("group", { name: "Editor typography" }))
    .toBeVisible();
  await page.keyboard.press(modifierShortcut("A"));
  const editorSelection = await page.evaluate(() => window.getSelection()?.toString() ?? "");
  expect(editorSelection.length).toBeGreaterThan(0);
});

test("supports light/dark mode and readable sidebar tab background customization", async ({ page }) => {
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
      const activeTab = document.querySelector(".session-tab-row.active");
      return {
        shellBackground: getComputedStyle(shell).backgroundColor,
        editorText: getComputedStyle(editor).color,
        activeTabBackground: getComputedStyle(activeTab).backgroundColor,
      };
    });
  }).toMatchObject({
    shellBackground: "rgb(25, 25, 25)",
    editorText: "rgb(241, 241, 239)",
    activeTabBackground: "rgb(224, 213, 162)",
  });

  await modeSwitch.click();
  await expect(page.getByTestId("sticky-shell")).toHaveAttribute("data-theme-mode", "light");
  await expect(modeSwitch).toHaveAttribute("aria-checked", "false");

  await page.keyboard.press(modifierShortcut(","));
  const preferencesPanel = page.getByRole("dialog", { name: "Preferences window" });
  await expect(preferencesPanel).toBeVisible();
  await expect(preferencesPanel.getByRole("switch", { name: "Theme mode" })).toBeVisible();
  await expect(preferencesPanel.getByText("Keyboard shortcuts")).toBeVisible();
  await expect(page.getByRole("button", { name: "Color wheel mode" })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Tab color target" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Tab background" })).toHaveCount(0);
  await expect(page.getByRole("slider", { name: "Tab background color" })).toHaveCount(0);
  await expect(page.getByRole("slider", { name: "Session tab color" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Eyedropper" })).toBeEnabled();
  await expect(page.getByRole("slider", { name: "Color brightness" })).toBeVisible();
  await expect(page.getByLabel("HEX session tab color value")).toHaveValue("fff2b8");
  const opacitySlider = page.getByRole("slider", { name: "Color opacity" });
  await expect(opacitySlider).toBeVisible();
  await expect(opacitySlider).toHaveValue("1");

  const editorSurfaceBox = await page.getByTestId("sticky-editor-surface").boundingBox();
  await page.mouse.move(editorSurfaceBox.x + 24, editorSurfaceBox.y + 24);
  await expect.poll(() => getTabCssValue(page, 0, "backgroundColor"))
    .toBe("rgb(255, 242, 184)");
  const initialActiveBackground = await getTabCssValue(page, 0, "backgroundColor");
  await page.getByRole("button", { name: "Eyedropper" }).click();
  await expect(page.getByLabel("HEX session tab color value")).toHaveValue(/^00ff31$/);
  await expectActiveTabColor(page, "backgroundColor", "rgb(0, 255, 49)");
  await expectActiveTabColor(page, "color", "rgb(31, 31, 31)");
  await opacitySlider.evaluate((input) => {
    input.value = "0.42";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(opacitySlider).toHaveValue("0.42");
  await expectActiveTabColor(page, "backgroundColor", "rgba(0, 255, 49, 0.42)");
  await expectActiveTabColor(page, "color", "rgb(31, 31, 31)");
  await opacitySlider.evaluate((input) => {
    input.value = "1";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expectActiveTabColor(page, "backgroundColor", "rgb(0, 255, 49)");
  await page.mouse.move(editorSurfaceBox.x + 24, editorSurfaceBox.y + 24);
  expect(await getTabCssValue(page, 0, "backgroundColor")).not.toBe(initialActiveBackground);

  const wheel = page.getByRole("slider", { name: "Session tab color" });
  const box = await wheel.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + 2);
  await expect(page.getByLabel("HEX session tab color value")).toHaveValue(/^ff[0-9a-f]{4}$/);

  await page.getByLabel("Color brightness").evaluate((input) => {
    input.value = "0.86";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.mouse.click(box.x + box.width - 2, box.y + box.height / 2);
  await expect(page.getByLabel("Color brightness")).toHaveValue("0.86");

  await expect(page.getByLabel("HEX session tab color value")).toHaveValue(/[0-9a-f]{6}/);
  await expect(page.getByLabel("HSL session tab color value")).toHaveValue(/hsl\(/);
  await expect(page.getByLabel("RGB session tab color value")).toHaveValue(/rgb\(/);
  await expect(page.getByLabel("LCH session tab color value")).toHaveValue(/lch\(/);
  await expect(page.getByRole("button", { name: "Copy HEX" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy HSL" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy RGB" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy LCH" })).toBeVisible();

  await page.getByLabel("HEX session tab color value").fill("00ff31");
  await expectActiveTabColor(page, "backgroundColor", "rgb(0, 255, 49)");
  await expectActiveTabColor(page, "color", "rgb(31, 31, 31)");
  await page.keyboard.press("Escape");
  await expect(preferencesPanel).toHaveCount(0);

  await page.getByRole("button", { name: "New session" }).click();
  await expect(page.getByRole("tab")).toHaveCount(2);
  await expect(page.getByRole("tab").nth(1)).toHaveAttribute("aria-selected", "true");

  const tabStates = await page.evaluate(() => {
    const [inactiveTab, activeTab] = document.querySelectorAll(".session-tab-row");
    const inactiveStyle = getComputedStyle(inactiveTab);
    const activeStyle = getComputedStyle(activeTab);

    return {
      inactiveBackground: inactiveStyle.backgroundColor,
      inactiveBoxShadow: inactiveStyle.boxShadow,
      activeBackground: activeStyle.backgroundColor,
      activeBorderColor: activeStyle.borderColor,
      activeBoxShadow: activeStyle.boxShadow,
    };
  });
  expect(tabStates.inactiveBackground).toBe("rgb(0, 255, 49)");
  expect(tabStates.activeBackground).toBe("rgb(255, 215, 232)");
  expect(tabStates.activeBorderColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(tabStates.activeBoxShadow).not.toBe(tabStates.inactiveBoxShadow);
  expect(tabStates.activeBoxShadow).not.toBe("none");

  await page.getByRole("tab").first().click();
  await page.keyboard.press(modifierShortcut(","));

  await expect(page.getByRole("slider", { name: "Session tab color" })).toBeVisible();

  await page.getByLabel("HSL session tab color value").fill("hsl(0deg 100% 50%)");
  await expectActiveTabColor(page, "backgroundColor", "rgb(255, 0, 0)");
  await expectActiveTabColor(page, "color", "rgb(251, 251, 250)");

  await page.getByLabel("RGB session tab color value").fill("rgb(0 0 255)");
  await expectActiveTabColor(page, "backgroundColor", "rgb(0, 0, 255)");
  await expectActiveTabColor(page, "color", "rgb(251, 251, 250)");

  await page.getByLabel("LCH session tab color value").fill("lch(100% 0 0deg)");
  await expectActiveTabColor(page, "backgroundColor", "rgb(255, 255, 255)");
  await expectActiveTabColor(page, "color", "rgb(31, 31, 31)");

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
  const defaultTabBackground = await getTabCssValue(page, 0, "backgroundColor");
  expect(defaultTabBackground).toBe("rgb(255, 242, 184)");
  const tabsModeButtonMetrics = await page.evaluate(() => {
    const footer = document.querySelector("[data-testid='session-sidebar-footer']");
    const button = footer.querySelector(".layout-mode-button");
    const icon = button.querySelector(".notepane-action-icon");
    const label = button.querySelector(".layout-mode-label");
    const buttonRect = button.getBoundingClientRect();
    const iconRect = icon.getBoundingClientRect();

    return {
      buttonWidth: Math.round(buttonRect.width),
      footerControlCount: footer.querySelectorAll("button").length,
      headerLayoutButtonCount: document.querySelectorAll(
        ".sticky-header-actions .layout-mode-button",
      ).length,
      iconWidth: Math.round(iconRect.width),
      iconTone: icon.getAttribute("data-icon-tone"),
      label: label.textContent.trim(),
    };
  });

  expect(tabsModeButtonMetrics.buttonWidth).toBeGreaterThanOrEqual(120);
  expect(tabsModeButtonMetrics.footerControlCount).toBe(3);
  expect(tabsModeButtonMetrics.headerLayoutButtonCount).toBe(0);
  expect(tabsModeButtonMetrics.iconWidth).toBeGreaterThanOrEqual(24);
  expect(tabsModeButtonMetrics.iconTone).toBe("sticky");
  expect(tabsModeButtonMetrics.label).toBe("Sticky");

  await page.getByTestId("session-sidebar-footer")
    .getByRole("button", { name: "Layout mode" })
    .click();
  await expect(page.getByTestId("sticky-shell")).toHaveAttribute(
    "data-layout-mode",
    "sticky",
  );
  await expect.poll(async () => {
    return await page.evaluate(() => {
      const shell = document.querySelector("[data-testid='sticky-shell']");
      return getComputedStyle(shell).backgroundColor;
    });
  }).toBe(defaultTabBackground);
  await expect(page.getByRole("group", { name: "Editor typography" }))
    .toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sticky color" }))
    .toHaveCount(0);

  await clickLastEmptyParagraph(page);
  const toolbarToggle = page.getByRole("button", { name: "Show editor tools" });
  await expect(toolbarToggle).toBeVisible();
  await expect(toolbarToggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("group", { name: "Editor typography" }))
    .toHaveCount(0);
  const collapsedToolsScrollMetrics = await page.evaluate(() => {
    const surface = document.querySelector("[data-testid='sticky-editor-surface']");
    const editor = surface.querySelector(".bn-editor");
    const toggle = document.querySelector(".editor-toolbar-toggle");
    editor.style.paddingBottom = "960px";
    const before = toggle.getBoundingClientRect();
    surface.scrollTop = Math.min(640, surface.scrollHeight - surface.clientHeight);
    const after = toggle.getBoundingClientRect();

    return {
      position: getComputedStyle(toggle).position,
      topDelta: Math.abs(after.top - before.top),
      rightDelta: Math.abs(
        window.innerWidth - after.right - (window.innerWidth - before.right),
      ),
      scrollTop: Math.round(surface.scrollTop),
      visibleAfterScroll: after.top >= 0 && after.bottom <= window.innerHeight,
    };
  });

  expect(collapsedToolsScrollMetrics.position).toBe("fixed");
  expect(collapsedToolsScrollMetrics.scrollTop).toBeGreaterThan(100);
  expect(collapsedToolsScrollMetrics.topDelta).toBeLessThanOrEqual(1);
  expect(collapsedToolsScrollMetrics.rightDelta).toBeLessThanOrEqual(1);
  expect(collapsedToolsScrollMetrics.visibleAfterScroll).toBe(true);

  await toolbarToggle.click();
  await expect(page.getByRole("group", { name: "Editor typography" }))
    .toBeVisible();
  const stickyModeButtonMetrics = await page.evaluate(() => {
    const toolbar = document.querySelector(".editor-typography-control");
    const button = toolbar.querySelector(".layout-mode-button");
    const pinButton = toolbar.querySelector(".sticky-pin-button");
    const colorButton = toolbar.querySelector(".sticky-color-button");
    const icon = button.querySelector(".notepane-action-icon");
    const label = button.querySelector(".layout-mode-label");
    const buttonRect = button.getBoundingClientRect();
    const pinRect = pinButton.getBoundingClientRect();
    const colorRect = colorButton.getBoundingClientRect();
    const iconRect = icon.getBoundingClientRect();
    const toolbarRect = toolbar.getBoundingClientRect();
    const fontFamilyRect = toolbar
      .querySelector(".editor-font-family-combobox")
      .getBoundingClientRect();
    const fontSizeRect = toolbar
      .querySelector(".editor-font-size-combobox")
      .getBoundingClientRect();

    return {
      buttonWidth: Math.round(buttonRect.width),
      buttonBeforePin: buttonRect.right <= pinRect.left,
      pinBeforeColor: pinRect.right <= colorRect.left,
      colorBeforeFontFamily: colorRect.right <= fontFamilyRect.left,
      fontSizeIsLastControl: fontSizeRect.right <= toolbarRect.right - 3,
      exportButtonCount: toolbar.querySelectorAll(".export-icon-button").length,
      headerActionButtonCount: document.querySelectorAll(".sticky-header-actions button").length,
      toolbarColorButtonCount: toolbar.querySelectorAll(".sticky-color-button").length,
      toolbarPinButtonCount: toolbar.querySelectorAll(".sticky-pin-button").length,
      toolbarVisible: toolbarRect.width > 0 && toolbarRect.height > 0,
      iconWidth: Math.round(iconRect.width),
      iconTone: icon.getAttribute("data-icon-tone"),
      label: label.textContent.trim(),
    };
  });

  expect(stickyModeButtonMetrics.buttonWidth).toBeGreaterThanOrEqual(70);
  expect(stickyModeButtonMetrics.buttonBeforePin).toBe(true);
  expect(stickyModeButtonMetrics.pinBeforeColor).toBe(true);
  expect(stickyModeButtonMetrics.colorBeforeFontFamily).toBe(true);
  expect(stickyModeButtonMetrics.fontSizeIsLastControl).toBe(true);
  expect(stickyModeButtonMetrics.exportButtonCount).toBe(0);
  expect(stickyModeButtonMetrics.headerActionButtonCount).toBe(0);
  expect(stickyModeButtonMetrics.toolbarColorButtonCount).toBe(1);
  expect(stickyModeButtonMetrics.toolbarPinButtonCount).toBe(1);
  expect(stickyModeButtonMetrics.toolbarVisible).toBe(true);
  expect(stickyModeButtonMetrics.iconWidth).toBeGreaterThanOrEqual(20);
  expect(stickyModeButtonMetrics.iconTone).toBe("tabs");
  expect(stickyModeButtonMetrics.label).toBe("Tabs");

  const expandedToolsScrollMetrics = await page.evaluate(() => {
    const surface = document.querySelector("[data-testid='sticky-editor-surface']");
    const toolbar = document.querySelector(".editor-typography-control");
    const before = toolbar.getBoundingClientRect();
    surface.scrollTop = Math.min(surface.scrollTop + 240, surface.scrollHeight - surface.clientHeight);
    const after = toolbar.getBoundingClientRect();

    return {
      position: getComputedStyle(toolbar).position,
      topDelta: Math.abs(after.top - before.top),
      rightDelta: Math.abs(
        window.innerWidth - after.right - (window.innerWidth - before.right),
      ),
      visibleAfterScroll: after.top >= 0 && after.bottom <= window.innerHeight,
    };
  });

  expect(expandedToolsScrollMetrics.position).toBe("fixed");
  expect(expandedToolsScrollMetrics.topDelta).toBeLessThanOrEqual(1);
  expect(expandedToolsScrollMetrics.rightDelta).toBeLessThanOrEqual(1);
  expect(expandedToolsScrollMetrics.visibleAfterScroll).toBe(true);

  await expect.poll(async () => await page.evaluate(() => {
    const shell = document.querySelector("[data-testid='sticky-shell']");
    const header = document.querySelector("[data-testid='sticky-header']");
    const surface = document.querySelector("[data-testid='sticky-editor-surface']");
    const action = document.querySelector(".sticky-pin-button");
    const headerActions = document.querySelector(".sticky-header-actions");
    const shellEdge = getComputedStyle(shell, "::before");
    const headerStyle = getComputedStyle(header);

    return {
      shellBorderStyle: getComputedStyle(shell).borderTopStyle,
      shellBorderWidth: getComputedStyle(shell).borderTopWidth,
      shellRadius: getComputedStyle(shell).borderTopLeftRadius,
      shellBoxShadow: getComputedStyle(shell).boxShadow,
      shellMargin: getComputedStyle(shell).marginTop,
      shellEdgeBackground: shellEdge.backgroundImage,
      shellEdgeBackdrop:
        shellEdge.getPropertyValue("-webkit-backdrop-filter") ||
        shellEdge.backdropFilter,
      headerBackground: headerStyle.backgroundColor,
      headerBorderColor: headerStyle.borderBottomColor,
      headerBoxShadow: headerStyle.boxShadow,
      headerPosition: headerStyle.position,
      headerTitleCount: document.querySelectorAll("[data-testid='sticky-title-drag-label']").length,
      headerTitleFormCount: document.querySelectorAll(".sticky-title-form").length,
      surfacePaddingTop: getComputedStyle(surface).paddingTop,
      actionRadius: getComputedStyle(action).borderTopLeftRadius,
      headerActionDisplay: getComputedStyle(headerActions).display,
    };
  })).toMatchObject({
    shellBorderStyle: "none",
    shellBorderWidth: "0px",
    shellRadius: "0px",
    shellMargin: "0px",
    actionRadius: "5px",
    headerTitleCount: 0,
    headerTitleFormCount: 0,
    headerBackground: "rgba(0, 0, 0, 0)",
    headerBorderColor: "rgba(0, 0, 0, 0)",
    headerBoxShadow: "none",
    headerPosition: "absolute",
    surfacePaddingTop: "30px",
    headerActionDisplay: "none",
    shellBoxShadow: "none",
    shellEdgeBackground: expect.stringContaining("linear-gradient"),
    shellEdgeBackdrop: expect.stringContaining("blur"),
  });

  await page.getByTestId("sticky-editor-surface").click({
    position: {
      x: 140,
      y: 180,
    },
  });
  await expect(page.getByRole("group", { name: "Editor typography" }))
    .toHaveCount(0);
  await expect(toolbarToggle).toBeVisible();
  await toolbarToggle.click();

  const stickyToolbar = page.getByRole("group", { name: "Editor typography" });
  await expect(stickyToolbar.getByRole("button", { name: "Sticky color" }))
    .toBeVisible();
  await expect(stickyToolbar.locator(".sticky-color-button .notepane-icon-palette"))
    .toHaveAttribute("data-icon-tone", "palette");
  await expect(stickyToolbar.getByRole("button", { name: "Pin window" }))
    .toBeVisible();
  await expect(stickyToolbar.getByRole("button", { name: "Pin window" }))
    .toHaveAttribute("aria-pressed", "false");
  await expect(stickyToolbar.locator(".sticky-pin-button .notepane-icon-pin"))
    .toHaveAttribute("data-pin-state", "unpinned");
  await expect(page.getByRole("switch", { name: "Theme mode" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Hide sidebar" })).toHaveCount(0);
  await expect(page.locator("[aria-label='NotePane wordmark']")).toHaveCount(0);
  await expect.poll(() => getHeaderHeight(page)).toBeLessThan(tabModeHeaderHeight);

  await stickyToolbar.getByRole("button", { name: "Pin window" }).click();
  await expect(stickyToolbar.getByRole("button", { name: "Unpin window" }))
    .toHaveAttribute("aria-pressed", "true");
  await expect(stickyToolbar.locator(".sticky-pin-button .notepane-icon-pin"))
    .toHaveAttribute("data-pin-state", "pinned");
  await expect.poll(() =>
    page.evaluate(() =>
      getComputedStyle(document.querySelector(".sticky-pin-button")).color,
    ),
  ).toBe("rgb(206, 45, 59)");
  await stickyToolbar.getByRole("button", { name: "Unpin window" }).click();
  await expect(stickyToolbar.getByRole("button", { name: "Pin window" }))
    .toHaveAttribute("aria-pressed", "false");

  await stickyToolbar.getByRole("button", { name: "Sticky color" }).click();
  const preferencesPanel = page.getByRole("dialog", { name: "Sticky color panel" });
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

  await page.keyboard.press("Escape");
  await expect(stickyToolbar).toBeVisible();
  await stickyToolbar.getByRole("button", { name: "Layout mode" })
    .click();
  await expect(page.getByTestId("sticky-shell")).toHaveAttribute(
    "data-layout-mode",
    "tabs",
  );
  await expect(page.getByRole("button", { name: "Pin window" })).toHaveCount(0);
  await expect(page.getByRole("switch", { name: "Theme mode" })).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(1);
  await expectActiveTabColor(page, "backgroundColor", "rgba(255, 215, 232, 0.5)");
  await expectActiveTabColor(page, "color", "rgb(31, 31, 31)");
});

test("keeps sticky editor chrome readable against dark custom backgrounds", async ({ page }) => {
  await page.getByRole("button", { name: "Layout mode" }).click();
  await expect(page.getByTestId("sticky-shell")).toHaveAttribute(
    "data-layout-mode",
    "sticky",
  );

  await clickLastEmptyParagraph(page);
  await page.getByRole("button", { name: "Show editor tools" }).click();
  const stickyToolbar = page.getByRole("group", { name: "Editor typography" });
  await expect(stickyToolbar).toBeVisible();
  await stickyToolbar.getByRole("button", { name: "Sticky color" }).click();
  await page.getByLabel("HEX sticky color value").fill("202020");

  await expect.poll(async () => {
    return await page.evaluate(() => {
      const shell = document.querySelector("[data-testid='sticky-shell']");
      const header = document.querySelector("[data-testid='sticky-header']");
      const cell = document.querySelector(".bn-editor td");
      const code = document.querySelector(".bn-editor code");
      const parseRgb = (color) => {
        const channels = color.match(/\d+(\.\d+)?/g)?.map(Number) ?? [0, 0, 0];
        return channels.slice(0, 3);
      };
      const luminance = (color) => {
        const [red, green, blue] = parseRgb(color).map((channel) => {
          const normalized = channel / 255;
          return normalized <= 0.03928
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      };
      const borderColor = cell ? getComputedStyle(cell).borderTopColor : "";
      const codeTextColor = code ? getComputedStyle(code).color : "";
      const headerColor = header ? getComputedStyle(header).backgroundColor : "";
      return {
        textColor: getComputedStyle(shell)
          .getPropertyValue("--sticky-text-color")
          .trim(),
        headerStaysDark: luminance(headerColor) < 0.08,
        borderIsReadable: luminance(borderColor) > 0.55,
        codeTextIsReadable: luminance(codeTextColor) > 0.55,
      };
    });
  }).toEqual({
    textColor: "#f7f7f4",
    headerStaysDark: true,
    borderIsReadable: true,
    codeTextIsReadable: true,
  });
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
  expect(layout.gapFromLastTab).toBeLessThanOrEqual(14);
  expect(layout.distanceFromSidebarBottom).toBeGreaterThan(160);
}

test("opens export format choices from the keyboard shortcut without a share icon", async ({ page }) => {
  await clickLastEmptyParagraph(page);
  await expect(page.getByRole("button", { name: "Export note" })).toHaveCount(0);

  await page.keyboard.press(modifierShortcut("Shift+E"));

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
    .toBeLessThanOrEqual(14);
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
    const rows = [...document.querySelectorAll(".session-tab-row")];
    const firstRow = rows[0];
    const lastRow = rows.at(-1);
    const addButton = document.querySelector(".session-add-button");
    const rowRect = firstRow.getBoundingClientRect();
    const lastRowRect = lastRow.getBoundingClientRect();
    const addRect = addButton.getBoundingClientRect();

    return {
      rowLeft: Math.round(rowRect.left),
      addLeft: Math.round(addRect.left),
      rowWidth: Math.round(rowRect.width),
      addWidth: Math.round(addRect.width),
      rowHeight: Math.round(rowRect.height),
      addHeight: Math.round(addRect.height),
      addTopGap: Math.round(addRect.top - lastRowRect.bottom),
    };
  });

  expect(metrics.addLeft).toBe(metrics.rowLeft);
  expect(metrics.addWidth).toBe(metrics.rowWidth);
  expect(metrics.addHeight).toBeGreaterThanOrEqual(metrics.rowHeight);
  expect(metrics.addTopGap).toBeGreaterThanOrEqual(8);
  expect(metrics.addTopGap).toBeLessThanOrEqual(14);
});

test("keeps the sticky header draggable without title chrome", async ({ page }) => {
  await page.getByRole("button", { name: "Layout mode" }).click();
  await expect(page.getByTestId("sticky-shell")).toHaveAttribute(
    "data-layout-mode",
    "sticky",
  );

  await expect(page.getByLabel("Note title")).toHaveCount(0);
  await expect(page.getByTestId("sticky-title-drag-label")).toHaveCount(0);
  await expect(page.locator(".sticky-title-form")).toHaveCount(0);

  const headerRegions = await page.evaluate(() => {
    const header = document.querySelector("[data-testid='sticky-header']");

    return {
      headerRegion: getComputedStyle(header).getPropertyValue("-webkit-app-region"),
      headerDragHandle: header.getAttribute("data-window-drag-handle"),
      headerHeight: Math.round(header.getBoundingClientRect().height),
    };
  });

  expect(headerRegions.headerRegion).toBe("drag");
  expect(headerRegions.headerDragHandle).toBe("true");
  expect(headerRegions.headerHeight).toBe(30);
  await page.getByTestId("sticky-header").dblclick({
    position: {
      x: 220,
      y: 14,
    },
  });
  await expect(page.getByLabel("Note title")).toHaveCount(0);
  await expect(page.getByTestId("sticky-title-drag-label")).toHaveCount(0);
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

test("pastes wrapped markdown tables without breaking table cells into paragraphs", async ({ page }) => {
  const wrappedMarkdown = `ZDR을 적용할 수 있고 입력과 출력을 모델 학습에 사용하지 않는 provider를 정리했다.

## 직접 호출 가능한 Provider

| Provider | ZDR | Data Collection | 결과 |
| --- | --- | --- | --- |
| Amazon Bedrock | 가능: data_retention_mode=none | Prompt·response를 durable storage에 기록하지 않음
Model provider에 전달하지 않음
Usage metadata 수집 여부는 현재 링크에서 확인되지 않음 | **Training 근거 필요** |
| Together AI | 가능: 입력·출력 기본 미저장 | Input·output 기본 미저장
Training opt-in을 켜지 않음 | **사용 가능** |`;

  await clickLastEmptyParagraph(page);
  await pastePlainText(page, wrappedMarkdown);

  await expect(page.getByRole("heading", { name: "직접 호출 가능한 Provider" }))
    .toBeVisible();
  await expect.poll(async () => page.evaluate(() => {
    return [...document.querySelectorAll(".bn-editor table")]
      .some((table) => table.textContent.includes("Amazon Bedrock"));
  })).toBe(true);

  const pastedTable = await page.evaluate(() => {
    const tables = [...document.querySelectorAll(".bn-editor table")];
    const table = tables.find((candidate) =>
      candidate.textContent.includes("Amazon Bedrock"),
    );
    const tableRows = [...table.querySelectorAll("tr")];
    const headers = [...tableRows[0].cells].map((cell) => cell.textContent.trim());
    const rows = tableRows.slice(1).map((row) =>
      [...row.cells].map((cell) => cell.textContent.trim()),
    );

    return {
      headers,
      rows,
      text: table.textContent,
      tableCount: tables.length,
    };
  });

  expect(pastedTable.tableCount).toBeGreaterThanOrEqual(2);
  expect(pastedTable.headers).toEqual([
    "Provider",
    "ZDR",
    "Data Collection",
    "결과",
  ]);
  expect(pastedTable.rows).toHaveLength(2);
  expect(pastedTable.rows[0]).toHaveLength(4);
  expect(pastedTable.rows[1]).toHaveLength(4);
  expect(pastedTable.text).toContain("Amazon Bedrock");
  expect(pastedTable.text).toContain("Model provider에 전달하지 않음");
  expect(pastedTable.text).toContain("Usage metadata 수집 여부는 현재 링크에서 확인되지 않음");
  expect(pastedTable.text).toContain("Training opt-in을 켜지 않음");
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

test("keeps BlockNote color and delete menus usable inside the app window", async ({ page }) => {
  const styledText = page.getByText("Styled Text");
  await styledText.scrollIntoViewIfNeeded();
  await styledText.dblclick();
  const formattingToolbar = page.getByRole("toolbar");
  await expect(formattingToolbar).toBeVisible();
  const colorsButton = formattingToolbar.getByRole("button", { name: "Colors" });
  await colorsButton.click();
  await expect(colorsButton).toHaveAttribute("aria-expanded", "true");

  const colorMenu = page.locator(".bn-color-picker-dropdown:visible");
  await expect(colorMenu).toBeVisible();
  await expectBlockNoteFloatingMenuInsideViewport(
    page,
    ".bn-color-picker-dropdown",
    220,
  );
  await page.locator(".bn-color-picker-dropdown:visible [data-test='text-color-red']").click();

  await expect.poll(async () =>
    page.getByText("Styled Text").evaluate((element) => getComputedStyle(element).color),
  ).toBe("rgb(224, 62, 62)");

  const paragraph = page.locator(".bn-editor").getByText("Paragraph", { exact: true });
  await page.keyboard.press("Escape");
  await paragraph.scrollIntoViewIfNeeded();
  await paragraph.click();
  const paragraphBox = await paragraph.boundingBox();
  await page.mouse.move(paragraphBox.x - 24, paragraphBox.y + paragraphBox.height / 2);
  const openBlockMenuButton = page.getByRole("button", { name: "Open block menu" });
  await expect(openBlockMenuButton).toBeVisible();
  await openBlockMenuButton.click();

  const blockMenu = page.locator(".bn-drag-handle-menu:visible");
  await expect(blockMenu).toBeVisible();
  await expectBlockNoteFloatingMenuInsideViewport(page, ".bn-drag-handle-menu", 60);
  await page.getByRole("menuitem", { name: "Delete" }).click();

  await expect(page.locator(".bn-editor").getByText("Paragraph", { exact: true }))
    .toHaveCount(0);
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

async function pastePlainText(page, text) {
  await page.evaluate((clipboardText) => {
    const editor = document.querySelector(".bn-editor");
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", clipboardText);
    editor.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData,
      }),
    );
  }, text);
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
    };
  });
}

async function expectSystemSymbolIcons(page) {
  const iconAudit = await page.evaluate(() => {
    return [...document.querySelectorAll(".notepane-action-icon")].map((icon) => ({
      family: icon.getAttribute("data-icon-family"),
      pack: icon.getAttribute("data-icon-pack"),
      className: icon.getAttribute("class") ?? "",
      fill: getComputedStyle(icon).fill,
      strokeLinecap: getComputedStyle(icon).strokeLinecap,
      strokeLinejoin: getComputedStyle(icon).strokeLinejoin,
    }));
  });

  expect(iconAudit.length).toBeGreaterThanOrEqual(3);
  for (const icon of iconAudit) {
    expect(icon.family).toBe("system-symbol");
    expect(icon.pack).toBe("lucide");
    expect(icon.className).toContain("lucide");
    expect(icon.fill).toBe("none");
    expect(icon.strokeLinecap).toBe("round");
    expect(icon.strokeLinejoin).toBe("round");
  }
}

async function expectFloatingTypographyMenu(page, ariaLabel) {
  await expect.poll(async () => {
    return await page.evaluate((label) => {
      const menu = document.querySelector(`[role='listbox'][aria-label='${label}']`);
      const editorSurface = document.querySelector("[data-testid='sticky-editor-surface']");
      if (!menu || !editorSurface) {
        return null;
      }

      const menuRect = menu.getBoundingClientRect();
      return {
        bottomInsideViewport: menuRect.bottom <= window.innerHeight,
        escapesEditorSurface: !editorSurface.contains(menu),
        leftInsideViewport: menuRect.left >= 0,
        parentTag: menu.parentElement?.tagName ?? "",
        position: getComputedStyle(menu).position,
        rightInsideViewport: menuRect.right <= window.innerWidth,
        topInsideViewport: menuRect.top >= 0,
      };
    }, ariaLabel);
  }).toMatchObject({
    bottomInsideViewport: true,
    escapesEditorSurface: true,
    leftInsideViewport: true,
    parentTag: "BODY",
    position: "fixed",
    rightInsideViewport: true,
    topInsideViewport: true,
  });
}

async function expectBlockNoteFloatingMenuInsideViewport(page, selector, minimumHeight = 1) {
  await expect.poll(async () => {
    return await page.evaluate(({ menuSelector, minimumHeight }) => {
      const visibleMenu = [...document.querySelectorAll(menuSelector)].find((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) > 0.01 &&
          rect.width > 0 &&
          rect.height > 0
        );
      });

      if (!visibleMenu) {
        return null;
      }

      const rect = visibleMenu.getBoundingClientRect();
      return {
        bottomInsideViewport: rect.bottom <= window.innerHeight,
        heightEnough: rect.height >= minimumHeight,
        height: Math.round(rect.height),
        leftInsideViewport: rect.left >= 0,
        position: getComputedStyle(visibleMenu).position,
        rightInsideViewport: rect.right <= window.innerWidth,
        topInsideViewport: rect.top >= 0,
      };
    }, { menuSelector: selector, minimumHeight });
  }).toMatchObject({
    bottomInsideViewport: true,
    heightEnough: true,
    leftInsideViewport: true,
    position: "fixed",
    rightInsideViewport: true,
    topInsideViewport: true,
  });
}

async function getEditorScaleMetrics(page) {
  return await page.evaluate(() => {
    const shell = document.querySelector("[data-testid='sticky-shell']");
    const header = document.querySelector("[data-testid='sticky-header']");
    const sidebar = document.querySelector("[data-testid='session-sidebar']");
    const editorSurface = document.querySelector("[data-testid='sticky-editor-surface']");
    const editor = document.querySelector(".bn-editor");

    return {
      editorFontScale: getComputedStyle(shell)
        .getPropertyValue("--editor-font-scale")
        .trim() || "1",
      editorFontFamily: getComputedStyle(editor).fontFamily,
      shellFontSize: Math.round(Number.parseFloat(getComputedStyle(shell).fontSize)),
      headerHeight: Math.round(header.getBoundingClientRect().height),
      sidebarWidth: Math.round(sidebar.getBoundingClientRect().width),
      editorFontSize: Math.round(Number.parseFloat(getComputedStyle(editor).fontSize) * 100) / 100,
      editorSurfaceFontSize: Math.round(Number.parseFloat(getComputedStyle(editorSurface).fontSize) * 100) / 100,
    };
  });
}

function modifierShortcut(key) {
  return `${process.platform === "darwin" ? "Meta" : "Control"}+${key}`;
}

function modifierOptionShortcut(key) {
  return `${process.platform === "darwin" ? "Meta" : "Control"}+Alt+${key}`;
}
