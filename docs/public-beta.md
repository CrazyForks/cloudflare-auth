# Public Beta

Public beta starts only after private-alpha evidence is recorded and the package names are confirmed.

## Required Evidence

- published beta packages pass the documented quickstart from a clean directory in CI
- one maintainer completes the same quickstart manually
- one opt-in Cloudflare account fixture passes the production path:

```bash
npx --package @cf-auth/cli@beta cf-auth doctor --env production
npx --package @cf-auth/cli@beta cf-auth migrate --remote --env production
npx --package @cf-auth/cli@beta cf-auth deploy --env production
```

- the template repository is public and contains no workspace-only dependency references
- `SECURITY.md` is linked from the README and includes supported versions, reporting channel, and response window
- `docs/known-limitations.md` is linked from public docs

## Package Name Gate

Do not publish public beta docs that use unscoped package commands until those package names are controlled by maintainers. Use the scoped fallback from `docs/decisions/package-naming.md` until then.

## Template Repository

The beta template repository must be generated from `templates/hono-basic` and then verified outside the monorepo:

```bash
pnpm install
pnpm build
npx --package @cf-auth/cli@beta cf-auth migrate --local
npm run dev
```

The template must include published package versions, not `workspace:*` dependencies.
