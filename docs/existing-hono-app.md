# Existing Hono App

Run:

```bash
npx cf-auth@latest init
npx cf-auth@latest migrate --local
```

Fallback before `cf-auth` publication:

```bash
npx --package @cf-auth/cli@latest cf-auth init
```

Mount once:

```ts
app.route(authConfig.basePath, createAuthRoutes(authConfig));
```

Do not mount a router that defines `/auth` internally. `createAuthRoutes()` defines relative routes so the result is `/auth/signup`, not `/auth/auth/signup`.
