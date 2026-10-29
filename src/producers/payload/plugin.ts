import type { CollectionConfig, Config, GlobalConfig, PayloadRequest } from 'payload'
import { normalizePreviewPathname } from '../../core/draft-surface-query'
import { checkMemoryRateLimit } from '../../core/rate-limit/memory-window'
import { buildDraftSurfacePath } from '../../core/url/draft-surface'
import type { PreviewRoutes } from '../../core/url/preview-routes'
import {
  isFlatLocalePreviewRouteMap,
  previewRouteTemplatesFromPublishedLink,
} from '../../core/url/preview-routes-from-link'
import type { LocalePrefix } from '../../core/url/published-path'
import { isValidPreviewPath } from '../../core/url/url'
import { PUBLISHED_PREVIEW_BUTTON } from './admin/published-preview-ui'
import { SHARE_DRAFT_PREVIEW_BUTTON } from './admin/share-ui'
import { readDraftCustom } from './draft-custom'
import {
  clampBootstrapTtl,
  type ResolvedDraftBootstrap,
  resolveLiveDraft,
  resolvePublishedLink,
  resolveShareDraft,
} from './draft-resolve'
import { resolveLivePreviewBreakpoints } from './live-preview-breakpoints'
import type { PublishedLinkRoutes } from './routes/preview-routes'
import {
  assertSharePreviewAccess,
  assertSharePreviewSurfaceAccess,
  resolveSharePathScope,
  type ShareSurfaceResolution,
} from './share/share-preview-access'
import {
  createPayloadDraftSigning,
  type DraftCollectionAdminWireOptions,
  type PayloadDraftApi,
  type PayloadDraftConfig,
} from './share/signing'

function wireOptions(
  config: PayloadDraftConfig,
  custom: ReturnType<typeof readDraftCustom>
): DraftCollectionAdminWireOptions {
  const meta = custom!
  const published = resolvePublishedLink(config, meta)
  const liveDraft = resolveLiveDraft(config, meta)
  const shareDraft = resolveShareDraft(config, meta)

  const options: DraftCollectionAdminWireOptions = {
    liveDraft,
    shareDraft,
    draftMeta: meta,
  }

  if (published.enabled && published.pathConfig) {
    options.publishedLink = {
      enabled: true,
      pathConfig: published.pathConfig,
    }
  }

  return options
}

function mergeAdminLivePreview<T extends { admin?: { livePreview?: { breakpoints?: unknown } } }>(
  entity: T,
  previewAdmin: Record<string, unknown>
): T['admin'] & Record<string, unknown> {
  const existing = entity.admin?.livePreview
  const incoming = previewAdmin.livePreview as Record<string, unknown> | undefined
  if (!incoming) {
    return { ...entity.admin, ...previewAdmin } as T['admin'] & Record<string, unknown>
  }
  return {
    ...entity.admin,
    ...previewAdmin,
    livePreview: {
      ...(existing && typeof existing === 'object' ? existing : {}),
      ...incoming,
    },
  } as T['admin'] & Record<string, unknown>
}

function mergeCollectionAdmin(
  collection: CollectionConfig,
  draft: PayloadDraftApi,
  pluginConfig: PayloadDraftConfig
): CollectionConfig {
  const meta = readDraftCustom(collection.custom)
  if (!meta) return collection

  const livePreviewBreakpoints = resolveLivePreviewBreakpoints(
    pluginConfig,
    meta,
    collection.admin?.livePreview?.breakpoints
  )
  const previewAdmin = draft.collectionPreview(collection.slug, {
    ...wireOptions(pluginConfig, meta),
    livePreviewBreakpoints,
  })

  return {
    ...collection,
    admin: mergeAdminLivePreview(collection, previewAdmin),
  }
}

function mergeGlobalAdmin(
  global: GlobalConfig,
  draft: PayloadDraftApi,
  pluginConfig: PayloadDraftConfig
): GlobalConfig {
  const meta = readDraftCustom(global.custom)
  if (!meta) return global

  const livePreviewBreakpoints = resolveLivePreviewBreakpoints(
    pluginConfig,
    meta,
    global.admin?.livePreview?.breakpoints
  )
  const previewAdmin = draft.globalPreview(global.slug, {
    ...wireOptions(pluginConfig, meta),
    livePreviewBreakpoints,
  })

  return {
    ...global,
    admin: mergeAdminLivePreview(global, previewAdmin),
  }
}

