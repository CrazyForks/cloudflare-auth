import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

type ReleaseReadinessAuditChecks = {
  collectReleaseReadinessAuditFailures(
    audit: string,
    options?: {
      path?: string;
      missingTextMessage?: (needle: string) => string;
      missingStageMessage?: (stage: number) => string;
      missingRuleMessage?: (rule: number) => string;
    },
  ): string[];
  requiredReleaseReadinessAuditText: string[];
};

describe("release readiness audit checks", () => {
  it("accepts an audit with required text, stage coverage, and rule coverage", async () => {
    const checks = await loadChecks();

    expect(
      checks.collectReleaseReadinessAuditFailures(completeAuditText(checks)),
    ).toEqual([]);
  });

  it("reports missing required text, stage coverage, and rule coverage", async () => {
    const checks = await loadChecks();
    const audit = completeAuditText(checks)
      .replace("Section 33.1 README", "")
      .replace("Published quickstart smoke", "")
      .replace("Stage 12", "Stable 12")
      .replace("| 28 |", "| -- |");

    expect(checks.collectReleaseReadinessAuditFailures(audit)).toEqual(
      expect.arrayContaining([
        "docs/release-readiness-audit.md: missing Section 33.1 README",
        "docs/release-readiness-audit.md: missing Published quickstart smoke",
        "docs/release-readiness-audit.md: missing Stage 12",
        "docs/release-readiness-audit.md: missing Rule 28",
      ]),
    );
  });

  it("supports caller-specific failure messages", async () => {
    const checks = await loadChecks();
    const failures = checks.collectReleaseReadinessAuditFailures("", {
      missingRuleMessage: (rule) => `rule:${rule}`,
      missingStageMessage: (stage) => `stage:${stage}`,
      missingTextMessage: (needle) => `text:${needle}`,
    });

    expect(failures).toContain("text:cloudflare_auth_implementation_plan.md");
    expect(failures).toContain("stage:0");
    expect(failures).toContain("rule:1");
  });

  it("verifies release audit files from the command line", async () => {
    const checks = await loadChecks();
    const fixture = await writeAuditFixture(completeAuditText(checks));
    const result = runReleaseAuditVerifier(fixture);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("release readiness audit verified");
  });

  it("returns nonzero for incomplete release audit files", async () => {
    const checks = await loadChecks();
    const fixture = await writeAuditFixture(
      completeAuditText(checks).replace("Stage 12", "Stable 12"),
    );
    const result = runReleaseAuditVerifier(fixture);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "docs/release-readiness-audit.md: missing Stage 12",
    );
  });
});

async function loadChecks(): Promise<ReleaseReadinessAuditChecks> {
  return (await import(
    pathToFileURL(
      resolve(process.cwd(), "scripts/release-readiness-audit-checks.mjs"),
    ).href
  )) as ReleaseReadinessAuditChecks;
}

function completeAuditText(checks: ReleaseReadinessAuditChecks) {
  return [
    ...checks.requiredReleaseReadinessAuditText,
    ...Array.from({ length: 13 }, (_, stage) => `Stage ${stage}`),
    ...Array.from({ length: 28 }, (_, index) => `| ${index + 1} |`),
  ].join("\n");
}

async function writeAuditFixture(audit: string) {
  const fixture = await mkdtemp(join(tmpdir(), "cf-auth-release-audit-"));
  await mkdir(join(fixture, "docs"));
  await writeFile(join(fixture, "docs/release-readiness-audit.md"), audit);
  return fixture;
}

function runReleaseAuditVerifier(cwd: string) {
  return spawnSync(
    process.execPath,
    [resolve(process.cwd(), "scripts/verify-release-readiness-audit.mjs")],
    {
      cwd,
      encoding: "utf8",
    },
  );
}
