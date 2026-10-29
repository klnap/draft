# Custom adapters

`@klnap/draft` separates **protocol** from **runtime integration**.

| Layer | Role |
| :--- | :--- |
| **core** | Framework-agnostic NDM1/NDS1 protocol (HKDF, HMAC, token/session wire). Not imported by path from outside the package. |
| **consumer** | Reusable bootstrap + soft lifecycle semantics (`planBootstrapFromToken`, `evaluateSoftLifecycleBypass`, …) exported from the package root. |
| **Consumer adapter** | Maps a host runtime (HTTP, cookies, draft rendering) to protocol + consumer semantics. |
| **Producer adapter** | Maps a CMS/backend/issuer to signed bootstrap tokens and URLs using core signing only. |

Built-in adapters ship in this repository:

```text
consumers/next   — Next.js (Proxy, route, draftMode())
producers/payload — Payload CMS bootstrap URLs
```

External adapters live in **your** packages. They depend only on the **public adapter API** exported from `@klnap/draft` (root entry), not on `src/core/*` or built-in adapter folders.

## Dependency rules

```text
consumer adapter → core (via public API)
producer adapter → core (via public API)

Forbidden:
  custom consumer → consumers/next
  custom producer → producers/payload
  consumer ↔ producer
  core → any adapter
```

## Producer adapter (issuer)

Use `createDraftProducer` to sign bootstrap tokens and build URLs without reimplementing crypto:

```ts
import { createDraftProducer } from '@klnap/draft'

const producer = createDraftProducer({
  rootSecret: process.env.DRAFT_MODE_SECRET!,
  bootstrapPath: '/api/draft', // optional, default /api/draft
})

const { token, mode, destinationPath } = producer.signBootstrapToken({
  mode: 'live',
  destinationPath: '/preview/item/42',
  nowSec: Math.floor(Date.now() / 1000),
})

const url = producer.bootstrapUrl('https://preview.example.com', {
  mode: 'share',
  destinationPath: '/share/item/42',
})
```

Wire format is locked NDM1; golden vectors in `tests/unit/core/golden.test.ts`.

## Consumer adapter (runtime)

Use `createDraftProtocolSurface` for protocol operations, then wire them into your framework:

```ts
import {
  createDraftProtocolSurface,
  type DraftModeConsumerAdapter,
} from '@klnap/draft'

const protocol = createDraftProtocolSurface({ rootSecret: process.env.DRAFT_MODE_SECRET! })

// Example: verify bootstrap query token → sealed NDS1 session cookie value
function bootstrap(tokenWire: string, nowSec = Math.floor(Date.now() / 1000)) {
  const claims = protocol.verifyToken(tokenWire, nowSec)
  if (!claims) return null
  const payload = protocol.sessionPayloadFromTokenClaims(claims, nowSec)
  return protocol.sealSession(payload)
}
```

Generic consumer bootstrap (no Next): `planBootstrapFromToken(createDraftProtocolSurface(...), { tokenWire, tokenCount, hasLegacyPathParams, resolveBootstrapOrigin, secFetchDest })`.

Session at bootstrap: **`expiresAt = bootstrapNow + ttl`**. Token `exp` is bootstrap validity only (live tokens may use `liveBucketExp` at issue time).

Structural contract for a full adapter factory:

```ts
import type { DraftModeConsumerAdapter } from '@klnap/draft'

const myFrameworkAdapter: DraftModeConsumerAdapter<MyHandlers> = {
  create(config) {
    const protocol = createDraftProtocolSurface({ rootSecret: config.rootSecret })
    return {
      protocol,
      runtime: {
        /* framework-specific handlers using protocol.* */
      },
    }
  },
}
```

Do **not** import `consumers/next` from a custom adapter.

## Neutral end-to-end sketch

Custom CMS producer + custom framework consumer (no Next, no Payload):

```text
CMS backend
  → createDraftProducer().signBootstrapToken()
  → redirect user to bootstrap URL with ?token=

Your app bootstrap handler
  → createDraftProtocolSurface().verifyToken()
  → sessionPayloadFromTokenClaims()
  → set HttpOnly cookie with sealSession()

Your request pipeline
  → openSession() on each request
  → enable draft/preview mode in your stack when session valid
```

## Public API surface

Root export = protocol core + adapter boundary + **consumer semantics** (no Next consumer runtime):

- `createDraftProducer`, `createDraftProtocolSurface`, `sessionPayloadFromTokenClaims`
- `planBootstrapFromToken`, `resolveBootstrapSurface`, `buildDraftSurfacePath`
- `readDraftIntent`, `readDraftSurface`, `lifecycleExpiryForMode`, `evaluateSoftLifecycleBypass`
- Types: `DraftProducerAdapter`, `DraftModeConsumerAdapter`, `DraftProtocolSurface`, bootstrap/lifecycle types, …
- Helpers: `signToken`, `verifyToken`, `sealSession`, `openSession`, constants

Subpath `@klnap/draft/consumers/next`: `defineDraft({ secret, preview, locales?, defaultLocale? })` on the edge bootstrap; merge `defineDraft({ pages, components })` in a separate host module loaded only by `DraftPage`. Edge `proxy.ts` must import **only** the config module — never the pages module (avoids pulling App Router / `next-intl` server config into the edge bundle). Then `createDraftProxy()` (+ `DraftPage` for `?resource=&id=`). Helpers: `toDraftProxyConfig`, `createDraftQueryLocalePathStrategy`. Config type: `DraftConsumerConfig` / registry. `secure` defaults to `!development`. Sync twin: `createDraft` (tests / Node). `createPathStrategy` is deprecated (no public→draft path rewrite).

Subpath `@klnap/draft/producers/payload`: `draft({ secret, preview, liveDraft?, shareDraft?, publishedLink? })`; per schema `custom.draft` with **`publishedLink`** (`routes`, `params`), optional **`liveDraft`** / **`shareDraft`** (`ttl`, `refreshOnActivity`, `enabled` on share). Live Preview uses `/draft?resource=&id=` without `routes`. Share admin UI: `SHARE_DRAFT_PREVIEW_BUTTON`.

Contract tests: `tests/contract/`; fakes and fixtures: `tests/helpers/fakes/` and `tests/helpers/fakes/fixtures/fake-*.ts`.

## Source layout (2026)

- `src/core/url/preview-path.ts`, `preview-routes.ts` — locale path builders
- `src/core/url/draft-surface.ts` — `buildDraftSurfacePath`
- `src/consumer/bootstrap.ts`, `lifecycle.ts` — generic consumer semantics
- `src/core/lifecycle/constants.ts` — wire cookie names / TTL constants (framework-free)
- `src/consumers/next/config/` — `DraftConsumerConfig` + `resolveDraftConsumerConfig`
- `src/consumers/next/proxy/create-draft-proxy.ts` — edge entry factory
- `src/consumers/next/lifecycle/cookies.ts` — Next `NextResponse` cookie writers
- `src/producers/payload/routes/` — `draft-surface-path`, re-export `preview-routes`
- `src/producers/payload/share/signing.ts` — Payload signing API
- `src/producers/payload/admin/share-ui.ts` — `SHARE_DRAFT_PREVIEW_BUTTON` import map key

Tests: see `docs/adr/0003-test-layout.md`. Architecture gate: `bun run test:arch`.
