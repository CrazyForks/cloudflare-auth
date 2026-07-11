import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

// @ts-expect-error -- workflow policy scripts are plain ESM without declarations.
import * as releaseWorkflowPolicy from "../scripts/release-workflow-policy.mjs";

const {
  collectActionPinFailures,
  collectProductionSmokeWorkflowFailures,
  collectReleaseWorkflowFailures,
} = releaseWorkflowPolicy;

describe("release workflow policy", () => {
  it("accepts the checked-in protected release workflows", async () => {
    const release = await readFile(".github/workflows/release.yml", "utf8");
    const smoke = await readFile(
      ".github/workflows/cloudflare-production-smoke.yml",
      "utf8",
    );

    expect(collectReleaseWorkflowFailures(release)).toEqual([]);
    expect(collectProductionSmokeWorkflowFailures(smoke)).toEqual([]);
  });

  it("does not count a commented provenance command as an executable step", async () => {
    const release = (
      await readFile(".github/workflows/release.yml", "utf8")
    ).replace(
      "      - run: pnpm changeset publish --provenance",
      "      # - run: pnpm changeset publish --provenance\n      - run: pnpm changeset publish",
    );

    expect(collectReleaseWorkflowFailures(release).join("\n")).toContain(
      "pnpm changeset publish --provenance",
    );
  });

  it("does not accept a package-name gate from a disabled decoy job", async () => {
    const release = (await readFile(".github/workflows/release.yml", "utf8"))
      .replace(
        "jobs:\n",
        `jobs:
  decoy:
    if: \${{ false }}
    runs-on: ubuntu-latest
    steps:
      - name: Require package-name gate
        if: \${{ !inputs.package_names_confirmed }}
        run: |
          exit 1
`,
      )
      .replace(
        /      - name: Require package-name gate\n        if:.*\n        run: \|\n(?:          .*\n)+?      - uses:/u,
        "      - uses:",
      );

    expect(collectReleaseWorkflowFailures(release).join("\n")).toContain(
      "package_names_confirmed must be enforced",
    );
  });

  it("requires the default-branch guard, environment, and blocking audit", async () => {
    const release = (await readFile(".github/workflows/release.yml", "utf8"))
      .replace(
        "    environment: npm-production",
        "    environment: unprotected",
      )
      .replace(
        "    if: ${{ github.ref_type == 'branch' && github.ref_name == github.event.repository.default_branch }}",
        "    if: ${{ true }}",
      )
      .replace(
        "        run: pnpm audit --audit-level high",
        "        run: pnpm audit --audit-level high\n        continue-on-error: true",
      );
    const result = collectReleaseWorkflowFailures(release).join("\n");

    expect(result).toContain("restricted to the default branch");
    expect(result).toContain("protected npm-production environment");
    expect(result).toContain("dependency audit must be blocking");
  });

  it("rejects movable action tags even when a version comment is present", () => {
    const workflow = `jobs:
  test:
    steps:
      - uses: actions/checkout@v7 # trusted-looking comment
`;

    expect(collectActionPinFailures(workflow, "fixture.yml")).toEqual([
      "fixture.yml: external action at line 4 must use a full commit SHA",
    ]);
  });

  it("checks reusable workflow jobs as well as action steps", () => {
    const workflow = `jobs:
  delegated:
    uses: owner/repository/.github/workflows/reusable.yml@main
`;

    expect(
      collectActionPinFailures(workflow, "fixture.yml").join("\n"),
    ).toContain("must use a full commit SHA");
  });

  it("does not accept disabled or non-blocking required command steps", async () => {
    const release = (
      await readFile(".github/workflows/release.yml", "utf8")
    ).replace(
      "        run: pnpm audit --audit-level high",
      "        run: pnpm audit --audit-level high\n        if: ${{ false }}\n        continue-on-error: ${{ true }}",
    );

    expect(collectReleaseWorkflowFailures(release).join("\n")).toContain(
      "pnpm audit --audit-level high must run unconditionally and block failures",
    );
  });
});
