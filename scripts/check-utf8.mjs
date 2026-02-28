import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

const INCLUDE_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".scss",
  ".html",
  ".md",
  ".sql",
  ".yml",
  ".yaml",
]);

const IGNORE_DIRS = new Set([
  ".git",
  ".next",
  "node_modules",
  ".turbo",
  ".vercel",
  "dist",
  "build",
  "coverage",
]);

function walk(dir, files = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walk(join(dir, entry.name), files);
      continue;
    }

    if (!entry.isFile()) continue;
    const ext = extname(entry.name).toLowerCase();
    if (!INCLUDE_EXTS.has(ext)) continue;
    files.push(join(dir, entry.name));
  }
  return files;
}

function findFirstInvalidUtf8Index(buf) {
  let i = 0;
  while (i < buf.length) {
    const b0 = buf[i];

    if (b0 <= 0x7f) {
      i += 1;
      continue;
    }

    if (b0 >= 0xc2 && b0 <= 0xdf) {
      if (i + 1 >= buf.length) return i;
      const b1 = buf[i + 1];
      if (b1 < 0x80 || b1 > 0xbf) return i;
      i += 2;
      continue;
    }

    if (b0 >= 0xe0 && b0 <= 0xef) {
      if (i + 2 >= buf.length) return i;
      const b1 = buf[i + 1];
      const b2 = buf[i + 2];
      if (b1 < 0x80 || b1 > 0xbf || b2 < 0x80 || b2 > 0xbf) return i;
      if (b0 === 0xe0 && b1 < 0xa0) return i;
      if (b0 === 0xed && b1 > 0x9f) return i;
      i += 3;
      continue;
    }

    if (b0 >= 0xf0 && b0 <= 0xf4) {
      if (i + 3 >= buf.length) return i;
      const b1 = buf[i + 1];
      const b2 = buf[i + 2];
      const b3 = buf[i + 3];
      if (b1 < 0x80 || b1 > 0xbf || b2 < 0x80 || b2 > 0xbf || b3 < 0x80 || b3 > 0xbf) return i;
      if (b0 === 0xf0 && b1 < 0x90) return i;
      if (b0 === 0xf4 && b1 > 0x8f) return i;
      i += 4;
      continue;
    }

    return i;
  }

  return -1;
}

function startsWith(buf, signature) {
  if (buf.length < signature.length) return false;
  for (let i = 0; i < signature.length; i += 1) {
    if (buf[i] !== signature[i]) return false;
  }
  return true;
}

function hasNullByte(buf) {
  for (let i = 0; i < buf.length; i += 1) {
    if (buf[i] === 0x00) return true;
  }
  return false;
}

function getEncodingIssues(buf) {
  const issues = [];

  if (startsWith(buf, [0xef, 0xbb, 0xbf])) {
    issues.push("utf8_bom");
  } else if (startsWith(buf, [0xff, 0xfe])) {
    issues.push("utf16le_bom");
  } else if (startsWith(buf, [0xfe, 0xff])) {
    issues.push("utf16be_bom");
  }

  if (hasNullByte(buf)) {
    issues.push("null_byte");
  }

  const invalidIndex = findFirstInvalidUtf8Index(buf);
  if (invalidIndex >= 0) {
    issues.push(`invalid_utf8_byte_at_${invalidIndex}`);
  }

  return issues;
}

const files = walk(process.cwd());
const invalidFiles = [];

for (const file of files) {
  const buf = readFileSync(file);
  const issues = getEncodingIssues(buf);
  if (issues.length > 0) {
    invalidFiles.push({
      path: relative(process.cwd(), file),
      issues,
    });
  }
}

if (invalidFiles.length > 0) {
  console.error("UTF-8 encoding policy violation(s):");
  for (const file of invalidFiles) {
    console.error(`- ${file.path} (${file.issues.join(", ")})`);
  }
  process.exit(1);
}

console.log(`UTF-8 check passed (${files.length} files).`);
