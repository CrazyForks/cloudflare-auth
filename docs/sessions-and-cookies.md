# Sessions And Cookies

Sessions use opaque random tokens stored in HTTP-only cookies. D1 stores only HMAC hash envelopes.

Automatic cookie names:

| Mode | Cookie |
|---|---|
| development HTTP localhost | `cfauth-session` |
| production host-only HTTPS | `__Host-cfauth-session` |
| production cross-subdomain HTTPS | `__Secure-cfauth-session` |
| preview HTTPS host-only | `__Host-cfauth-session` |

Logout revokes the session row and clears the cookie using the same name, path, domain, secure flag, and SameSite value.
