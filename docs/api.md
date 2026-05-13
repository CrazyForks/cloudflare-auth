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
