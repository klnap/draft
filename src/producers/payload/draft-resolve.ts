import type { DraftMode } from '../../core/config/types'
import { DRAFT_SOFT_ABSOLUTE_CAP_SECONDS } from '../../core/lifecycle/constants'
import {
  type LocalePrefix,
  type ResolvedPublishedPathConfig,
  resolvePublishedPathConfig,
} from '../../core/url/published-path'
import type { PayloadDraftCustom } from './draft-custom'

const MIN_BOOTSTRAP_TTL_SECONDS = 60

/** Maps to `SignBootstrapClaimsInput` (without `mode` / `destinationPath`). */
export type DraftBootstrapConfig = {
  enabled?: boolean
  ttl?: number
  refreshOnActivity?: boolean
}

export type ResolvedDraftBootstrap = {
  ttl: number
  refreshOnActivity: boolean
}

export type ResolvedPublishedLink = {
  enabled: boolean
  pathConfig?: ResolvedPublishedPathConfig
}

export type PayloadDraftPluginDefaults = {
  publishedLink?: {
    enabled?: boolean
    localePrefix?: LocalePrefix
  }
  liveDraft?: DraftBootstrapConfig
  shareDraft?: DraftBootstrapConfig
}

function defaultTtl(mode: DraftMode): number {
  return mode === 'live' ? 3600 : 86_400
}

export function clampBootstrapTtl(mode: DraftMode, ttl: number): number {
  const max = DRAFT_SOFT_ABSOLUTE_CAP_SECONDS[mode]
  return Math.min(max, Math.max(MIN_BOOTSTRAP_TTL_SECONDS, Math.floor(ttl)))
}

export function resolveDraftBootstrap(
  mode: DraftMode,
  plugin?: DraftBootstrapConfig,
  schema?: DraftBootstrapConfig
): ResolvedDraftBootstrap {
  const ttl = clampBootstrapTtl(mode, schema?.ttl ?? plugin?.ttl ?? defaultTtl(mode))
  const refreshOnActivity = schema?.refreshOnActivity ?? plugin?.refreshOnActivity ?? true
  return { ttl, refreshOnActivity }
}

export function resolveLiveDraft(
  plugin: PayloadDraftPluginDefaults | undefined,
  schema: PayloadDraftCustom
): ResolvedDraftBootstrap {
  return resolveDraftBootstrap('live', plugin?.liveDraft, schema.liveDraft)
}

export function resolveShareDraft(
  plugin: PayloadDraftPluginDefaults | undefined,
  schema: PayloadDraftCustom
): ResolvedDraftBootstrap & { enabled: boolean } {
  const enabled = schema.shareDraft?.enabled ?? plugin?.shareDraft?.enabled ?? true
  return {
    enabled,
    ...resolveDraftBootstrap('share', plugin?.shareDraft, schema.shareDraft),
  }
}

export function resolvePublishedLink(
  plugin: PayloadDraftPluginDefaults | undefined,
  schema: PayloadDraftCustom
): ResolvedPublishedLink {
  const link = schema.publishedLink
  const pathConfig = resolvePublishedPathConfig(plugin?.publishedLink?.localePrefix, link)
  if (!pathConfig) {
    return { enabled: false }
  }

  const enabled = link?.enabled ?? plugin?.publishedLink?.enabled ?? true

  return {
    enabled,
    pathConfig,
  }
}

/** Human label for admin toasts (e.g. `24h`, `1h`, `90m`). */
export function formatDraftTtlLabel(ttlSeconds: number): string {
  if (ttlSeconds >= 3600 && ttlSeconds % 3600 === 0) {
    return `${ttlSeconds / 3600}h`
  }
  return `${Math.max(1, Math.round(ttlSeconds / 60))}m`
}
