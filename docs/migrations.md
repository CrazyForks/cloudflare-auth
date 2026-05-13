# Migrations

Migrations are append-only SQL files in `migrations/`.

Run locally:

```bash
npx cf-auth@latest migrate --local
```

Run remotely:

```bash
npx cf-auth@latest migrate --remote --env production
```

Every migration updates `auth_schema_migrations` and `auth_meta.schema_version`. Future table rewrites that need temporary foreign-key deferral must use `PRAGMA defer_foreign_keys = on`.
