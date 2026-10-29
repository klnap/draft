import type { PayloadRequest } from 'payload'

import { createDraftProducer } from '../../../adapters/producer'
import { buildDraftSurfacePath } from '../../../core/url/draft-surface'
import { localeCode } from '../../../core/url/preview-path'
import {
  buildPublishedPath,
  type ResolvedPublishedPathConfig,
} from '../../../core/url/published-path'
import type { PayloadDraftCustom } from '../draft-custom'
import { type ResolvedDraftBootstrap, resolveDraftBootstrap } from '../draft-resolve'
import type {
  DraftLivePreviewBreakpoint,
  PayloadDraftConfigWithLivePreview,
} from '../live-preview-breakpoints'
import type { SharePathResolution } from './share-preview-access'

/** Payload plugin config — `draft({ secret, preview: { liveUrl, draftUrl? } })`. */
export type PayloadDraftConfig = PayloadDraftConfigWithLivePreview & {
  secret: string
  preview: {
    /** Published site origin („open page”). */
    liveUrl: string
    /** Draft surface origin (share + live-preview iframe). Omit → path mode (= liveUrl). */
    draftUrl?: string
  }
  bootstrapPath?: string
  enabled?: boolean
  /** Payload `routes.api` — injected by `draft()` plugin. */
  apiRoute?: string
  /** Admin component import paths (wired by plugin; not used by signing crypto). */
  publishedPreviewButtonPath?: string
  shareDraftPreviewButtonPath?: string
  /** Optional host hook after path resolution, before Payload ACL. */
  canShareDraft?: (req: PayloadRequest, scope: SharePathResolution) => boolean | Promise<boolean>
}

export type DraftCollectionAdminWireOptions = {
  publishedLink?: ResolvedPublishedLinkWire
  liveDraft: ResolvedDraftBootstrap
  shareDraft: ResolvedDraftBootstrap & { enabled: boolean }
  draftMeta?: PayloadDraftCustom
}

export type DraftCollectionAdminOptions = DraftCollectionAdminWireOptions & {
  livePreviewBreakpoints: DraftLivePreviewBreakpoint[]
}

export type ResolvedPublishedLinkWire = {
  enabled: boolean
  pathConfig: ResolvedPublishedPathConfig
}

export type PayloadDraftApi = ReturnType<typeof createPayloadDraftSigning>

function documentId(data: Record<string, unknown>): string | null {
  const raw = data.id
  if (typeof raw === 'string' && raw.length > 0) return raw
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw)
  return null
}

/** Globals: Payload versions differ on `edit` vs `elements` — mirror controls in both. */
function mergeGlobalDocumentControls(
  admin: Record<string, unknown>,
  patch: Record<string, unknown>
) {
  mergeAdminComponents(admin, 'elements', patch)
  mergeAdminComponents(admin, 'edit', patch)
}

function mergeAdminComponents(
  admin: Record<string, unknown>,
  slot: 'edit' | 'elements',
  patch: Record<string, unknown>
) {
  const existing = admin.components as Record<string, Record<string, unknown>> | undefined
  const slotComponents = existing?.[slot] ?? {}
  admin.components = {
    ...existing,
    [slot]: {
      ...slotComponents,
      ...patch,
    },
  }
}

const DEFAULT_PUBLISHED_PREVIEW_BUTTON_PATH =
  '@klnap/draft/producers/payload/admin/PublishedPreviewButton'
const DEFAULT_SHARE_DRAFT_PREVIEW_BUTTON_PATH =
  '@klnap/draft/producers/payload/admin/ShareDraftPreviewButton'

