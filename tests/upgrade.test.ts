import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

interface UpgradeManifest {
  schemaVersion: 1;
  betaVersions: Array<{
    version: string;
    schemaVersion: number;
    fixture: string;
  }>;
}

describe("upgrade fixtures", () => {
  it("requires beta schema fixtures before stable 1.0 packages", async () => {
    const manifest = await readUpgradeManifest();
    const stablePackages = await stableOneOrLaterPackages();

    if (stablePackages.length > 0) {
      expect(
        manifest.betaVersions.length,
        `stable packages require beta schema upgrade fixtures: ${stablePackages.join(", ")}`,
      ).toBeGreaterThan(0);
    }
  });

  it("keeps every beta schema fixture addressable", async () => {
    const manifest = await readUpgradeManifest();
    for (const beta of manifest.betaVersions) {
      expect(beta.version).toMatch(/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/);
      expect(Number.isSafeInteger(beta.schemaVersion)).toBe(true);
      expect(beta.schemaVersion).toBeGreaterThan(0);
      const fixtureDir = join("tests", "fixtures", "upgrade", beta.fixture);
      const files = await readdir(fixtureDir);
      expect(files).toContain("schema.sql");
      expect(files).toContain("expected.json");
    }
  });
});

async function readUpgradeManifest(): Promise<UpgradeManifest> {
  const manifest = JSON.parse(
    await readFile(
      join("tests", "fixtures", "upgrade", "beta-schema-versions.json"),
      "utf8",
    ),
  ) as UpgradeManifest;
  expect(manifest.schemaVersion).toBe(1);
  expect(Array.isArray(manifest.betaVersions)).toBe(true);
  return manifest;
}

async function stableOneOrLaterPackages(): Promise<string[]> {
  const packageRoot = "packages";
  const dirs = await readdir(packageRoot, { withFileTypes: true });
  const stable: string[] = [];
  for (const entry of dirs) {
    if (!entry.isDirectory()) continue;
    const pkg = JSON.parse(
      await readFile(join(packageRoot, entry.name, "package.json"), "utf8"),
    ) as { name?: string; private?: boolean; version?: string };
    if (!pkg.private && isStableOneOrLater(pkg.version)) {
      stable.push(`${pkg.name ?? entry.name}@${pkg.version}`);
    }
  }
  return stable.sort();
}

function isStableOneOrLater(version: string | undefined): boolean {
  if (typeof version !== "string") return false;
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-.+)?$/);
  if (!match || version.includes("-")) return false;
  return Number(match[1]) >= 1;
}
