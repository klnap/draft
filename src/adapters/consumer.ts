import type { DraftSessionPayload, DraftTokenClaims } from '../core/config/types'

/** Minimal config shared by all consumer adapters (extend in framework-specific adapters). */
export type DraftConsumerAdapterConfig = {
  rootSecret: string
}

/** Protocol operations custom consumers wire into their runtime (no Next/Payload types). */
export type DraftProtocolSurface = {
  verifyToken: (wire: string, nowSec?: number) => DraftTokenClaims | null
  sessionPayloadFromTokenClaims: (
    claims: DraftTokenClaims,
    bootstrapNowSec?: number
  ) => DraftSessionPayload
  sealSession: (payload: DraftSessionPayload) => string
  openSession: (wire: string, nowSec?: number) => DraftSessionPayload | null
  isValidPreviewPath: (path: string) => boolean
}

export type DraftConsumerRuntime<Runtime = unknown, _Response = unknown> = {
  protocol: DraftProtocolSurface
  runtime: Runtime
}

/**
 * Optional factory pattern for external framework wrappers.
 * The built-in Next consumer uses `createDraftProxy`; reusable semantics live under
 * `planBootstrapFromToken`, `evaluateSoftLifecycleBypass`, and related root exports.
 */
export type DraftModeConsumerAdapter<Runtime = unknown, Response = unknown> = {
  create: (
    config: DraftConsumerAdapterConfig & Record<string, unknown>
  ) => DraftConsumerRuntime<Runtime, Response>
}
