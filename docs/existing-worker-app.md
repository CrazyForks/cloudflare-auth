# Existing Plain Worker App

Run:

```bash
npx cf-auth@latest init
npx cf-auth@latest migrate --local
```

Then wrap your fetch handler:

```ts
const authHandler = createAuthHandler(authConfig);

export default {
  async fetch(request, env, ctx) {
    const authResponse = await authHandler.fetch(request, env, ctx);
    if (authResponse) return authResponse;
    return new Response("Not found", { status: 404 });
  },
};
```
