# ADR-0001: Adapter boundaries in `@klnap/draft`

## Status

Accepted

## Context

Draft mode integrates with Next.js runtime and Payload CMS while sharing a locked NDM1/NDS1 protocol. Coupling protocol with frameworks makes external reuse and testing harder.

## Decision

Introduce three layers:

| Layer | Path | Role |
| :--- | :--- | :--- |
| **core** | `src/core/*` | Framework-agnostic protocol (HKDF, HMAC, token/session wire) |
| **adapters** | `src/adapters/*` | Stable public integration boundary (`createDraftProducer`, `createDraftProtocolSurface`) |
| **Built-in adapters** | `consumers/next`, `producers/payload` | Reference Next consumer and Payload issuer |

Dependency direction:

```text
consumers/next → adapters → core
producers/payload → adapters → core
```

No reverse edges. Consumers and producers never import each other.

External adapters use only root `@klnap/draft` exports, not filesystem paths into `core/` or built-in trees.

## Consequences

- Custom CMS/framework integrations ship outside this package.
- Bootstrap session lifetime: `session.expiresAt = bootstrapNow + ttl` (token `exp` remains issuer/bootstrap validity).
- Live token `exp` may use `liveBucketExp` issuer policy without changing NDM1 layout.
