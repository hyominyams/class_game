import fs from "node:fs";
import path from "node:path";
import { parseGIF, decompressFrames } from "gifuct-js";
import { PNG } from "pngjs";

const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, "public");
const outputDir = path.join(publicDir, "sprites");

const targets = [
  "enemy-bat",
  "enemy-zombie",
  "enemy-tank",
  "boss",
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function applyPatchToState(state, canvasWidth, canvasHeight, frame) {
  const { left, top, width, height } = frame.dims;
  const patch = frame.patch;

  for (let y = 0; y < height; y++) {
    const targetY = top + y;
    if (targetY < 0 || targetY >= canvasHeight) continue;

    for (let x = 0; x < width; x++) {
      const targetX = left + x;
      if (targetX < 0 || targetX >= canvasWidth) continue;

      const src = (y * width + x) * 4;
      const a = patch[src + 3];
      if (a === 0) continue;

      const dst = (targetY * canvasWidth + targetX) * 4;
      state[dst] = patch[src];
      state[dst + 1] = patch[src + 1];
      state[dst + 2] = patch[src + 2];
      state[dst + 3] = a;
    }
  }
}

function clearRectInState(state, canvasWidth, canvasHeight, dims) {
  const { left, top, width, height } = dims;

  for (let y = 0; y < height; y++) {
    const targetY = top + y;
    if (targetY < 0 || targetY >= canvasHeight) continue;

    for (let x = 0; x < width; x++) {
      const targetX = left + x;
      if (targetX < 0 || targetX >= canvasWidth) continue;

      const dst = (targetY * canvasWidth + targetX) * 4;
      state[dst] = 0;
      state[dst + 1] = 0;
      state[dst + 2] = 0;
      state[dst + 3] = 0;
    }
  }
}

function decodeGifToFullFrames(buffer) {
  const gif = parseGIF(buffer);
  const frames = decompressFrames(gif, true);

  if (!frames || frames.length === 0) {
    throw new Error("No frames decoded from gif.");
  }

  const canvasWidth = gif.lsd.width;
  const canvasHeight = gif.lsd.height;
  let state = new Uint8ClampedArray(canvasWidth * canvasHeight * 4);

  const renderedFrames = [];
  const durationsMs = [];

  for (const frame of frames) {
    const before = state.slice();

    applyPatchToState(state, canvasWidth, canvasHeight, frame);
    renderedFrames.push(state.slice());

    const rawDelay = typeof frame.delay === "number" ? frame.delay : 10;
    durationsMs.push(Math.max(16, rawDelay * 10));

    if (frame.disposalType === 2) {
      clearRectInState(state, canvasWidth, canvasHeight, frame.dims);
    } else if (frame.disposalType === 3) {
      state = before;
    }
  }

  return {
    width: canvasWidth,
    height: canvasHeight,
    renderedFrames,
    durationsMs,
  };
}

function writeSpriteSheet(baseName, data) {
  const frameCount = data.renderedFrames.length;
  const cols = Math.min(16, frameCount);
  const rows = Math.ceil(frameCount / cols);

  const sheetWidth = cols * data.width;
  const sheetHeight = rows * data.height;
  const sheet = new Uint8Array(sheetWidth * sheetHeight * 4);

  for (let i = 0; i < frameCount; i++) {
    const frame = data.renderedFrames[i];
    const cellX = (i % cols) * data.width;
    const cellY = Math.floor(i / cols) * data.height;

    for (let y = 0; y < data.height; y++) {
      for (let x = 0; x < data.width; x++) {
        const src = (y * data.width + x) * 4;
        const dst = ((cellY + y) * sheetWidth + (cellX + x)) * 4;
        sheet[dst] = frame[src];
        sheet[dst + 1] = frame[src + 1];
        sheet[dst + 2] = frame[src + 2];
        sheet[dst + 3] = frame[src + 3];
      }
    }
  }

  const png = new PNG({ width: sheetWidth, height: sheetHeight });
  png.data = Buffer.from(sheet);

  const spritePath = path.join(outputDir, `${baseName}-sheet.png`);
  const metaPath = path.join(outputDir, `${baseName}-sheet.json`);

  fs.writeFileSync(spritePath, PNG.sync.write(png));

  const meta = {
    frameWidth: data.width,
    frameHeight: data.height,
    frameCount,
    cols,
    rows,
    durationsMs: data.durationsMs,
    totalDurationMs: data.durationsMs.reduce((sum, d) => sum + d, 0),
  };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf8");

  return { spritePath, metaPath, frameCount, size: `${sheetWidth}x${sheetHeight}` };
}

function main() {
  ensureDir(outputDir);

  for (const baseName of targets) {
    const inputPath = path.join(publicDir, `${baseName}.gif`);
    if (!fs.existsSync(inputPath)) {
      console.warn(`[skip] Missing gif: ${inputPath}`);
      continue;
    }

    const buffer = fs.readFileSync(inputPath);
    const decoded = decodeGifToFullFrames(buffer);
    const result = writeSpriteSheet(baseName, decoded);

    console.log(
      `[ok] ${baseName}.gif -> sprites/${baseName}-sheet.png (${result.frameCount} frames, ${result.size})`,
    );
  }
}

main();
