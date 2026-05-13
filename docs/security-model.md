# Security Model

Checklist:

- account enumeration: generic magic-link, reset, and verification request responses
- credential stuffing: D1 rate limits by derived IP and identifier keys
- brute-force login: password login rate limits and dummy verification path
- reset email abuse: request limits and generic response
- magic-link abuse: request and consume limits
- email link scanners: `GET` renders confirmation only, `POST` consumes
- token replay: single-use token rows with `used_at` and `consume_id`
- token leakage: redaction utility for logs, errors, and reports
- open redirects: validate and store redirects at token creation
- CSRF: unsafe method origin validation
- session theft: HTTP-only opaque cookies and HMAC-hashed token storage
- session fixation: runtime-generated session tokens only
- D1 consistency/concurrency: guarded token consume predicates and batch writes
- email delivery failure: redacted auth events and generic request responses
- secret rotation: current plus previous key-ring parser
- permissive CORS middleware: auth routes own CORS responses
- raw PII in logs/rate-limits/events: HMAC-derived keys and hashes
