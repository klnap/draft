/** Public entry for the built-in Payload CMS producer. */

/** @deprecated Use `@klnap/draft` root `signToken` / `verifyToken` or `createDraftProducer`. */
export { signToken, verifyToken } from '../../core/token/token'
export { buildDraftSurfacePath } from '../../core/url/draft-surface'
export { PUBLISHED_PREVIEW_BUTTON } from './admin/published-preview-ui'
export { SHARE_DRAFT_PREVIEW_BUTTON } from './admin/share-ui'
export {
  draftBootstrapUrl,
  type SignDraftTokenInput,
  signDraftBootstrapToken,
} from './bootstrap'
export type { PayloadDraftCustom } from './draft-custom'
export { readDraftCustom } from './draft-custom'
export {
  type DraftBootstrapConfig,
  formatDraftTtlLabel,
  type PayloadDraftPluginDefaults,
  resolveLiveDraft,
  resolvePublishedLink,
  resolveShareDraft,
} from './draft-resolve'
export { draft } from './plugin'
export {
  buildPreviewPath,
  buildPublishedPath,
  type LocalePrefix,
  mergeLocalePrefix,
  type PreviewRoutes,
  type PublishedLinkRoutes,
  type ResolvedPublishedPathConfig,
  type RouteParamFieldSpec,
  type RouteParamMapping,
  type RouteParamsConfig,
  resolvePublishedPathConfig,
  templateRequiresRouteParams,
} from './routes/preview-routes'
export {
  createPayloadDraftSigning,
  type PayloadDraftApi,
  type PayloadDraftConfig,
} from './share/signing'
