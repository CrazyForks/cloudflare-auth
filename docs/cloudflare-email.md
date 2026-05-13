# Cloudflare Email

The production adapter uses a Worker `send_email` binding resolved from `env` at request time.

Generated binding name:

```text
AUTH_EMAIL
```

If the binding is missing, `cf-auth doctor --env production` reports the missing binding and suggests the exact Wrangler config change. Local development does not require Cloudflare Email; it uses terminal email by default.
