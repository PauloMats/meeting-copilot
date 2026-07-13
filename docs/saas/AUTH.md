# Authentication and devices

## User sessions

- Email is normalized and unique.
- Passwords use a memory-hard KDF with a per-password random salt. Plain passwords are never logged or stored.
- Access tokens are opaque, random, short-lived tokens (15 minutes) stored only as hashes server-side.
- Refresh tokens are opaque, random, valid for at most 30 days, rotated on every use, and grouped in a token family.
- Reuse of an already-rotated refresh token revokes the entire family.
- Web refresh tokens are delivered by `HttpOnly`, `Secure`, `SameSite=Lax` cookies in production.
- Desktop refresh tokens are encrypted with Electron `safeStorage`; access tokens remain in memory.

## Device authorization

The desktop uses a device authorization flow so a password does not need to enter the Electron renderer:

1. Desktop requests a random device code and short user code.
2. The API stores only hashes and an expiry.
3. The desktop opens the verification URL in the system browser.
4. An authenticated user approves the named device.
5. Desktop polls at the advertised interval and receives tokens once.
6. The authorization code becomes consumed and cannot be replayed.

Users can list and revoke devices. Revoking a device revokes every associated session and refresh-token family.

## Recovery and verification

Email verification and password reset use single-use random tokens stored as hashes with short expiry. Responses do not reveal whether an email exists. Delivery is provider-agnostic; production email integration remains a deployment task.

## Transition from pilot auth

`APP_USER_EMAIL` and the shared desktop key are migration aids only. Existing pilot rows are attached to the bootstrap user before individual auth is enforced. Production must run with `AUTH_REQUIRED=true` and must not expose a bootstrap bypass.
