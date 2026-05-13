# Rate Limiting

The MVP uses D1 fixed-window rate limits. Stored keys are derived with HMAC and include the action and subject type:

```text
rl:v1:<action>:<subject-type>:<hmac>
```

Raw emails, identifiers, and IP addresses are never stored in `rate_limits`.

The optional Cloudflare Workers Rate Limiting API adapter is an edge-abuse prefilter only. D1 remains authoritative for account-sensitive auth decisions.
