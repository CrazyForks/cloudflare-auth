import { cp, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

describe("docs coverage verifier", () => {
  it("accepts the current docs coverage fixture", async () => {
    const root = await docsCoverageFixture();
    const result = runDocsCoverageVerifier(root);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("documentation coverage verified");
  });

  it("rejects non-object package manifests", async () => {
    const root = await docsCoverageFixture();
    await writeFile(join(root, "packages", "cli", "package.json"), "null\n");
    const result = runDocsCoverageVerifier(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "packages/cli/package.json: top-level JSON value must be an object",
    );
  });
});

async function docsCoverageFixture() {
  const sourceRoot = process.cwd();
  const root = await mkdtemp(join(tmpdir(), "cf-auth-docs-coverage-"));
  for (const path of ["AGENTS.md", "README.md", "docs", "packages"]) {
    await cp(join(sourceRoot, path), join(root, path), { recursive: true });
  }
  return root;
}

function runDocsCoverageVerifier(cwd: string) {
  const root = process.cwd();
  return spawnSync(
    process.execPath,
    [resolve(root, "scripts", "verify-docs-coverage.mjs")],
    {
      cwd,
      encoding: "utf8",
    },
  );
}
