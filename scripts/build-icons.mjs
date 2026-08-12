import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const projectRoot = process.cwd();
const sourcePath = path.join(projectRoot, "assets", "notepane-icon.png");
const buildDirectory = path.join(projectRoot, "build");
const pngPath = path.join(buildDirectory, "icon.png");
const icnsPath = path.join(buildDirectory, "icon.icns");

if (process.platform !== "darwin") {
  throw new Error("Icon generation currently requires macOS sips and iconutil.");
}

if (!fs.existsSync(sourcePath)) {
  throw new Error(`Missing icon source: ${sourcePath}`);
}

fs.mkdirSync(buildDirectory, { recursive: true });

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "notepane-icons-"));
const resizedPath = path.join(temporaryDirectory, "resized.png");
const iconsetPath = path.join(temporaryDirectory, "NotePane.iconset");

try {
  fs.mkdirSync(iconsetPath);

  run("sips", ["-Z", "1024", sourcePath, "--out", resizedPath]);
  run("sips", ["-p", "1024", "1024", resizedPath, "--out", pngPath]);

  const iconSizes = [
    [16, "icon_16x16.png"],
    [32, "icon_16x16@2x.png"],
    [32, "icon_32x32.png"],
    [64, "icon_32x32@2x.png"],
    [128, "icon_128x128.png"],
    [256, "icon_128x128@2x.png"],
    [256, "icon_256x256.png"],
    [512, "icon_256x256@2x.png"],
    [512, "icon_512x512.png"],
    [1024, "icon_512x512@2x.png"],
  ];

  for (const [size, filename] of iconSizes) {
    run("sips", ["-z", String(size), String(size), pngPath, "--out", path.join(iconsetPath, filename)]);
  }

  run("iconutil", ["-c", "icns", iconsetPath, "-o", icnsPath]);
  console.log("Generated build/icon.png and build/icon.icns");
} finally {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}

function run(command, args) {
  execFileSync(command, args, { stdio: "ignore" });
}
