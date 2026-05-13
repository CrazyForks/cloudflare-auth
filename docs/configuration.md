# Configuration

`defineAuthConfig()` validates static shape, route paths, feature combinations, origins, redirects, and cookie options at module load. Runtime values such as D1 bindings, secrets, public origin from env, email bindings, and execution context are resolved per request.

Important keys:

- `basePath`: mount path, default `/auth`
- `runtime.mode`: `development`, `preview`, `production`, or `from-env`
- `runtime.publicOrigin`: exact origin or `from-env`
- `database.binding`: D1 binding name, default `AUTH_DB`
- `session.cookieName`: `auto` or explicit cookie name
- `security.allowedRequestOrigins`: request-origin allowlist
- `redirects.allowedOrigins`: post-auth redirect allowlist
- `request.maxBodyBytes`: default `16384`
- `passwordHashing.profile`: default `workers-balanced`; tests and examples may opt into `development-fast`
- `email`: use `byEnvironment(...)` to keep terminal email local and Cloudflare/custom adapters in preview and production
- `turnstile.mode`: `disabled`, `optional`, or `required`
- `turnstile.endpoints`: endpoint names that require or accept Turnstile

The stable config surface is tracked in `docs/config-schema.md`.
