# CLI Reference

The `cf-auth` binary is the supported entrypoint. Before unscoped package
publication, use `npx --package @cf-auth/cli@latest cf-auth ...` as the
fallback.

## Scaffold

```bash
npx cf-auth@latest init my-app --template hono-basic
npx cf-auth@latest init --dry-run
```

`init` writes a runnable Worker auth app or prints route snippets in dry-run
mode. Generated projects keep local and production Wrangler environments
separate.

## Migrations

```bash
npx cf-auth@latest migrate --local
npx cf-auth@latest migrate --status --local
npx cf-auth@latest migrate --remote --env production
npx cf-auth@latest migrate --status --remote --env production
```

Remote migrations require `--env` when the Wrangler config has named
environments.

## Doctor And Deploy

```bash
npx cf-auth@latest doctor
npx cf-auth@latest doctor --report --env production
npx cf-auth@latest doctor --report --env production --output auth-doctor-report.json
npx cf-auth@latest deploy --dry-run --env production
npx cf-auth@latest deploy --migrate --env production
npx cf-auth@latest deploy --env production
```

`doctor --report` emits redaction-safe JSON matching
`schemas/doctor-report.schema.json`. `deploy` always runs `doctor` first.

## Generate Snippets

```bash
npx cf-auth@latest generate hono
npx cf-auth@latest generate worker-snippet
npx cf-auth@latest generate react-client
npx cf-auth@latest generate types
```

`generate` prints small copyable snippets and does not edit source files.

## Secrets

```bash
npx cf-auth@latest rotate-secret --print
npx cf-auth@latest rotate-secret --apply --env production
npx cf-auth@latest rotate-secret --apply --previous-from-stdin --env production
npx cf-auth@latest rotate-secret --apply --previous-from-env AUTH_SECRET_OLD --env production
```

Do not pass old raw secrets as command-line arguments. Use stdin or an
environment variable so shell history does not capture the value.

## Cleanup

```bash
npx cf-auth@latest clean --local
npx cf-auth@latest clean --dry-run --remote --env production
npx cf-auth@latest clean --remote --env production
```

Cleanup removes expired sessions, expired or used verification tokens, expired
rate-limit rows, and old auth events using the documented retention windows.

## Recovery Helpers

```bash
npx cf-auth@latest users disable person@example.com --remote --env production
npx cf-auth@latest users enable usr_... --remote --env production
npx cf-auth@latest sessions list --user person@example.com --remote --env production
npx cf-auth@latest sessions revoke --user usr_... --remote --env production
```

Recovery helpers redact SQL output and never print tokens, token hashes,
cookies, raw IPs, or raw user agents. Add `--dry-run` to mutating commands
before executing production changes.
