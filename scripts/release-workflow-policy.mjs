import { parseWorkflow } from "./workflow-structure.mjs";

export const defaultBranchJobCondition =
  "${{ github.ref_type == 'branch' && github.ref_name == github.event.repository.default_branch }}";

const releaseRunOrder = [
  "pnpm install --frozen-lockfile",
  "pnpm format:check",
  "pnpm lint",
  "pnpm typecheck",
  "pnpm test",
  "pnpm test:workers",
  "pnpm build",
  "pnpm package:check",
  "pnpm version-matrix:check",
  "pnpm audit --audit-level high",
  "pnpm verify:alpha-evidence",
  "pnpm verify:deploy-button-evidence",
  "pnpm verify:beta-evidence",
  "pnpm verify:deploy-template",
  "pnpm verify:docs-coverage",
  "pnpm verify:migrations",
  "pnpm verify:examples",
  "pnpm verify:package-ownership",
  "pnpm check:package-names",
  "pnpm verify:release-audit",
  "pnpm verify:security-docs",
  "pnpm verify:security-tracker",
  "pnpm release:gates",
  "pnpm smoke:tarballs",
  "pnpm benchmark:password",
  "pnpm publish:dry-run",
  "pnpm changeset publish --provenance",
];

export function collectReleaseWorkflowFailures(
  text,
  { path = ".github/workflows/release.yml", requiredRuns = [] } = {},
) {
  const model = parseWorkflow(text);
  const failures = model.errors.map((error) => `${path}: ${error}`);
  for (const [permission, expected] of Object.entries({
    actions: "read",
    contents: "write",
    "id-token": "write",
    issues: "read",
    "security-events": "read",
  })) {
    if (model.permissions[permission] !== expected) {
      failures.push(
        `${path}: release workflow permission ${permission} must be ${expected}`,
      );
    }
  }
  const input = model.inputs.get("package_names_confirmed");
  if (
    !input ||
    input.required !== "true" ||
    input.type !== "boolean" ||
    ![undefined, "false"].includes(input.default)
  ) {
    failures.push(
      `${path}: package_names_confirmed must be a required boolean workflow input`,
    );
  }
  const job = model.jobs.get("release");
  if (!job) {
    failures.push(`${path}: missing release job`);
    return failures;
  }
  requireProtectedJob(job, path, "npm-production", failures);
  for (const candidate of model.jobs.values()) {
    if (candidate !== job) {
      requireProtectedJob(candidate, path, "npm-production", failures);
    }
  }

  const gate = job.steps.find(
    (step) => step.name === "Require package-name gate",
  );
  const checkoutIndex = job.steps.findIndex((step) =>
    String(step.uses ?? "").startsWith("actions/checkout@"),
  );
  const gateIndex = gate ? job.steps.indexOf(gate) : -1;
  if (
    !gate ||
    gate.if !== "${{ !inputs.package_names_confirmed }}" ||
    !runLines(gate).includes("exit 1") ||
    gate["continue-on-error"] === "true"
  ) {
    failures.push(
      `${path}: package_names_confirmed must be enforced by an early failing gate step`,
    );
  }
  if (gateIndex === -1 || checkoutIndex === -1 || gateIndex > checkoutIndex) {
    failures.push(`${path}: package-name gate must run before checkout`);
  }

  requireRunsInOrder(job, path, releaseRunOrder, failures);
  for (const command of new Set(requiredRuns)) {
    if (!stepForRun(job, command)) {
      failures.push(`${path}: release job must execute ${command}`);
    }
  }
  const audit = stepForRun(job, "pnpm audit --audit-level high");
  if (!audit || audit["continue-on-error"] === "true") {
    failures.push(`${path}: high-severity dependency audit must be blocking`);
  }
  const publish = stepForRun(job, "pnpm changeset publish --provenance");
  const setupNode = job.steps.find((step) =>
    String(step.uses ?? "").startsWith("actions/setup-node@"),
  );
  if (
    !setupNode ||
    setupNode.with?.["registry-url"] !== "https://registry.npmjs.org"
  ) {
    failures.push(
      `${path}: actions/setup-node must configure the npm registry URL`,
    );
  }
  const ownership = stepForRun(job, "pnpm verify:package-ownership");
  if (!ownership || ownership.env?.CF_AUTH_REQUIRE_PACKAGE_OWNERSHIP !== "1") {
    failures.push(`${path}: package ownership verification must be required`);
  }
  const publishSteps = job.steps.filter(
    (step) => normalizedRun(step.run) === "pnpm changeset publish --provenance",
  );
  const dryRunIndex = job.steps.findIndex(
    (step) => normalizedRun(step.run) === "pnpm publish:dry-run",
  );
  const firstPublishIndex = job.steps.findIndex(
    (step) => normalizedRun(step.run) === "pnpm changeset publish --provenance",
  );
  if (
    publishSteps.length !== 1 ||
    dryRunIndex === -1 ||
    firstPublishIndex < dryRunIndex
  ) {
    failures.push(
      `${path}: pnpm changeset publish --provenance must appear after pnpm publish:dry-run`,
    );
  }
  if (!publish || publish.env?.NODE_AUTH_TOKEN !== "${{ secrets.NPM_TOKEN }}") {
    failures.push(
      `${path}: provenance publish must receive NODE_AUTH_TOKEN from secrets.NPM_TOKEN`,
    );
  }
  const tarball = stepForRun(job, "pnpm smoke:tarballs");
  if (!tarball || tarball.env?.CF_AUTH_TARBALL_INSTALL !== "1") {
    failures.push(
      `${path}: pnpm smoke:tarballs must run with CF_AUTH_TARBALL_INSTALL: "1"`,
    );
  }
  const uploadIndex = job.steps.findIndex((step) =>
    String(step.uses ?? "").startsWith("actions/upload-artifact@"),
  );
  const publishIndex = job.steps.indexOf(publish);
  const upload = uploadIndex >= 0 ? job.steps[uploadIndex] : null;
  if (
    !upload ||
    upload.with?.name !== "pnpm-publish-dry-run" ||
    upload.with?.path !== "pnpm-publish-summary.json" ||
    uploadIndex > publishIndex
  ) {
    failures.push(
      `${path}: dry-run summary must be uploaded before provenance publish`,
    );
  }
  return failures;
}

