import { readFile } from "node:fs/promises";

const matrix = JSON.parse(
  await readFile("scripts/version-matrix.json", "utf8"),
);
const pkg = JSON.parse(await readFile("package.json", "utf8"));
const required = {
  packageManager: `pnpm@${matrix.pnpm}`,
  typescript: matrix.typescript,
  wrangler: matrix.wrangler,
  hono: matrix.hono,
  tsup: matrix.tsup,
  vitest: matrix.vitest,
  zod: matrix.zod,
  "@changesets/cli": matrix.changesets,
};

const failures = [];
if (pkg.packageManager !== required.packageManager) {
  failures.push(`packageManager must be ${required.packageManager}`);
}

for (const [name, version] of Object.entries(required)) {
  if (name === "packageManager") continue;
  const actual = pkg.devDependencies?.[name] ?? pkg.dependencies?.[name];
  if (actual !== version)
    failures.push(
      `${name} must be pinned to ${version}; found ${actual ?? "missing"}`,
    );
}

if (pkg.engines?.node !== matrix.node)
  failures.push(`node engine must be ${matrix.node}`);
if (pkg.engines?.pnpm !== ">=11 <12")
  failures.push("pnpm engine must be >=11 <12");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
