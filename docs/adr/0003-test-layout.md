# ADR-0003: Test layout in `@klnap/draft`

## Status

Accepted

## Context

Tests split by intent while keeping Bun as the runner.

## Decision

| Directory | Purpose | Suffix |
| :--- | :--- | :--- |
| `tests/unit/` | Fast isolated logic | `*.test.ts(x)` |
| `tests/contract/` | Adapter contracts | `*.contract.test.ts` |
| `tests/architecture/` | Import graph | `*.test.ts` |
| `tests/integration/` | Cross-layer (future) | `*.int.test.ts` |
| `tests/security/` | Threat regressions (phase 5) | `*.test.ts` |
| `tests/helpers/` | Fakes (tests only) | — |

Unit paths mirror `src/`. Scripts: `test`, `test:unit`, `test:contract`, `test:arch`, `test:int`, `test:security`, `check:exports`.

Security files are named after threats, not source files.

## Consequences

- Fakes: `tests/helpers/fakes/`.
- Scaffold dirs use `.gitkeep` until filled.
