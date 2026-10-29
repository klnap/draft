import type { DraftMode } from '../../../core/config/types'
import type { PreviewRoutes } from '../../../core/url/preview-routes'
import type { BootstrapResolveCollectionId } from '../bootstrap-resolve'
import type { DraftPagesRegistry } from '../draft-registry'

export type SessionCookieOptions = {
  sameSite: 'lax' | 'strict' | 'none'
  secure: boolean
  path?: string
}

export type PathStrategy = {
  getInternalPath?: (pathname: string, searchParams?: URLSearchParams) => string | null
  blockPublicDraftPath?: (pathname: string) => boolean
}

export type DraftHostConfig = {
  draftHostnames: readonly string[]
  requestHostname: (req: { headers: Headers; nextUrl?: URL }) => string
}

export type DraftPreviewUrls = {
  liveUrl: string
  draftUrl?: string
}

/**
 * Next consumer config.
 *
 * Happy path: use `defineDraft({ secret, preview })` then `createDraftProxy()`.
 * Advanced: pass this shape directly to `createDraftProxy(config)`.
 */
export type DraftConsumerConfig = {
  secret: string
  preview?: DraftPreviewUrls
  /**
   * Cookie `Secure` + `SameSite=None` when true; `lax` + insecure when false.
   * Default: `NODE_ENV !== 'development'`.
   */
  secure?: boolean
  /** Derived or override — origin vs path from preview hostnames. */
  mode?: 'origin' | 'path'
  paths?: PathStrategy
  /** Full-page preview route templates (consumer bootstrap). */
  previewRoutes?: PreviewRoutes
  resolveCollectionId?: BootstrapResolveCollectionId
  sessionCookie?: SessionCookieOptions
  requestHostname?: DraftHostConfig['requestHostname']
  resolveBootstrapOrigin?: (mode: DraftMode, req: Request) => string
  rewriteResponseHeaders?: Record<string, string>
  /** Test / advanced escape hatch. */
  hosts?: DraftHostConfig
  /** @deprecated Use `preview.draftUrl`. */
  draftUrl?: string
  /** @deprecated Use `preview.liveUrl`. */
  liveUrl?: string
  /** @deprecated Use `preview.draftUrl`. */
  draftFrontendUrl?: string
  /** @deprecated Use `preview.liveUrl`. */
  frontendUrl?: string
  locales?: readonly string[]
  defaultLocale?: string
  pages?: DraftPagesRegistry
  /** @deprecated Unused. */
  rewriteRoutes?: import('../../../core/url/preview-routes').PreviewRoutes
}

/** Internal shape after `resolveDraftConsumerConfig`. */
export type ResolvedDraftConsumerConfig = {
  secret: string
  sessionCookie: SessionCookieOptions
  hosts: DraftHostConfig
  paths?: PathStrategy
  previewRoutes?: PreviewRoutes
  resolveCollectionId?: BootstrapResolveCollectionId
  resolveBootstrapOrigin: (mode: DraftMode, req: Request) => string
  rewriteResponseHeaders?: Record<string, string>
  draftHostnames: readonly string[]
  mode: 'origin' | 'path'
  liveUrl: string
  draftUrl: string
  locales?: readonly string[]
  defaultLocale?: string
  pages?: DraftPagesRegistry
}

/**
 * Soft-session API. Callable (= proxy) so `defineProxy(name, await createDraftProxy())` works.
 * Public signature is `Request`/`Response` (same idea as `@klnap/revalidation` handlers) —
 * keep Next types inside the package so host/peer `next` installs do not clash.
 */
export type DraftModeApi = ((req: Request, ..._args: unknown[]) => Response) & {
  proxy: (req: Request) => Response
  route: (req: Request) => Promise<Response>
  isEnabled: (options?: { pathname?: string }) => Promise<boolean>
  isDraftHost: (hostname: string) => boolean
  mode: 'origin' | 'path'
}

export { buildPreviewPath, type PreviewRoutes } from '../../../core/url/preview-routes'
