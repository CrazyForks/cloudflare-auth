import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const roots = [
  ".github",
  "docs",
  "packages",
  "scripts",
  "tests",
  "examples",
  "templates",
];
const forbidden = [
  {
    pattern: /console\.log\([^)]*cfauth\.(ses|magic|verify|reset)\./,
    message: "raw auth token logging",
  },
  {
    pattern: /Access-Control-Allow-Origin["']?\s*,\s*["']\*/,
    message: "wildcard CORS header",
  },
];

async function* walk(dir) {
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!["node_modules", "dist", ".wrangler"].includes(entry.name))
        yield* walk(path);
    } else if (/\.(ts|tsx|js|mjs|md|yml|yaml|json)$/.test(entry.name)) {
      yield path;
    }
  }
}

const failures = [];
for (const root of roots) {
  for await (const file of walk(root)) {
    const text = await readFile(file, "utf8");
    for (const rule of forbidden) {
      if (rule.pattern.test(text)) failures.push(`${file}: ${rule.message}`);
    }
    const interpolatedSqlCall = findD1TemplateSqlInterpolation(text);
    if (interpolatedSqlCall) {
      failures.push(
        `${file}: ${interpolatedSqlCall} SQL must not use template interpolation`,
      );
    }
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

function findD1TemplateSqlInterpolation(text) {
  for (const method of ["prepare", "exec"]) {
    let index = 0;
    const needle = `.${method}`;
    while ((index = text.indexOf(needle, index)) !== -1) {
      const openParen = nextNonWhitespace(text, index + needle.length);
      if (text[openParen] !== "(") {
        index += needle.length;
        continue;
      }
      const firstArg = nextNonWhitespace(text, openParen + 1);
      if (text[firstArg] !== "`") {
        index = firstArg;
        continue;
      }
      if (templateLiteralHasInterpolation(text, firstArg)) return method;
      index = firstArg + 1;
    }
  }
  return "";
}

function nextNonWhitespace(text, start) {
  let index = start;
  while (index < text.length && /\s/u.test(text[index])) index += 1;
  return index;
}

function templateLiteralHasInterpolation(text, start) {
  for (let index = start + 1; index < text.length; index += 1) {
    const char = text[index];
    if (char === "\\") {
      index += 1;
      continue;
    }
    if (char === "`") return false;
    if (char === "$" && text[index + 1] === "{") return true;
  }
  return false;
}
