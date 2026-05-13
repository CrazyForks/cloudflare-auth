# Turnstile

Turnstile is optional and disabled by default. It is unavailable in quickstarts until Stage 9 security hardening is enabled and tested.

When enabled, Turnstile is configured through `auth.config.ts`, not a CLI alias. Required mode validates before account-specific branching, token lookup, token consume, and password hashing on protected endpoints.