function parseShareBootstrapBody(
  body: Record<string, unknown>,
  defaultShare: ResolvedDraftBootstrap
): ResolvedDraftBootstrap {
  const ttlRaw = body.ttl
  const refreshRaw = body.refreshOnActivity
  const ttl =
    typeof ttlRaw === 'number' && Number.isFinite(ttlRaw)
      ? clampBootstrapTtl('share', ttlRaw)
      : defaultShare.ttl
  const refreshOnActivity =
    typeof refreshRaw === 'boolean' ? refreshRaw : defaultShare.refreshOnActivity
  return { ttl, refreshOnActivity }
}

function localeCodesFromConfig(incomingConfig: Config): string[] {
  const localization =
    incomingConfig.localization === false ? undefined : incomingConfig.localization
  const locales = localization?.locales
  if (!locales?.length) return ['en']
  return locales.map((locale: string | { code: string }) =>
    typeof locale === 'string' ? locale : locale.code
  )
}

function localeCodesForPublishedLink(
  incomingConfig: Config,
  link: NonNullable<NonNullable<ReturnType<typeof readDraftCustom>>['publishedLink']>
): string[] {
  const codes = new Set(localeCodesFromConfig(incomingConfig))
  if (link.paths) {
    for (const code of Object.keys(link.paths)) codes.add(code)
  }
  if (link.routes && isFlatLocalePreviewRouteMap(link.routes)) {
    for (const code of Object.keys(link.routes)) codes.add(code)
  }
  return [...codes]
}

/** Legacy `publishedLink.routes` keyed by pathname template → flat locale map. */
function routeEntryFromLegacyRoutes(routes: PublishedLinkRoutes): PreviewRoutes[string] | null {
  if (isFlatLocalePreviewRouteMap(routes)) return routes as PreviewRoutes[string]
  const nested = Object.values(routes).find((value) => typeof value === 'object' && value !== null)
  return (nested as Record<string, string> | undefined) ?? null
}

function routeEntryForSchema(
  incomingConfig: Config,
  meta: NonNullable<ReturnType<typeof readDraftCustom>>,
  pluginLocalePrefix?: LocalePrefix
): PreviewRoutes[string] | null {
  const link = meta.publishedLink
  if (!link) return null

  const localeCodes = localeCodesForPublishedLink(incomingConfig, link)
  const fromPath = previewRouteTemplatesFromPublishedLink(link, localeCodes, pluginLocalePrefix)
  if (Object.keys(fromPath).length > 0) return fromPath

  if (link.routes) return routeEntryFromLegacyRoutes(link.routes)
  return null
}

function buildPreviewRouteIndex(
  incomingConfig: Config,
  pluginLocalePrefix?: LocalePrefix
): Map<string, PreviewRoutes[string]> {
  const index = new Map<string, PreviewRoutes[string]>()

  for (const collection of incomingConfig.collections ?? []) {
    const meta = readDraftCustom(collection.custom)
    const entry = meta ? routeEntryForSchema(incomingConfig, meta, pluginLocalePrefix) : null
    if (!entry) continue
    index.set(collection.slug, entry)
  }
  for (const global of incomingConfig.globals ?? []) {
    const meta = readDraftCustom(global.custom)
    const entry = meta ? routeEntryForSchema(incomingConfig, meta, pluginLocalePrefix) : null
    if (!entry) continue
    index.set(global.slug, entry)
  }
  return index
}

async function readSharePreviewBody(req: PayloadRequest): Promise<Record<string, unknown> | null> {
  const data = req.data
  if (data && typeof data === 'object' && ('surface' in data || 'path' in data)) {
    return data as Record<string, unknown>
  }
  if (req.json) {
    try {
      const json = await req.json()
      if (json && typeof json === 'object') return json as Record<string, unknown>
    } catch {
      return null
    }
  }
  return data && typeof data === 'object' ? (data as Record<string, unknown>) : null
}

function shareRateLimitKey(req: PayloadRequest): string {
  const headers = req.headers
  const forwarded =
    headers && typeof headers.get === 'function' ? headers.get('x-forwarded-for') : undefined
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return String(req.user?.id ?? 'unknown')
}

