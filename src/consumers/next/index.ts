/**
 * Built-in Next.js consumer: defineDraft + createDraftProxy + /api/draft bootstrap.
 */

export { DRAFT_PREVIEW_LOCALE_HEADER } from '../../core/config/constants'
export { authScopeMatchesSurface } from './auth-scope'
export type {
  DraftConsumerConfig,
  DraftHostConfig,
  DraftModeApi,
  DraftPreviewUrls,
  PathStrategy,
  PreviewRoutes,
  ResolvedDraftConsumerConfig,
  SessionCookieOptions,
} from './config'
export { buildPreviewPath } from './config'
export {
  defaultBlockPublicDraftPath,
  defaultRequestHostname,
  definedToConsumerConfig,
  isDraftHostname,
  requestPublicOrigin,
  resolveDraftConsumerConfig,
  toDraftProxyConfig,
} from './config/resolve-config'
export { createDraft } from './create-draft'
export {
  type DefineDraftInput,
  type DefinedDraft,
  type DraftPreviewMode,
  defineDraft,
  isDefinedDraft,
  resetDraft,
} from './define-draft'
export { DraftPage, type DraftPageSearchParams } from './draft-page'
export type { DraftPageEntry, DraftPageLoadContext, DraftPagesRegistry } from './draft-registry'
export { type DraftContext, getDraft, getDraftContext, getDraftLocale } from './get'
export { DRAFT_RESPONSE_HEADERS } from './headers'
export {
  DRAFT_COOKIE_ABS_EXP,
  DRAFT_COOKIE_DOC_PASS,
  DRAFT_COOKIE_GATE,
  DRAFT_COOKIE_IDLE_EXP,
  DRAFT_COOKIE_INTENT,
  DRAFT_COOKIE_SURFACE,
  DRAFT_COOKIE_VIEW,
  DRAFT_QUERY_GATE,
  type DraftSurface,
  NEXT_DRAFT_BYPASS_COOKIE,
} from './lifecycle'
export { createDraftQueryLocalePathStrategy } from './path-strategy'
export { forwardDraftPreviewLocaleHeaders } from './preview-locale-core'
export { isActivityRequest } from './proxy/activity'
export { createDraftProxy } from './proxy/create-draft-proxy'
export { draftPreviewLocaleProxy } from './proxy/locale-forward'
export { GET } from './route/get'
