#!/usr/bin/env node
// PostToolUse hook (Write|Edit) for Arcade Vault only.
// Formats the touched file with Prettier, then auto-fixes it with ESLint.
// Never blocks the turn: always exits 0. Remaining ESLint issues are
// surfaced back to Claude via hookSpecificOutput.additionalContext.

import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const PROJECT_ROOT = path.resolve(import.meta.dirname, "..", "..");

const IGNORED_DIR_SEGMENTS = new Set([
  "node_modules",
  ".next",
  "out",
  "build",
  "coverage",
  ".git",
]);

const LINTABLE_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]);

function readStdin() {
  try {
    const chunks = [];
    let chunk;
    const fs = require("fs");
    const buf = Buffer.alloc(65536);
    while (true) {
      let bytesRead;
      try {
        bytesRead = fs.readSync(0, buf, 0, buf.length, null);
      } catch (err) {
        if (err.code === "EAGAIN") continue;
        break;
      }
      if (bytesRead === 0) break;
      chunks.push(Buffer.from(buf.subarray(0, bytesRead)));
    }
    return Buffer.concat(chunks).toString("utf8");
  } catch {
    return "";
  }
}

function exitSilently() {
  process.exit(0);
}

function main() {
  const raw = readStdin();
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    exitSilently();
    return;
  }

  const filePath = input?.tool_input?.file_path ?? input?.tool_response?.filePath;
  if (!filePath) {
    exitSilently();
    return;
  }

  const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(PROJECT_ROOT, filePath);
  const relPath = path.relative(PROJECT_ROOT, absPath);

  // Outside the project root, or doesn't exist (deleted right after write, etc.)
  if (relPath.startsWith("..") || path.isAbsolute(relPath) || !existsSync(absPath)) {
    exitSilently();
    return;
  }

  const segments = relPath.split(path.sep);
  if (segments.some((s) => IGNORED_DIR_SEGMENTS.has(s))) {
    exitSilently();
    return;
  }

  // Resolve local binaries directly, bypassing npx / .bin shims (fragile on Windows).
  let prettierBin;
  let eslintBin;
  try {
    prettierBin = require.resolve("prettier/bin/prettier.cjs", { paths: [PROJECT_ROOT] });
  } catch {
    prettierBin = null;
  }
  try {
    eslintBin = require.resolve("eslint/bin/eslint.js", { paths: [PROJECT_ROOT] });
  } catch {
    eslintBin = null;
  }

  if (prettierBin) {
    spawnSync(process.execPath, [prettierBin, "--write", "--ignore-unknown", absPath], {
      cwd: PROJECT_ROOT,
      shell: false,
      encoding: "utf8",
    });
  }

  const ext = path.extname(absPath);
  let eslintOutput = "";
  if (eslintBin && LINTABLE_EXTENSIONS.has(ext)) {
    const result = spawnSync(process.execPath, [eslintBin, "--fix", absPath], {
      cwd: PROJECT_ROOT,
      shell: false,
      encoding: "utf8",
    });
    // ESLint exits 1 when unfixable problems remain; 2 is a fatal ESLint error.
    if (result.status === 1) {
      eslintOutput = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
    }
  }

  if (eslintOutput) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: `ESLint issues remaining in ${relPath}:\n${eslintOutput}`,
        },
      }),
    );
  }

  process.exit(0);
}

main();
