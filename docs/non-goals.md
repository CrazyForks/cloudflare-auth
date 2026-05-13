# V1 Non-Goals

Cloudflare Auth v1 is a small self-deployed authentication runtime, not a hosted identity platform. The following areas are not v1 work:

- OAuth/social login
- SAML/enterprise SSO
- passkeys
- MFA
- organizations/teams
- role/permission framework
- hosted dashboard
- hosted auth service
- billing integration
- admin impersonation
- multi-project control plane
- password peppering

These areas add separate security, recovery, migration, policy, and support requirements. V1 focuses on email/password, username/password, magic links, email verification, password reset, D1-backed opaque sessions, adapters, CLI setup, and documentation.
