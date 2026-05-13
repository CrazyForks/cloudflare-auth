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
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
