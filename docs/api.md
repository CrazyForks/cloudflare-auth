# API

Auth routes are mounted under `basePath`, normally `/auth`.

JSON endpoints:

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/user`
- `POST /auth/magic-link/request`
- `POST /auth/magic-link/consume`
- `POST /auth/email/verify/request`
- `POST /auth/email/verify/consume`
- `POST /auth/password/reset/request`
- `POST /auth/password/reset/confirm`

Browser pages:

- `GET /auth/magic-link/verify?token=...`
- `GET /auth/email/verify?token=...`
- `GET /auth/password/reset?token=...`

Token `GET` pages parse only token shape and never consume tokens.

## Browser Client

```ts
import { createAuthClient } from "@cf-auth/client";

const auth = createAuthClient({ basePath: "/auth" });

await auth.signUp({ email, username, password });
await auth.signInWithPassword({ identifier, password });
await auth.signInWithMagicLink({ email, redirectTo: "/dashboard" });
await auth.signOut();
await auth.getUser();
await auth.requestEmailVerification({ email, redirectTo: "/dashboard" });
await auth.requestPasswordReset({ email, afterResetRedirectTo: "/login" });
await auth.resetPassword({ token, password });
```

The client sends `credentials: "include"` by default and throws `AuthClientError` with `code`, `message`, and `status`.

The release API surface is summarized in `docs/api-report.md`.
