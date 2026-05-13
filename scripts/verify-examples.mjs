import { spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

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

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
