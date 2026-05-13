# Local Development

Development defaults:

- `AUTH_ENV=development`
- `AUTH_PUBLIC_ORIGIN=http://localhost:8787`
- terminal email adapter
- optional in-memory dev outbox at `/auth/dev/emails`
- cookie name `cfauth-session`

The dev outbox is per-isolate memory. It is not durable storage and returns `404` outside development mode.
