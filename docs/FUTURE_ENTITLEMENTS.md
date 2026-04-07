# Future entitlements: license API and grandfathering (design sketch)

This document is a **design reference** for when you add payments or subscriptions. Nothing here is implemented in the app yet.

## Constraint (MIT client)

If the desktop app remains fully MIT-licensed and open, **any license check in the client can be removed by a fork**. Strong enforcement requires at least one of:

- **Open-core**: closed native module or separate binary for verification, or
- **Server-gated value**: features that only work with your API (sync, team, cloud project index), or
- **Legal + distribution**: official signed builds and trademark policy ([COMMERCIAL.md](../COMMERCIAL.md)), accepting that source builds stay free.

## Identity options

| Approach | Pros | Cons |
|----------|------|------|
| **User account** (email/OAuth) | Easy refunds, multi-device, grandfather flags | Privacy, needs auth UX |
| **License key** (perpetual/sub) | Simple offline story with signed blobs | Key sharing, support burden |
| **Device-bound token** | Limits casual sharing | Hardware change friction |

Recommended hybrid: **account** + **short-lived access token** cached on device; refresh online periodically.

## Grandfather rules (examples)

Store on the server (e.g. `users` / `entitlements` table):

- `created_at` — account registration time  
- `plan` — `free`, `pro`, `grandfathered`, etc.  
- `grandfather_reason` — e.g. `early_adopter_cutoff`  
- `first_install_at` or `license_issued_at` — optional, from first successful app handshake  

**Example policy:** “Users who created an account before `2027-01-01` keep `plan = grandfathered_free` for local features.”

Implement as **server-side logic** when issuing tokens, not only in the client.

## Suggested API shape (REST)

Base URL: `https://api.yourproduct.com/v1` (illustrative).

### `POST /auth/device`

**Request (JSON):**

```json
{
  "device_id": "stable-uuid-per-install",
  "app_version": "0.1.0",
  "platform": "win32"
}
```

**Response:**

```json
{
  "access_token": "jwt-or-opaque",
  "expires_in": 3600,
  "entitlements": {
    "tier": "free",
    "features": ["chat", "tasks", "cli_local"]
  }
}
```

### `GET /entitlements` (Bearer token)

Returns current tier and feature flags after subscription changes.

### `POST /billing/checkout` (optional)

Returns Stripe/Lemon Squeezy checkout URL; webhook updates `plan` on payment.

## Client flow (Electron)

1. On startup (and every N hours), if online: exchange `device_id` + optional session cookie for `access_token`.
2. Cache token in OS keychain or encrypted local store.
3. If token expired: soft grace (e.g. 72h) then degrade UI (read-only) or show upgrade—**product decision**.
4. **Offline**: honor cached `entitlements` until `expires_in` + grace; then require network for Pro.

## JWT claims (if using JWT)

Example claims:

- `sub` — user id  
- `plan` — `free` | `pro` | `grandfathered`  
- `exp` — expiry  
- `feat` — optional array of feature flags  

Sign with RS256; rotate keys; validate issuer/audience in client **only for UX**—real enforcement for cloud features is on **your API**.

## Security notes

- Never embed API secrets in the app; use public client id + PKCE where applicable.
- Rate-limit `/auth/device` by IP + `device_id`.
- Log subscription webhooks idempotently.

## Related docs

- [MONETIZATION_MODEL.md](MONETIZATION_MODEL.md) — why MIT and open-core matter  
- [COMMERCIAL.md](../COMMERCIAL.md) — trademarks and paid offerings  