export function createPayloadDraftSigning(config: PayloadDraftConfig) {
  const producer = createDraftProducer({
    rootSecret: config.secret,
    bootstrapPath: config.bootstrapPath,
  })
  const frontendOrigin = config.preview.liveUrl.replace(/\/$/, '')
  const draftFrontendOrigin = (config.preview.draftUrl ?? config.preview.liveUrl).replace(/\/$/, '')
  const apiRoute = config.apiRoute ?? '/api'
  const publishedPreviewButtonPath =
    config.publishedPreviewButtonPath ?? DEFAULT_PUBLISHED_PREVIEW_BUTTON_PATH
  const shareDraftPreviewButtonPath =
    config.shareDraftPreviewButtonPath ?? DEFAULT_SHARE_DRAFT_PREVIEW_BUTTON_PATH
  const defaultShareBootstrap = resolveDraftBootstrap('share', config.shareDraft, undefined)

  function publishedPreviewButtonComponent(options: DraftCollectionAdminOptions) {
    if (!options.publishedLink?.enabled) {
      return publishedPreviewButtonPath
    }
    return {
      path: publishedPreviewButtonPath,
      clientProps: {
        frontendOrigin,
        publishedPathConfig: options.publishedLink.pathConfig,
      },
    }
  }

  function bootstrapUrl(
    path: string,
    mode: 'live' | 'share',
    origin?: string,
    bootstrap?: ResolvedDraftBootstrap
  ): string {
    const base = (origin ?? frontendOrigin).replace(/\/$/, '')
    const claims = bootstrap ?? resolveDraftBootstrap(mode, undefined, undefined)
    return producer.bootstrapUrl(base, {
      mode,
      destinationPath: path,
      ttl: claims.ttl,
      refreshOnActivity: claims.refreshOnActivity,
    })
  }

  /** Live preview + share always bootstrap on draft surface origin. */
  function bootstrapDraftSurface(
    path: string,
    mode: 'live' | 'share',
    bootstrap?: ResolvedDraftBootstrap
  ): string {
    return bootstrapUrl(path, mode, draftFrontendOrigin, bootstrap)
  }

  function frameFromComponentPreview(
    preview: PayloadDraftCustom['componentPreview'],
    locale: unknown
  ): string | undefined {
    if (!preview) return undefined
    const code = localeCode(locale)
    if (preview.defaultFrame) {
      if (typeof preview.defaultFrame === 'string') return preview.defaultFrame
      if (code && preview.defaultFrame[code]) return preview.defaultFrame[code]
    }
    return preview.defaultRoute
  }

  function buildPublishedLinkUrl(
    pathConfig: ResolvedPublishedPathConfig,
    data: Record<string, unknown>,
    locale: unknown
  ): string | null {
    const path = buildPublishedPath(pathConfig, data, locale)
    return path ? `${frontendOrigin}${path}` : null
  }

  function shareDraftOnCollection(
    resource: string,
    options: {
      buttonPath: string
      shareDraft: ResolvedDraftBootstrap
      publishedLink?: ResolvedPublishedLinkWire
    }
  ) {
    return {
      components: {
        edit: {
          beforeDocumentControls: [
            {
              path: options.buttonPath,
              clientProps: {
                resource,
                apiRoute,
                shareDraftTtl: options.shareDraft.ttl,
                shareDraftRefreshOnActivity: options.shareDraft.refreshOnActivity,
                publishedPathConfig: options.publishedLink?.enabled
                  ? options.publishedLink.pathConfig
                  : undefined,
                shareViaDraftSurface: true,
                shareDocumentKind: 'collection',
              },
            },
          ],
        },
      },
    }
  }

  function shareDraftOnGlobal(
    resource: string,
    options: {
      buttonPath: string
      shareDraft: ResolvedDraftBootstrap
      publishedLink?: ResolvedPublishedLinkWire
    }
  ) {
    return {
      components: {
        elements: {
          beforeDocumentControls: [
            {
              path: options.buttonPath,
              clientProps: {
                resource,
                apiRoute,
                shareDraftTtl: options.shareDraft.ttl,
                shareDraftRefreshOnActivity: options.shareDraft.refreshOnActivity,
                publishedPathConfig: options.publishedLink?.enabled
                  ? options.publishedLink.pathConfig
                  : undefined,
                shareViaDraftSurface: true,
                shareDocumentKind: 'global',
              },
            },
          ],
        },
      },
    }
  }

  function collectionPreview(resource: string, options: DraftCollectionAdminOptions) {
    const admin: Record<string, unknown> = {
      livePreview: {
        breakpoints: options.livePreviewBreakpoints,
        url: ({ data, locale }: { data: Record<string, unknown>; locale: unknown }) => {
          const id = documentId(data)
          if (!id) return null
          const code = localeCode(locale)
          const destinationPath = buildDraftSurfacePath({
            resource,
            id,
            locale: code ?? undefined,
          })
          return bootstrapDraftSurface(destinationPath, 'live', options.liveDraft)
        },
      },
    }

    if (options.publishedLink?.enabled) {
      admin.preview = (data: Record<string, unknown>, { locale }: { locale: unknown }) =>
        buildPublishedLinkUrl(options.publishedLink!.pathConfig, data, locale)
      mergeAdminComponents(admin, 'edit', {
        PreviewButton: publishedPreviewButtonComponent(options),
      })
    }

    if (options.shareDraft.enabled) {
      const share = shareDraftOnCollection(resource, {
        buttonPath: shareDraftPreviewButtonPath,
        shareDraft: options.shareDraft,
        publishedLink: options.publishedLink,
      })
      mergeAdminComponents(admin, 'edit', share.components.edit as Record<string, unknown>)
    }

    return admin
  }

  function globalPreview(resource: string, options: DraftCollectionAdminOptions) {
    const admin: Record<string, unknown> = {
      livePreview: {
        breakpoints: options.livePreviewBreakpoints,
        url: ({ locale }: { data: Record<string, unknown>; locale: unknown }) => {
          const code = localeCode(locale)
          const frame = frameFromComponentPreview(options.draftMeta?.componentPreview, locale)
          const destinationPath = buildDraftSurfacePath({
            resource,
            locale: code ?? undefined,
            frame,
          })
          return bootstrapDraftSurface(destinationPath, 'live', options.liveDraft)
        },
      },
    }

    if (options.publishedLink?.enabled) {
      admin.preview = (data: Record<string, unknown>, { locale }: { locale: unknown }) =>
        buildPublishedLinkUrl(options.publishedLink!.pathConfig, data, locale)
      mergeGlobalDocumentControls(admin, {
        PreviewButton: publishedPreviewButtonComponent(options),
      })
    }

    if (options.shareDraft.enabled) {
      const share = shareDraftOnGlobal(resource, {
        buttonPath: shareDraftPreviewButtonPath,
        shareDraft: options.shareDraft,
        publishedLink: options.publishedLink,
      })
      mergeGlobalDocumentControls(admin, share.components.elements as Record<string, unknown>)
    }

    return admin
  }

  return {
    buildPublishedLinkUrl,
    collectionPreview,
    globalPreview,
    shareDraftOnCollection,
    shareDraftOnGlobal,
    bootstrapUrl,
    bootstrapDraftSurface,
    defaultShareBootstrap,
    signDraftBootstrapToken: producer.signBootstrapToken.bind(producer),
    frontendOrigin,
    draftFrontendOrigin,
  }
}
