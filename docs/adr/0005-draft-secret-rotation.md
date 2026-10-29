# ADR-0005: DRAFT_MODE_SECRET rotation

## Status

Accepted (P1 documentation)

## Context

`deriveKeys` uses a single `rootSecret` without `kid` or grace-period dual keys. Rotating the secret invalidates all outstanding NDM1 tokens and NDS2 sessions immediately.

## Decision

- **P0:** rotation = operational kill switch (re-issue share links, re-open live preview).
- **P1+:** if dual-key grace is needed, extend `deriveKeys` with explicit `kid` header on wire formats and a documented overlap window; not implemented in P0.

## Consequences

- Runbooks must coordinate CMS + web env updates atomically.
- Share TTL up to 24h implies users may need fresh links after rotation.