function createSharePreviewEndpoint(
  draft: PayloadDraftApi,
  defaultShare: ResolvedDraftBootstrap,
  routeIndex: Map<string, PreviewRoutes[string]>,
  pluginConfig: PayloadDraftConfig
) {
  return {
    path: '/preview/share-url',
    method: 'post' as const,
    handler: async (req: PayloadRequest) => {
      if (!req.user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const rateKey = `share-preview:${shareRateLimitKey(req)}`
      if (!checkMemoryRateLimit(rateKey, 60, 60_000)) {
        return Response.json({ error: 'Too many requests' }, { status: 429 })
      }

      const body = await readSharePreviewBody(req)
      if (!body) {
        return Response.json({ error: 'Invalid request body' }, { status: 400 })
      }

      const record = body as Record<string, unknown>
      const bootstrap = parseShareBootstrapBody(record, defaultShare)

      const surfaceRaw = record.surface
      if (surfaceRaw && typeof surfaceRaw === 'object') {
        const surface = surfaceRaw as Record<string, unknown>
        const resource = surface.resource
        if (typeof resource !== 'string' || resource.length === 0) {
          return Response.json({ error: 'Invalid preview surface' }, { status: 400 })
        }
        const locale = typeof surface.locale === 'string' ? surface.locale : undefined
        const id = typeof surface.id === 'string' && surface.id.length > 0 ? surface.id : undefined
        const surfaceScope: ShareSurfaceResolution = id
          ? { kind: 'collection', resource, id }
          : { kind: 'global', resource }

        try {
          await assertSharePreviewSurfaceAccess(req, surfaceScope)
        } catch (error) {
          if (error && typeof error === 'object' && 'status' in error) {
            const status = Number((error as { status: number }).status)
            if (status === 401) {
              return Response.json({ error: 'Unauthorized' }, { status: 401 })
            }
            if (status === 403) {
              return Response.json({ error: 'Forbidden' }, { status: 403 })
            }
          }
          return Response.json({ error: 'Internal server error' }, { status: 500 })
        }

        const destinationPath = buildDraftSurfacePath({
          resource,
          locale,
          id,
        })
        return Response.json({
          url: draft.bootstrapDraftSurface(destinationPath, 'share', bootstrap),
        })
      }

      const path = record.path

      if (typeof path !== 'string' || !isValidPreviewPath(path)) {
        return Response.json({ error: 'Invalid preview path' }, { status: 400 })
      }

      if (path.includes('?') || !normalizePreviewPathname(path.split('?')[0] ?? path)) {
        return Response.json({ error: 'Invalid preview path' }, { status: 400 })
      }

      const scope = resolveSharePathScope(path, routeIndex)
      if (!scope) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }

      if (pluginConfig.canShareDraft) {
        const allowed = await pluginConfig.canShareDraft(req, scope)
        if (!allowed) {
          return Response.json({ error: 'Forbidden' }, { status: 403 })
        }
      }

      try {
        await assertSharePreviewAccess(req, scope)
      } catch (error) {
        if (error && typeof error === 'object' && 'status' in error) {
          const status = Number((error as { status: number }).status)
          if (status === 401) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
          }
          if (status === 403) {
            return Response.json({ error: 'Forbidden' }, { status: 403 })
          }
        }
        return Response.json({ error: 'Internal server error' }, { status: 500 })
      }

      const pathname = path.split('?')[0] ?? path
      return Response.json({
        url: draft.bootstrapDraftSurface(pathname, 'share', bootstrap),
      })
    },
  }
}

/** Payload plugin: `custom.draft` → liveDraft / shareDraft / publishedLink. */
export function draft(config: PayloadDraftConfig): (incomingConfig: any) => any {
  return (incomingConfig: Config): Config => {
    if (config.enabled === false) return incomingConfig

    const draft = createPayloadDraftSigning({
      ...config,
      apiRoute: incomingConfig.routes?.api ?? '/api',
      publishedPreviewButtonPath: config.publishedPreviewButtonPath ?? PUBLISHED_PREVIEW_BUTTON,
      shareDraftPreviewButtonPath: config.shareDraftPreviewButtonPath ?? SHARE_DRAFT_PREVIEW_BUTTON,
    })

    const routeIndex = buildPreviewRouteIndex(incomingConfig, config.publishedLink?.localePrefix)
    const endpoints = [...(incomingConfig.endpoints ?? [])]
    const already = endpoints.some((ep) => ep.path === '/preview/share-url' && ep.method === 'post')
    if (!already) {
      endpoints.push(
        createSharePreviewEndpoint(draft, draft.defaultShareBootstrap, routeIndex, config)
      )
    }

    return {
      ...incomingConfig,
      endpoints,
      collections: incomingConfig.collections?.map((collection) =>
        mergeCollectionAdmin(collection, draft, config)
      ),
      globals: incomingConfig.globals?.map((global) => mergeGlobalAdmin(global, draft, config)),
    }
  }
}
