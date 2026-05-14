import { spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

type PackageInfo = {
  name: string;
  version: string;
};

type OwnershipEvidence = {
  registry?: unknown;
  registryVersion?: unknown;
  ownershipConfirmed?: unknown;
  publisherTwoFactorEnabled?: unknown;
  provenancePublish?: unknown;
  publishableAfterOwnershipConfirmed?: unknown;
};

const evidencePath =
  process.env.CF_AUTH_PACKAGE_OWNERSHIP_PATH ?? "docs/package-ownership.json";
const registry = "https://registry.npmjs.org/";
const packages = await publishablePackages();
const reservedPackages = await privateReservedPackages();
const failures: string[] = [];

const { packageEvidenceByName, reservedEvidenceByName } =
  await readOwnershipEvidence();

for (const pkg of packages) {
  const evidence = packageEvidenceByName.get(pkg.name);
  if (!evidence) {
    failures.push(
      `${evidencePath}: missing ownership evidence for ${pkg.name}`,
    );
    continue;
  }
  if (evidence.registry !== registry) {
    failures.push(`${evidencePath}: ${pkg.name} registry must be ${registry}`);
  }
  for (const field of [
    "ownershipConfirmed",
    "publisherTwoFactorEnabled",
    "provenancePublish",
  ] as const) {
    if (evidence[field] !== true) {
      failures.push(`${evidencePath}: ${pkg.name} ${field} must be true`);
    }
  }
  if (pkg.version === "0.0.0") {
    failures.push(
      `${pkg.name}: release workflow must not publish placeholder version 0.0.0`,
    );
  }
}
for (const pkg of reservedPackages) {
  if (packageEvidenceByName.has(pkg.name)) {
    failures.push(
      `${evidencePath}: ${pkg.name} must be listed under reservedPackages while its workspace package is private`,
    );
  }
  const evidence = reservedEvidenceByName.get(pkg.name);
  if (!evidence) {
    failures.push(
      `${evidencePath}: missing reserved package evidence for ${pkg.name}`,
    );
    continue;
  }
  if (evidence.registry !== registry) {
    failures.push(`${evidencePath}: ${pkg.name} registry must be ${registry}`);
  }
  if (evidence.publishableAfterOwnershipConfirmed !== true) {
    failures.push(
      `${evidencePath}: ${pkg.name} publishableAfterOwnershipConfirmed must be true`,
    );
  }
}

if (failures.length > 0) fail();

for (const pkg of packages) {
  const evidence = packageEvidenceByName.get(pkg.name);
  if (!evidence) continue;

  const nameLookup = npmView([pkg.name, "name", "version"]);
  if (nameLookup.kind === "found") {
    const value = parseJson(nameLookup.stdout, `${pkg.name}: npm view result`);
    const registryName =
      typeof value === "object" && value !== null && "name" in value
        ? (value as { name?: unknown }).name
        : undefined;
    const registryVersion =
      typeof value === "object" && value !== null && "version" in value
        ? (value as { version?: unknown }).version
        : undefined;
    if (registryName !== pkg.name) {
      failures.push(
        `${pkg.name}: npm registry returned mismatched name ${String(
          registryName,
        )}`,
      );
    }
    if (typeof evidence.registryVersion !== "string") {
      failures.push(
        `${evidencePath}: ${pkg.name} already exists on npm; registryVersion must record the current published version`,
      );
    } else if (evidence.registryVersion !== registryVersion) {
      failures.push(
        `${evidencePath}: ${pkg.name} registryVersion must match current npm version ${String(
          registryVersion,
        )}`,
      );
    }
  } else if (nameLookup.kind === "error") {
    failures.push(`${pkg.name}: ${nameLookup.message}`);
  }

  const versionLookup = npmView([`${pkg.name}@${pkg.version}`, "version"]);
  if (versionLookup.kind === "found") {
    failures.push(
      `${pkg.name}@${pkg.version}: target version already exists on npm`,
    );
  } else if (versionLookup.kind === "error") {
    failures.push(`${pkg.name}@${pkg.version}: ${versionLookup.message}`);
  }
}
for (const pkg of reservedPackages) {
  const evidence = reservedEvidenceByName.get(pkg.name);
  if (!evidence) continue;

  const nameLookup = npmView([pkg.name, "name", "version"]);
  if (nameLookup.kind === "found") {
    const value = parseJson(nameLookup.stdout, `${pkg.name}: npm view result`);
    const registryName =
      typeof value === "object" && value !== null && "name" in value
        ? (value as { name?: unknown }).name
        : undefined;
    const registryVersion =
      typeof value === "object" && value !== null && "version" in value
        ? (value as { version?: unknown }).version
        : undefined;
    if (registryName !== pkg.name) {
      failures.push(
        `${pkg.name}: npm registry returned mismatched name ${String(
          registryName,
        )}`,
      );
    }
    if (typeof evidence.registryVersion !== "string") {
      failures.push(
        `${evidencePath}: ${pkg.name} already exists on npm; reservedPackages registryVersion must record the current published version`,
      );
    } else if (evidence.registryVersion !== registryVersion) {
      failures.push(
        `${evidencePath}: ${pkg.name} reservedPackages registryVersion must match current npm version ${String(
          registryVersion,
        )}`,
      );
    }
  } else if (nameLookup.kind === "error") {
    failures.push(`${pkg.name}: ${nameLookup.message}`);
  }
}

if (failures.length > 0) fail();

console.log(
  `package names checked against npm registry: ${packages
    .map((pkg) => `${pkg.name}@${pkg.version}`)
    .join(", ")}`,
);

async function readOwnershipEvidence() {
  let text = "";
  try {
    text = await readFile(evidencePath, "utf8");
  } catch {
    failures.push(
      `${evidencePath}: package ownership evidence is required before publishing`,
    );
    fail();
  }

  const parsed = parseJson(text, evidencePath) as {
    packages?: unknown;
    reservedPackages?: unknown;
  };
  const packageEvidence = Array.isArray(parsed.packages) ? parsed.packages : [];
  const reservedEvidence = Array.isArray(parsed.reservedPackages)
    ? parsed.reservedPackages
    : [];
  const packageEvidenceByName = new Map<string, OwnershipEvidence>();
  for (const item of packageEvidence) {
    if (
      item &&
      typeof item === "object" &&
      "name" in item &&
      typeof (item as { name?: unknown }).name === "string"
    ) {
      packageEvidenceByName.set(
        (item as { name: string }).name,
        item as OwnershipEvidence,
      );
    }
  }
  const reservedEvidenceByName = new Map<string, OwnershipEvidence>();
  for (const item of reservedEvidence) {
    if (
      item &&
      typeof item === "object" &&
      "name" in item &&
      typeof (item as { name?: unknown }).name === "string"
    ) {
      reservedEvidenceByName.set(
        (item as { name: string }).name,
        item as OwnershipEvidence,
      );
    }
  }
  return { packageEvidenceByName, reservedEvidenceByName };
}

async function publishablePackages() {
  const entries = await readdir("packages", { withFileTypes: true });
  const output: PackageInfo[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const pkg = JSON.parse(
      await readFile(join("packages", entry.name, "package.json"), "utf8"),
    ) as { name?: unknown; version?: unknown; private?: unknown };
    if (!pkg.private) {
      output.push({
        name: String(pkg.name),
        version: String(pkg.version),
      });
    }
  }
  return output.sort((a, b) => a.name.localeCompare(b.name));
}

async function privateReservedPackages() {
  const entries = await readdir("packages", { withFileTypes: true });
  const output: PackageInfo[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const pkg = JSON.parse(
      await readFile(join("packages", entry.name, "package.json"), "utf8"),
    ) as { name?: unknown; version?: unknown; private?: unknown };
    if (
      pkg.private === true &&
      (pkg.name === "cf-auth" || pkg.name === "create-cloudflare-auth")
    ) {
      output.push({
        name: String(pkg.name),
        version: String(pkg.version),
      });
    }
  }
  return output.sort((a, b) => a.name.localeCompare(b.name));
}

function npmView(args: string[]) {
  const result = spawnSync("npm", ["view", ...args, "--json"], {
    encoding: "utf8",
  });
  const output = `${result.stdout}\n${result.stderr}`.trim();
  if (result.status === 0)
    return { kind: "found" as const, stdout: result.stdout };
  if (/\bE404\b|404 Not Found|is not in this registry/u.test(output)) {
    return { kind: "not-found" as const };
  }
  return {
    kind: "error" as const,
    message: output || "npm view failed",
  };
}

function parseJson(value: string, label: string) {
  try {
    return JSON.parse(value);
  } catch {
    failures.push(`${label}: must be valid JSON`);
    fail();
  }
}

function fail(): never {
  console.error(failures.join("\n"));
  process.exit(1);
}