export function collectProductionSmokeWorkflowFailures(
  text,
  { path = ".github/workflows/cloudflare-production-smoke.yml" } = {},
) {
  const model = parseWorkflow(text);
  const failures = model.errors.map((error) => `${path}: ${error}`);
  const input = model.inputs.get("package_tag");
  const packageTagDescription =
    "Optional beta npm dist-tag or x.y.z-beta.* prerelease version to smoke. Empty uses local package tarballs.";
  if (!input || input.required !== "false" || input.type !== "string") {
    failures.push(`${path}: package_tag must be an optional string input`);
  }
  if (input?.description !== packageTagDescription) {
    failures.push(`${path}: missing ${packageTagDescription}`);
  }
  const job = model.jobs.get("production-smoke");
  if (!job) {
    failures.push(`${path}: missing production-smoke job`);
    return failures;
  }
  requireProtectedJob(job, path, "cloudflare-production-smoke", failures);
  for (const candidate of model.jobs.values()) {
    if (candidate !== job) {
      requireProtectedJob(
        candidate,
        path,
        "cloudflare-production-smoke",
        failures,
      );
    }
  }
  requireRunsInOrder(
    job,
    path,
    [
      "pnpm install --frozen-lockfile",
      "pnpm build",
      "pnpm smoke:cloudflare-production",
    ],
    failures,
  );
  const smoke = stepForRun(job, "pnpm smoke:cloudflare-production");
  for (const [name, expected] of Object.entries({
    CF_AUTH_PRODUCTION_SMOKE: "1",
    CF_AUTH_PRODUCTION_SMOKE_PACKAGE_TAG: "${{ inputs.package_tag }}",
    CF_AUTH_PRODUCTION_SMOKE_WORKER_NAME:
      "${{ vars.CF_AUTH_PRODUCTION_SMOKE_WORKER_NAME }}",
    CF_AUTH_PRODUCTION_SMOKE_DATABASE_NAME:
      "${{ vars.CF_AUTH_PRODUCTION_SMOKE_DATABASE_NAME }}",
    CF_AUTH_PRODUCTION_SMOKE_DATABASE_ID:
      "${{ secrets.CF_AUTH_PRODUCTION_SMOKE_DATABASE_ID }}",
    CF_AUTH_PRODUCTION_SMOKE_ORIGIN:
      "${{ vars.CF_AUTH_PRODUCTION_SMOKE_ORIGIN }}",
    CLOUDFLARE_ACCOUNT_ID: "${{ secrets.CLOUDFLARE_ACCOUNT_ID }}",
    CLOUDFLARE_API_TOKEN: "${{ secrets.CLOUDFLARE_API_TOKEN }}",
  })) {
    if (!smoke || smoke.env?.[name] !== expected) {
      failures.push(`${path}: production smoke must bind ${name}`);
    }
  }
  return failures;
}

export function collectActionPinFailures(text, path) {
  const model = parseWorkflow(text);
  const failures = model.errors.map((error) => `${path}: ${error}`);
  for (const job of model.jobs.values()) {
    if (typeof job.fields.uses === "string") {
      requirePinnedAction(job.fields.uses, job.line, path, failures);
    }
    for (const step of job.steps) {
      if (typeof step.uses === "string") {
        requirePinnedAction(step.uses, step.line, path, failures);
      }
    }
  }
  return failures;
}

function requireProtectedJob(job, path, environment, failures) {
  if (job.fields.if !== defaultBranchJobCondition) {
    failures.push(
      `${path}: ${job.id} must be restricted to the default branch`,
    );
  }
  if (job.fields.environment !== environment) {
    failures.push(
      `${path}: ${job.id} must use the protected ${environment} environment`,
    );
  }
}

function requireRunsInOrder(job, path, commands, failures) {
  let previous = -1;
  let previousCommand = "";
  for (const command of commands) {
    const index = job.steps.findIndex(
      (step) => normalizedRun(step.run) === command,
    );
    if (index === -1) {
      failures.push(`${path}: missing ${command}`);
      continue;
    }
    const step = job.steps[index];
    if (
      step.if !== undefined ||
      ![undefined, "false"].includes(step["continue-on-error"])
    ) {
      failures.push(
        `${path}: ${command} must run unconditionally and block failures`,
      );
    }
    if (index < previous) {
      failures.push(`${path}: ${command} must appear after ${previousCommand}`);
      continue;
    }
    previous = index;
    previousCommand = command;
  }
}

function requirePinnedAction(value, line, path, failures) {
  if (value.startsWith("./")) return;
  const separator = value.lastIndexOf("@");
  const reference = separator >= 0 ? value.slice(separator + 1) : "";
  if (!/^[0-9a-f]{40}$/u.test(reference)) {
    failures.push(
      `${path}: external action at line ${line} must use a full commit SHA`,
    );
  }
}

function stepForRun(job, command) {
  return job.steps.find((step) => normalizedRun(step.run) === command);
}

function normalizedRun(value) {
  return typeof value === "string" ? value.trim() : "";
}

function runLines(step) {
  return normalizedRun(step.run)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
