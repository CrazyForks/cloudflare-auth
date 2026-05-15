import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

describe("lint checks", () => {
  it("allows static multiline D1 SQL templates", async () => {
    const root = await lintFixture(`
export function readUser(db, id) {
  return db
    .prepare(\`
      SELECT id, normalized_email
      FROM users
      WHERE id = ?
    \`)
    .bind(id)
    .first();
}
`);

    const result = runLint(root);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
  });

  it("rejects interpolated D1 prepare SQL", async () => {
    const root = await lintFixture(`
export function readUser(db, id) {
  return db.prepare(\`SELECT id FROM users WHERE id = \${id}\`).first();
}
`);

    const result = runLint(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "packages/worker/src/index.ts: prepare SQL must not use template interpolation",
    );
  });

  it("rejects interpolated D1 exec SQL", async () => {
    const root = await lintFixture(`
export function deleteUser(db, id) {
  return db.exec(\`DELETE FROM users WHERE id = \${id}\`);
}
`);

    const result = runLint(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "packages/worker/src/index.ts: exec SQL must not use template interpolation",
    );
  });
});

async function lintFixture(source: string) {
  const root = await mkdtemp(join(tmpdir(), "cf-auth-lint-"));
  const dir = join(root, "packages", "worker", "src");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "index.ts"), source);
  return root;
}

function runLint(cwd: string) {
  return spawnSync(process.execPath, [resolve("scripts", "lint.mjs")], {
    cwd,
    encoding: "utf8",
  });
}
