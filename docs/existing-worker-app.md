# Existing Plain Worker App

Run:

```bash
npx --package @cf-auth/cli@latest cf-auth init --template worker-basic
pnpm install
npx --package @cf-auth/cli@latest cf-auth migrate --local
```

Then wrap your fetch handler:

```ts
import { createAuthHandler } from "@cf-auth/worker";
import authConfig from "./auth.config.js";

const authHandler = createAuthHandler(authConfig);

export default {
  async fetch(request, env, ctx) {
    const authResponse = await authHandler.fetch(request, env, ctx);
    if (authResponse) return authResponse;
    return new Response("Not found", { status: 404 });
  },
};
```

Call the auth handler before broad app-level CORS, cache, or static-file
behavior. Auth responses set their own CORS and origin policy and must not be
wrapped in wildcard credentialed CORS.

When `src/index.ts` already exists, `init` leaves it unchanged and prints the
mount snippet. It does update `package.json` with missing Cloudflare Auth
dependencies.
