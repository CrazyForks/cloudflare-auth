import { chmod, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

describe("release gates", () => {
  it("requires deploy button evidence when packages enter public beta", async () => {
    const root = await releaseGateFixture({ deployButtonEvidence: false });
    const result = runReleaseGates(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("docs/deploy-button-evidence.json");
  });

  it("accepts beta package gates when deploy button evidence is present", async () => {
    const root = await releaseGateFixture({ deployButtonEvidence: true });
    const result = runReleaseGates(root);

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("release gates passed");
  });

  it("runs evidence verifiers instead of accepting marker-only files", async () => {
    const root = await releaseGateFixture({ deployButtonEvidence: true });
    const evidence = validDeployButtonEvidence();
    evidence.templateRepositoryUrl = "https://example.org/acme/template";
    evidence.deployButtonUrl =
      "https://deploy.workers.cloudflare.com/?url=https://example.org/acme/template";
    await writeFixtureFile(
      root,
      "docs/deploy-button-evidence.json",
      JSON.stringify(evidence, null, 2),
    );
    const result = runReleaseGates(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "scripts/verify-deploy-button-evidence.mjs",
    );
    expect(result.stderr).toContain("GitHub or GitLab repository URL");
  });

  it("runs package-name registry checks for release packages", async () => {
    const root = await releaseGateFixture({ deployButtonEvidence: true });
    await writeFakeNpm(
      root,
      `const args = process.argv.slice(2);
const spec = args[1] ?? "";
if (spec === "@cf-auth/cli@0.1.0-beta.0") {
  console.log(JSON.stringify("0.1.0-beta.0"));
  process.exit(0);
}
console.error("npm error code E404");
process.exit(1);
`,
    );
    const result = runReleaseGates(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("scripts/check-package-names.mjs");
    expect(result.stderr).toContain(
      "@cf-auth/cli@0.1.0-beta.0: target version already exists on npm",
    );
  });

  it("requires stable release artifacts when packages enter 1.0", async () => {
    const root = await releaseGateFixture({
      deployButtonEvidence: true,
      packageVersion: "1.0.0",
      stableEvidence: false,
    });
    const result = runReleaseGates(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("docs/beta-evidence.json");
    expect(result.stderr).toContain("docs/api-report.md");
    expect(result.stderr).toContain("docs/config-schema.md");
    expect(result.stderr).toContain("docs/decisions/security-review.md");
    expect(result.stderr).toContain("docs/security-release-tracker.json");
    expect(result.stderr).toContain(
      "tests/fixtures/upgrade/beta-schema-versions.json",
    );
  });

  it("requires alpha evidence when packages enter 1.0", async () => {
    const root = await releaseGateFixture({
      alphaEvidence: false,
      deployButtonEvidence: true,
      packageVersion: "1.0.0",
      stableEvidence: true,
    });
    const result = runReleaseGates(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("docs/alpha-evidence.json");
  });

  it("accepts stable release gates when 1.0 artifacts are present", async () => {
    const root = await releaseGateFixture({
      deployButtonEvidence: true,
      packageVersion: "1.0.0",
      stableEvidence: true,
    });
    const result = runReleaseGates(root);

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      "stable gates checked for @cf-auth/cli@1.0.0",
    );
  });
});

interface ReleaseGateFixtureOptions {
  alphaEvidence?: boolean;
  deployButtonEvidence: boolean;
  packageVersion?: string;
  stableEvidence?: boolean;
}

async function releaseGateFixture(options: ReleaseGateFixtureOptions) {
  const root = await mkdtemp(join(tmpdir(), "cf-auth-release-gates-"));
  await writeFakeNpm(root);

  const requiredFiles = [
    ".github/dependabot.yml",
    ".github/workflows/ci.yml",
    ".github/workflows/codeql.yml",
    ".github/workflows/cloudflare-production-smoke.yml",
    ".github/workflows/dependency-review.yml",
    ".github/workflows/examples.yml",
    ".github/workflows/published-quickstart-smoke.yml",
    ".github/workflows/release.yml",
    ".github/workflows/wrangler-dev-smoke.yml",
    ".github/ISSUE_TEMPLATE/alpha-feedback.yml",
    ".github/ISSUE_TEMPLATE/bug.yml",
    ".github/ISSUE_TEMPLATE/feature-request.yml",
    ".github/ISSUE_TEMPLATE/security-contact.md",
    "docs/alpha-evidence.example.json",
    "docs/alpha.md",
    "docs/beta-evidence.example.json",
    "docs/deploy-button-evidence.example.json",
    "docs/deploy-to-cloudflare.md",
    "docs/known-limitations.md",
    "docs/package-ownership.example.json",
    "docs/public-beta.md",
    "docs/security-release-tracker.example.json",
    "schemas/doctor-report.schema.json",
    "scripts/export-deploy-template.mjs",
    "scripts/check-package-names.mjs",
    "scripts/verify-alpha-evidence.mjs",
    "scripts/verify-beta-evidence.mjs",
    "scripts/verify-deploy-button-evidence.mjs",
    "scripts/verify-deploy-template.mjs",
    "scripts/verify-docs-coverage.mjs",
    "scripts/verify-package-ownership.mjs",
    "scripts/verify-security-docs.mjs",
    "scripts/verify-security-release-tracker.mjs",
  ];

  const requiredText = new Map<string, string[]>([
    ["README.md", ["SECURITY.md", "docs/known-limitations.md"]],
    [
      "SECURITY.md",
      ["Expected Response Window", "secret scanning", "advisory evidence only"],
    ],
    [
      "docs/release-checklist.md",
      [
        "unresolved high/critical",
        "public API report reviewed",
        "config schema reviewed",
        "security review decision",
        "pnpm verify:security-docs",
        "opt-in Wrangler dev smoke workflow passes",
      ],
    ],
    [
      ".github/workflows/dependency-review.yml",
      ["actions/dependency-review-action"],
    ],
    [".github/workflows/codeql.yml", ["javascript-typescript"]],
    [
      ".github/dependabot.yml",
      ["package-ecosystem: npm", "package-ecosystem: github-actions"],
    ],
    [".github/ISSUE_TEMPLATE/alpha-feedback.yml", ["doctor --report"]],
    [
      "docs/alpha.md",
      [
        "CF_AUTH_REQUIRE_ALPHA_EVIDENCE=1 pnpm verify:alpha-evidence",
        "doctor --report",
      ],
    ],
    [
      "docs/decisions/package-naming.md",
      ["CF_AUTH_REQUIRE_PACKAGE_OWNERSHIP=1 pnpm verify:package-ownership"],
    ],
    [
      "docs/alpha-evidence.example.json",
      [
        '"commands"',
        "cf-auth init",
        "cf-auth migrate --local",
        "pnpm install",
        "npm run dev",
        '"doctorReportSchemaValid"',
        '"doctorReportRedactionChecked"',
      ],
    ],
    [
      "docs/deploy-to-cloudflare.md",
      [
        "Deploy to Cloudflare button is a public-beta gate",
        "CF_AUTH_REQUIRE_DEPLOY_BUTTON_EVIDENCE=1 pnpm verify:deploy-button-evidence",
      ],
    ],
    [
      "docs/public-beta.md",
      [
        "CF_AUTH_REQUIRE_BETA_EVIDENCE=1 pnpm verify:beta-evidence",
        "docs/known-limitations.md",
        "pnpm verify:beta-evidence",
        "pnpm verify:deploy-button-evidence",
        "pnpm verify:package-ownership",
        ".github/workflows/published-quickstart-smoke.yml",
        ".github/workflows/cloudflare-production-smoke.yml",
      ],
    ],
    [
      "docs/beta-evidence.example.json",
      [
        '"cleanDirectory"',
        '"documentedCommandsOnly"',
        '"optInCloudflareAccountFixture"',
        '"commands"',
        "/auth/logout",
      ],
    ],
    [
      "docs/deploy-button-evidence.example.json",
      [
        "/auth/logout",
        '"starterTemplateCreated"',
        '"documentedPathFollowed"',
        '"packageTag"',
      ],
    ],
    [".github/workflows/wrangler-dev-smoke.yml", ["pnpm smoke:wrangler-dev"]],
    [
      ".github/workflows/release.yml",
      [
        "package_names_confirmed",
        "pnpm install --frozen-lockfile",
        "pnpm package:check",
        "pnpm release:gates",
        "pnpm changeset publish --provenance",
      ],
    ],
  ]);

  for (const file of new Set([...requiredFiles, ...requiredText.keys()])) {
    await writeFixtureFile(
      root,
      file,
      requiredText.get(file)?.join("\n") ?? "",
    );
  }

  const packageVersion = options.packageVersion ?? "0.1.0-beta.0";
  await writePackage(root, packageVersion);
  await writeFixtureFile(
    root,
    "docs/package-ownership.json",
    JSON.stringify(validPackageEvidence(packageVersion), null, 2),
  );
  if (options.alphaEvidence ?? true) {
    await writeFixtureFile(
      root,
      "docs/alpha-evidence.json",
      JSON.stringify(validAlphaEvidence(), null, 2),
    );
  }
  if (options.deployButtonEvidence) {
    await writeFixtureFile(
      root,
      "docs/deploy-button-evidence.json",
      JSON.stringify(validDeployButtonEvidence(), null, 2),
    );
  }
  if (options.stableEvidence) {
    await writeStableEvidence(root);
  }

  return root;
}

async function writePackage(root: string, version: string) {
  const packageDir = join(root, "packages", "cli");
  await mkdir(packageDir, { recursive: true });
  await writeFile(
    join(packageDir, "package.json"),
    `${JSON.stringify({
      name: "@cf-auth/cli",
      version,
    })}\n`,
  );
  await writeFile(join(packageDir, "CHANGELOG.md"), `${version}\n`);
}

async function writeStableEvidence(root: string) {
  await writeFixtureFile(
    root,
    "docs/beta-evidence.json",
    JSON.stringify(validBetaEvidence(), null, 2),
  );
  await writeFixtureFile(
    root,
    "docs/api-report.md",
    "Release approval: release-approved by maintainer on 2026-05-14\n",
  );
  await writeFixtureFile(
    root,
    "docs/config-schema.md",
    "Release approval: release-approved by maintainer on 2026-05-14\n",
  );
  await writeFixtureFile(
    root,
    "docs/decisions/security-review.md",
    "Status: maintainer-signoff\n",
  );
  await writeFixtureFile(
    root,
    "docs/security-release-tracker.json",
    JSON.stringify(validSecurityTracker(), null, 2),
  );
  await writeFixtureFile(
    root,
    "tests/fixtures/upgrade/beta-schema-versions.json",
    '{"betaVersions": [{"version": "1.0.0-beta.0"}]}\n',
  );
  await writeFixtureFile(root, "tests/upgrade.test.ts", "upgrade tests\n");
}

async function writeFakeNpm(
  root: string,
  body = `console.error("npm error code E404");
process.exit(1);
`,
) {
  const npmPath = join(root, "bin", "npm");
  await mkdir(dirname(npmPath), { recursive: true });
  await writeFile(npmPath, `#!/usr/bin/env node\n${body}`);
  await chmod(npmPath, 0o755);
}

function validPackageEvidence(version: string) {
  return {
    schemaVersion: 1,
    verifiedAt: "2026-05-14T00:00:00.000Z",
    verifiedBy: "release-reviewer",
    packages: [
      {
        name: "@cf-auth/cli",
        registry: "https://registry.npmjs.org/",
        version,
        ownershipConfirmed: true,
        publisherTwoFactorEnabled: true,
        provenancePublish: true,
      },
    ],
    reservedPackages: [],
  };
}

function validAlphaEvidence() {
  return {
    schemaVersion: 1,
    localSetups: Array.from({ length: 5 }, (_, index) => ({
      user: `alpha-user-${index + 1}`,
      completedAt: "2026-05-14T00:00:00.000Z",
      setupMinutes: 8,
      commands: [
        "npx --package @cf-auth/cli@alpha cf-auth init my-app --template hono-basic",
        "pnpm install",
        "npx --package @cf-auth/cli@alpha cf-auth migrate --local",
        "npm run dev",
      ],
      cleanDirectory: true,
      documentedCommandsOnly: true,
      signupLoginVerified: true,
    })),
    productionDeploys: Array.from({ length: 3 }, (_, index) => ({
      user: `alpha-user-${index + 1}`,
      completedAt: "2026-05-14T00:00:00.000Z",
      commands: [
        "npx --package @cf-auth/cli@alpha cf-auth doctor --report --env production",
        "npx --package @cf-auth/cli@alpha cf-auth migrate --remote --env production",
        "npx --package @cf-auth/cli@alpha cf-auth deploy --env production",
      ],
      doctorReportAttached: true,
      doctorReportSchemaValid: true,
      doctorReportRedactionChecked: true,
      doctorPassed: true,
      migratePassed: true,
      deployPassed: true,
      signupLoginVerified: true,
    })),
    failures: [],
  };
}

function validDeployButtonEvidence() {
  return {
    schemaVersion: 1,
    status: "verified",
    verifiedAt: "2026-05-14T00:00:00.000Z",
    verifiedBy: "release-reviewer",
    templateRepositoryUrl: "https://github.com/acme/cloudflare-auth-template",
    deployButtonUrl:
      "https://deploy.workers.cloudflare.com/?url=https://github.com/acme/cloudflare-auth-template",
    packageTag: "beta",
    deployedOrigin: "https://auth.acme.test",
    starterTemplateCreated: true,
    templateRepositoryPublic: true,
    templateHasNoWorkspaceDependencies: true,
    d1BindingConfigured: true,
    migrationsApplied: true,
    authSecretConfigured: true,
    publicOriginConfigured: true,
    documentedPathFollowed: true,
    signupLoginSmokePassed: true,
    smokedEndpoints: [
      "/auth/signup",
      "/auth/login",
      "/auth/logout",
      "/auth/user",
    ],
  };
}

function validBetaEvidence() {
  return {
    schemaVersion: 1,
    reviewedAt: "2026-05-14T00:00:00.000Z",
    reviewedBy: "release-reviewer",
    publishedQuickstart: {
      workflowRunUrl:
        "https://github.com/acme/cloudflare-auth/actions/runs/123",
      packageTag: "beta",
      passed: true,
      cleanDirectory: true,
      documentedCommandsOnly: true,
      noWorkspaceDependencies: true,
      signupLoginVerified: true,
    },
    manualQuickstart: {
      maintainer: "release-reviewer",
      completedAt: "2026-05-14T00:00:00.000Z",
      packageTag: "beta",
      cleanDirectory: true,
      documentedCommandsOnly: true,
      signupLoginVerified: true,
    },
    productionSmoke: {
      workflowRunUrl:
        "https://github.com/acme/cloudflare-auth/actions/runs/124",
      packageTag: "beta",
      origin: "https://auth.acme.test",
      passed: true,
      documentedProductionPath: true,
      optInCloudflareAccountFixture: true,
      commands: [
        "npx --package @cf-auth/cli@beta cf-auth doctor --env production",
        "npx --package @cf-auth/cli@beta cf-auth migrate --remote --env production",
        "npx --package @cf-auth/cli@beta cf-auth deploy --env production",
      ],
      smokedEndpoints: [
        "/auth/signup",
        "/auth/login",
        "/auth/logout",
        "/auth/user",
      ],
    },
    deployButton: {
      evidencePath: "docs/deploy-button-evidence.json",
      verified: true,
      evidenceVerifierPassed: true,
    },
  };
}

function validSecurityTracker() {
  return {
    schemaVersion: 1,
    reviewedAt: "2026-05-14T00:00:00.000Z",
    reviewedBy: "release-reviewer",
    issueSearchUrl:
      "https://github.com/acme/cloudflare-auth/issues?q=is%3Aissue%20is%3Aopen%20label%3Aauth%20label%3Ahigh%2Ccritical",
    advisorySearchUrl:
      "https://github.com/acme/cloudflare-auth/security/advisories",
    openHighCriticalAuthSecurityIssues: [],
    advisories: [
      {
        id: "GHSA-abcd-1234-5678",
        severity: "high",
        status: "resolved",
      },
    ],
  };
}

async function writeFixtureFile(root: string, path: string, content: string) {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${content}\n`);
}

function runReleaseGates(cwd: string) {
  const root = process.cwd();
  return spawnSync(
    process.execPath,
    [resolve(root, "scripts", "release-gates.mjs")],
    {
      cwd,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${join(cwd, "bin")}${delimiter}${process.env.PATH ?? ""}`,
      },
    },
  );
}
