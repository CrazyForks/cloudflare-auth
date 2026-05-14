# Quickstart

```bash
npx --package @cf-auth/cli@latest cf-auth init my-app --template hono-basic
cd my-app
pnpm install
npx --package @cf-auth/cli@latest cf-auth migrate --local
npm run dev
```

Expected local behavior:

- auth routes are mounted at `/auth`
- D1 is available locally
- terminal email prints magic-link, verification, and reset links
- local cookies use `cfauth-session`, not a `__Host-` prefix
- signup and login work without a production email provider
