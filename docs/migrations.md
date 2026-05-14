# Migrations

Migrations are append-only SQL files in `migrations/`.

Run locally:

```bash
npx --package @cf-auth/cli@latest cf-auth migrate --local
npx --package @cf-auth/cli@latest cf-auth migrate --status --local
```

Run remotely:

```bash
npx --package @cf-auth/cli@latest cf-auth migrate --remote --env production
npx --package @cf-auth/cli@latest cf-auth migrate --status --remote --env production
```

Every migration updates `auth_schema_migrations` and `auth_meta.schema_version`. Future table rewrites that need temporary foreign-key deferral must use `PRAGMA defer_foreign_keys = on`.

## Scheduled Cleanup

Auth rows use millisecond timestamps. Run cleanup from a Cron Trigger,
maintenance Worker, or controlled D1 execute job after you have observability in
place. A scheduled Worker can use the same default retention windows as
`cf-auth clean`: one day for expired rate-limit rows, seven days for expired or
closed sessions and tokens, and 90 days for operational events.

```ts
interface Env {
  AUTH_DB: D1Database;
}

export default {
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ) {
    const day = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const sevenDaysAgo = now - 7 * day;

    ctx.waitUntil(
      env.AUTH_DB.batch([
        env.AUTH_DB.prepare(
          "DELETE FROM sessions WHERE expires_at < ? OR (revoked_at IS NOT NULL AND revoked_at < ?)",
        ).bind(sevenDaysAgo, sevenDaysAgo),
        env.AUTH_DB.prepare(
          "DELETE FROM verification_tokens WHERE expires_at < ? OR (used_at IS NOT NULL AND used_at < ?) OR (revoked_at IS NOT NULL AND revoked_at < ?)",
        ).bind(sevenDaysAgo, sevenDaysAgo, sevenDaysAgo),
        env.AUTH_DB.prepare("DELETE FROM rate_limits WHERE reset_at < ?").bind(
          now - day,
        ),
        env.AUTH_DB.prepare(
          "DELETE FROM auth_events WHERE created_at < ?",
        ).bind(now - 90 * day),
      ]),
    );
  },
};
```

Keep `auth_events` according to your product's audit-retention policy. If you do purge it, use `created_at` and a documented retention window rather than deleting all rows.

The CLI cleanup wrapper applies the default v1 retention windows:

```bash
npx --package @cf-auth/cli@latest cf-auth clean --dry-run --remote --env production
npx --package @cf-auth/cli@latest cf-auth clean --remote --env production
```
