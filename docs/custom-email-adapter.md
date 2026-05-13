# Custom Email Adapter

Custom adapters implement the `AuthEmailAdapter` interface and receive runtime `env`, `ctx`, `mode`, `requestId`, `publicOrigin`, and a redacting logger.

Adapter factories should store binding names or option values, not Worker binding instances.

Use this for providers such as Resend, Postmark, or an internal service binding. Do not log raw token links in adapter errors.
