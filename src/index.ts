/**
 * Package root: protocol core + generic consumer semantics + adapter boundary.
 * Next consumer: `@klnap/draft/consumers/next`
 * Payload producer: `@klnap/draft/producers/payload`
 */

export type {
  DraftConsumerAdapterConfig,
  DraftConsumerRuntime,
  DraftModeConsumerAdapter,
  DraftProtocolSurface,
} from './adapters/consumer'
export type {
  DraftProducerAdapter,
  DraftProducerAdapterConfig,
  SignBootstrapClaimsInput,
} from './adapters/producer'
export { createDraftProducer } from './adapters/producer'
export {
  createDraftProtocolSurface,
  sessionPayloadFromTokenClaims,
} from './adapters/protocol-surface'
export type {
  BootstrapPlanFailure,
  BootstrapPlanResult,
  BootstrapPlanSuccess,
  BootstrapSurfaceResult,
  PlanBootstrapFromTokenInput,
} from './consumer/bootstrap'
export { planBootstrapFromToken, resolveBootstrapSurface } from './consumer/bootstrap'
export { lifecycleExpiryForMode, readDraftIntent, readDraftSurface } from './consumer/lifecycle'
export type {
  SoftLifecycleBypassDecision,
  SoftLifecycleBypassInput,
} from './consumer/lifecycle-gate'
export { evaluateSoftLifecycleBypass } from './consumer/lifecycle-gate'
export {
  CLOCK_SKEW_SECONDS,
  DEFAULT_BOOTSTRAP_PATH,
  DRAFT_MODES,
  LIVE_TTL_SECONDS,
  PREVIEW_REQUEST_HEADER,
  SESSION_COOKIE_NAME,
  SHARE_TTL_SECONDS,
} from './core/config/constants'
export type { DraftMode, DraftSessionPayload, DraftTokenClaims } from './core/config/types'
export { deriveKeysWeb } from './core/crypto/web'
export { normalizePreviewPathname } from './core/draft-surface-query'
export { enforcePreviewDraftReadOptions } from './core/preview/preview-draft-read'
export { openSession, sealSession } from './core/session/session'
export { signToken, verifyToken } from './core/token/token'
export {
  buildDraftSurfacePath,
  DRAFT_SURFACE_PATHNAME,
  type DraftSurfaceQuery,
  isDraftSurfaceDestination,
  parseDraftSurfaceDestination,
} from './core/url/draft-surface'
export { matchPreviewPathname, type PreviewRouteMatch } from './core/url/preview-routes'
export { previewRouteTemplatesFromPublishedLink } from './core/url/preview-routes-from-link'
export { isDraftMode, isValidPreviewPath } from './core/url/url'
