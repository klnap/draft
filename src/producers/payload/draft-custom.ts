import type { LocalePrefix } from '../../core/url/published-path'
import type { DraftBootstrapConfig } from './draft-resolve'
import type { DraftLivePreviewOptions } from './live-preview-breakpoints'
import type { PublishedLinkRoutes, RouteParamsConfig } from './routes/preview-routes'

/** Shape for `CollectionConfig.custom.draft` / `GlobalConfig.custom.draft`. */
export type PayloadDraftCustom = {
  enabled?: boolean
  componentPreview?: {
    defaultRoute?: string
    defaultFrame?: string | Record<string, string>
    /** Allowed `frame=` values — registry page keys (e.g. `home-page`, `work-page`). */
    routes?: readonly string[]
  }
  publishedLink?: {
    enabled?: boolean
    path?: string
    paths?: Record<string, string>
    routes?: PublishedLinkRoutes
    params?: RouteParamsConfig
    localePrefix?: LocalePrefix
  }
  liveDraft?: DraftBootstrapConfig
  shareDraft?: DraftBootstrapConfig
  livePreview?: DraftLivePreviewOptions
}

const DRAFT_CUSTOM_KEY = 'draft' as const

export function readDraftCustom(custom: unknown): PayloadDraftCustom | null {
  if (!custom || typeof custom !== 'object') return null
  const entry = (custom as Record<string, unknown>)[DRAFT_CUSTOM_KEY]
  if (!entry || typeof entry !== 'object') return null
  const record = entry as Record<string, unknown>
  if (record.enabled === false) return null
  return entry as PayloadDraftCustom
}
