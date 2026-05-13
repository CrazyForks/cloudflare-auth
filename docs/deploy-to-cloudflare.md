# Deploy To Cloudflare Button

The Deploy to Cloudflare button is a public-beta gate. Do not add it to the README until the template repository and smoke test are passing.

## Button Target

When the template repository is public, configure the button to deploy that repository, not the monorepo:

```md
[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OWNER/cloudflare-auth-template)
```

Replace `OWNER/cloudflare-auth-template` with the released starter template.

## Acceptance Path

The button flow must prove:

- starter template is created
- D1 binding is configured for `AUTH_DB`
- migrations are applied or the user is given the exact command to apply them
- `AUTH_SECRET` and `AUTH_PUBLIC_ORIGIN` are configured
- deployed `/auth/signup`, `/auth/login`, `/auth/logout`, and `/auth/user` smoke tests pass

If any step remains manual, the button docs must state the exact value the user must provide and the exact command to continue.
