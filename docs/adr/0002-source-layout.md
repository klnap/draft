# ADR-0002: Source layout in `@klnap/draft`

## Status

Accepted

## Context

Phase 1 reorganized `src/` so protocol, Next consumer, and Payload producer code have stable homes and import-graph enforcement can mirror boundaries.

## Decision

### Layers

| Layer | Path | May import from `src` | Must not import |
| :--- | :--- | :--- | :--- |
| **core** | `src/core/**` | `core` only | `next`, `react`, `payload`, `@payloadcms/*`, `adapters`, built-in trees |
| **adapters** | `src/adapters/**` | `core` (see ADR-0001) | built-in trees, framework runtimes |
| **consumer** | `src/consumer/**` | `core`, `adapters` | `next`, `react`, `payload`, `@payloadcms/*`, built-in trees |
| **consumers/next** | `src/consumers/next/**` | `core`, `adapters`, `consumer` | `producers/payload`, `payload`, `@payloadcms/*` |
| **producers/payload** | `src/producers/payload/**` | `core`, `adapters` | `consumers/next`, `next/*` |

Producers and consumers never import each other.

ADR-0001 allows adapters to call `core` protocol helpers (not types-only). Phase 4 boundary table “types only” is **superseded by ADR-0001** for adapters.

### Placement rules

| Add… | Location |
| :--- | :--- |
| Protocol crypto, token, session, URL helpers | `src/core/{crypto,token,session,url,config,lifecycle}/` |
| Producer/consumer contracts | `src/adapters/` |
| Generic bootstrap + soft lifecycle semantics | `src/consumer/**` |
| Next proxy, route, cookies, draft page | `src/consumers/next/**` |
| Draft surface path builder (`buildDraftSurfacePath`) | `src/core/url/draft-surface.ts` |
| Payload plugin, signing, admin UI | `src/producers/payload/**` |
| Locale preview path builders | `src/core/url/preview-*.ts` |
| Payload route helpers | `src/producers/payload/routes/` |
| Share signing | `src/producers/payload/share/` |
| Admin-only React / `@payloadcms/ui` | `src/producers/payload/admin/` |

### Edge runtime

The static import closure of `src/consumers/next/proxy/**` must not reach `core/crypto/node.ts` or any `node:*` module.

Edge proxy entry (`createDraftProxy`) uses `deriveKeysWeb`; the static import closure of `src/consumers/next/proxy/**` must not reach `core/crypto/node.ts` or any `node:*` module (enforced in `tests/architecture`).

## Consequences

- `shared/` removed; preview helpers live under `core/url/`.
- Pure lifecycle constants in `core/lifecycle/`; Next cookie writers stay in `consumers/next/lifecycle/cookies.ts`.
