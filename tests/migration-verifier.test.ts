import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

describe("migration verifier", () => {
  it("rejects table rewrites without deferred foreign keys", async () => {
    const root = await migrationFixture({
      secondMigration: migrationSql({
        body: "ALTER TABLE sessions RENAME TO sessions_old;\nDROP TABLE sessions_old;",
      }),
    });
    const result = runMigrationVerifier(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("PRAGMA defer_foreign_keys = on");
  });

  it("accepts table rewrites with deferred foreign keys", async () => {
    const root = await migrationFixture({
      secondMigration: migrationSql({
        body: "PRAGMA defer_foreign_keys = on;\nALTER TABLE sessions RENAME TO sessions_old;\nDROP TABLE sessions_old;",
      }),
    });
    const result = runMigrationVerifier(root);

    expect(result.status).toBe(0);
  });

  it("rejects migrations that disable foreign keys", async () => {
    const root = await migrationFixture({
      secondMigration: migrationSql({
        body: "PRAGMA foreign_keys = off;",
      }),
    });
    const result = runMigrationVerifier(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("must not disable foreign key enforcement");
  });
});

async function migrationFixture(options: { secondMigration: string }) {
  const root = await mkdtemp(join(tmpdir(), "cf-auth-migrations-"));
  await mkdir(join(root, "migrations"), { recursive: true });
  await writeFile(
    join(root, "migrations", "0001_initial.sql"),
    migrationSql({
      body: "CREATE TABLE auth_schema_migrations (version TEXT PRIMARY KEY);\nCREATE TABLE auth_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);",
      version: "0001",
      name: "initial",
      includeAuthMeta: false,
    }),
  );
  await writeFile(
    join(root, "migrations", "0002_indexes.sql"),
    options.secondMigration,
  );
  return root;
}

function migrationSql(options: {
  body: string;
  version?: string;
  name?: string;
  includeAuthMeta?: boolean;
}) {
  const version = options.version ?? "0002";
  const name = options.name ?? "indexes";
  return [
    options.body,
    `INSERT INTO auth_schema_migrations (version, name, applied_at) VALUES ('${version}', '${name}', 0);`,
    options.includeAuthMeta === false
      ? ""
      : "UPDATE auth_meta SET value = '2' WHERE key = 'schema_version';",
  ]
    .filter(Boolean)
    .join("\n");
}

function runMigrationVerifier(cwd: string) {
  const root = process.cwd();
  return spawnSync(
    process.execPath,
    [resolve(root, "scripts", "verify-migrations.mjs")],
    {
      cwd,
      encoding: "utf8",
      env: process.env,
    },
  );
}
