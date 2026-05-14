# Existing Hono App

Run:

```bash
npx --package @cf-auth/cli@latest cf-auth init
pnpm install
npx --package @cf-auth/cli@latest cf-auth migrate --local
```

Mount once:

```ts
import { createAuthRoutes } from "@cf-auth/hono";
import authConfig from "./auth.config.js";

app.route(authConfig.basePath, createAuthRoutes(authConfig));
```

When `src/index.ts` already exists, `init` leaves it unchanged and prints the
mount snippet. It does update `package.json` with missing Cloudflare Auth
dependencies.

Do not mount a router that defines `/auth` internally. `createAuthRoutes()` defines relative routes so the result is `/auth/signup`, not `/auth/auth/signup`.
