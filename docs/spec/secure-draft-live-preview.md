# Secure draft & live preview (normative — @klnap/draft)

## Layers

| Layer | Role |
| :--- | :--- |
| `src/core/*` | Framework-agnostic protocol: HKDF, HMAC, NDM1/NDS1 wire formats, path validation, URL helpers |
| `src/consumer/*` | Framework-neutral bootstrap + soft lifecycle semantics (root exports) |
| `src/consumers/next/*` | Next.js adapter: proxy, cookies, bootstrap route I/O, `draftMode()` / `isEnabled()` |
| `src/producers/payload/*` | Payload producer: bootstrap token signing, admin preview URLs |

Binary wire formats:

- **Token (`NDM1`)**: `base64url(canonical || hmac32)` where canonical is magic + length-prefixed UTF-8 `mode` and `destinationPath`, `u64_be` `iat`/`exp`, `u32_be` `ttl`, `u8` `refreshOnActivity`. HMAC key = HKDF-SHA256(`rootSecret`, salt `""`, info `next-draft-mode/v1/token`, L=32).
- **Session (`NDS1`)**: cookie `__ndm_session` = `base64url(canonical || mac32)`; canonical is magic, `u8` mode, `u64_be` `expiresAt`, `u32_be` `ttl`, `u8` `refreshOnActivity`. MAC key purpose `next-draft-mode/v1/session`.

Bootstrap: `GET /api/draft?token=…` verifies token, enables Next Draft Mode, sets `__ndm_session` + soft lifecycle cookies (`draft_intent`, surface, gate for top-level share/live).

`defineDraft` + `createDraftProxy()` from `@klnap/draft/consumers/next` is the **full** Next consumer: soft-session gate + bootstrap route + `isEnabled` + `DraftPage` (`?resource=&id=`). Host supplies `secret` + `preview.{liveUrl,draftUrl?}` (+ optional `secure`, `locales` / `defaultLocale` for next-intl rewrite, and `pages` or `defineDraftPages`). Mode = same-host → `path`, else `origin`.

**Edge boundary:** the proxy factory reads only `DraftConsumerConfig` (no `pages`). Hosts with i18n or heavy preview UI MUST register `pages` in a module that is **not** imported from `proxy.ts` — see package README § Edge / proxy import boundary.

Factory: throws if `sessionCookie.sameSite === 'none' && secure === false`. `proxy` is sync after await; `route` / `isEnabled` lazy-load server modules.

Golden vectors: `packages/draft/tests/unit/core/golden.test.ts`.

## Custom adapters

Built-in: `consumers/next` (Next.js consumer), `producers/payload` (Payload issuer).

External consumer/producer adapters MUST use the public adapter API (`createDraftProtocolSurface`, `createDraftProducer`, types exported from `@klnap/draft` root). They MUST NOT import package internals or built-in adapter folders.

Normative adapter documentation: [adapters.md](../adapters.md).


## TTL layers (intentional)

| Layer | Meaning |
| :--- | :--- |
| **Token `exp`** | Bootstrap link validity at issue time (`live` may use `liveBucketExp`). |
| **NDS1 `expiresAt`** | `bootstrapNow + claims.ttl` when the session cookie is sealed. |
| **Soft lifecycle cookies** | UX caps via `DRAFT_SOFT_ABSOLUTE_CAP_SECONDS` (`draft_intent`, `draft_abs_exp`, …). |

These layers are independent; changing one does not automatically change the others.

## Draft surface contract

Producer `destinationPath` for live/share preview commonly uses `buildDraftSurfacePath` (`/draft?resource=&id=` with optional `locale`, `route`, `frame`). Next `DraftPage` resolves the same query shape.

## Runtime crypto

- **Node:** `signToken` / `verifyToken` / `sealSession` / `openSession` (bootstrap route, CMS).
- **Web Crypto:** `deriveKeysWeb` + session helpers with derived keys (edge proxy).

## Generic consumer semantics

Root `@klnap/draft` exports `planBootstrapFromToken`, `evaluateSoftLifecycleBypass`, and lifecycle helpers. Framework adapters (built-in Next under `consumers/next`) map decisions to cookies, redirects, and preview mode.
