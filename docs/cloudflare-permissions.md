# Cloudflare API Permissions

Wrangler can authenticate interactively with `wrangler login`. For CI or an
autonomous coding agent, set both values explicitly:

```bash
export CLOUDFLARE_ACCOUNT_ID="<32-character-account-id>"
export CLOUDFLARE_API_TOKEN="<scoped-api-token>"
```

Use a custom API token restricted to the account and, when applicable, the
zone being deployed. The minimum permissions for the standard
`workers.dev` deployment path are:

| Resource | Permission             | Used for                                                           |
| -------- | ---------------------- | ------------------------------------------------------------------ |
| Account  | Account Settings: Read | Deterministic account discovery and `wrangler whoami` checks       |
| Account  | Workers Scripts: Edit  | Worker deploys, versions, and secret create/list/update operations |
| Account  | D1: Edit               | D1 discovery/creation, migrations, cleanup, and recovery commands  |
| User     | User Details: Read     | Non-interactive Wrangler identity checks for user-owned tokens     |
| User     | Memberships: Read      | Proving that the configured account is accessible                  |

Add only the permissions required by optional infrastructure:

| Optional feature                                     | Additional permission                         |
| ---------------------------------------------------- | --------------------------------------------- |
| Worker Route or Custom Domain                        | Zone: Workers Routes: Edit on the target zone |
| DNS records managed by the same automation           | Zone: DNS: Edit on the target zone            |
| Email Service configured through API/SMTP automation | Account: Email Sending: Edit                  |

The runtime `AUTH_EMAIL` binding does not put an API token inside the Worker.
Email sender/domain onboarding and DNS readiness are the only dashboard steps
the project cannot safely infer. Complete those steps before enabling the
Cloudflare Email adapter in preview or production.

Never store `CLOUDFLARE_API_TOKEN` in `wrangler.jsonc`, `.dev.vars`, an
evidence file, or a committed `.env` file. CI should use the platform's
encrypted secret store.

Official references:

- [Wrangler system environment variables](https://developers.cloudflare.com/workers/wrangler/system-environment-variables/)
- [D1 API token permissions](https://developers.cloudflare.com/d1/tutorials/import-to-d1-with-rest-api/)
- [Workers routes and domains](https://developers.cloudflare.com/workers/configuration/routing/)
- [Cloudflare Email Service](https://developers.cloudflare.com/email-service/)
