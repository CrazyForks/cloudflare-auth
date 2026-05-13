import { readFile, readdir } from "node:fs/promises";

const files = (await readdir("migrations"))
  .filter((file) => file.endsWith(".sql"))
  .sort();
const failures = [];

for (const file of files) {
  const sql = await readFile(`migrations/${file}`, "utf8");
  if (/\bBEGIN\b|\bCOMMIT\b/i.test(sql))
    failures.push(`${file}: migrations must not include BEGIN/COMMIT`);
  const version = file.slice(0, 4);
  if (!sql.includes("auth_schema_migrations"))
    failures.push(`${file}: missing auth_schema_migrations update`);
  if (file !== "0001_initial.sql" && !sql.includes("auth_meta"))
    failures.push(`${file}: missing auth_meta update`);
  if (!file.startsWith(version))
    failures.push(`${file}: invalid version prefix`);
}

if (!files.includes("0001_initial.sql"))
  failures.push("missing 0001_initial.sql");
if (!files.includes("0002_indexes.sql"))
  failures.push("missing 0002_indexes.sql");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
