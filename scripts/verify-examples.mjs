import { spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const rootPackage = JSON.parse(await readFile("package.json", "utf8"));
const currentVersion = rootPackage.version;
const dirs = (await readdir("examples", { withFileTypes: true })).filter(
  (entry) => entry.isDirectory(),
);
const failures = [];

for (const entry of dirs) {
  const dir = join("examples", entry.name);
  const pkg = JSON.parse(await readFile(join(dir, "package.json"), "utf8"));
  if (!pkg.scripts?.build) failures.push(`${dir}: missing build script`);
  if (!pkg.scripts?.test) failures.push(`${dir}: missing test script`);
  if (!pkg.engines || pkg.engines.node !== ">=22.12.0")
    failures.push(`${dir}: engine mismatch`);
  for (const script of ["build", "test"]) {
    const result = spawnSync("pnpm", ["--dir", dir, script], {
      stdio: "inherit",
    });
    if (result.status !== 0) failures.push(`${dir}: pnpm ${script} failed`);
  }
}

for (const root of ["examples", "templates"]) {
  const entries = (await readdir(root, { withFileTypes: true })).filter(
    (entry) => entry.isDirectory(),
  );
  for (const entry of entries) {
    const dir = join(root, entry.name);
    const pkg = JSON.parse(await readFile(join(dir, "package.json"), "utf8"));
    const rendered = renderPublishedManifest(pkg);
    for (const section of ["dependencies", "devDependencies"]) {
      for (const [name, version] of Object.entries(rendered[section] ?? {})) {
        if (String(version).startsWith("workspace:")) {
          failures.push(`${dir}: ${section}.${name} still uses ${version}`);
        }
        if (name.startsWith("@cf-auth/") && version !== currentVersion) {
          failures.push(
            `${dir}: ${section}.${name} renders ${version}, expected ${currentVersion}`,
          );
        }
      }
    }
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

function renderPublishedManifest(pkg) {
  return {
    ...pkg,
    dependencies: renderDependencySection(pkg.dependencies),
    devDependencies: renderDependencySection(pkg.devDependencies),
  };
}

function renderDependencySection(section) {
  if (!section) return undefined;
  return Object.fromEntries(
    Object.entries(section).map(([name, version]) => [
      name,
      name.startsWith("@cf-auth/") && version === "workspace:*"
        ? currentVersion
        : version,
    ]),
  );
}
