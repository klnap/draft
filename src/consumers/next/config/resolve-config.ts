import type { DraftMode } from '../../../core/config/types'
import type { DefinedDraft } from '../define-draft'
import { DRAFT_RESPONSE_HEADERS } from '../headers'
import type {
  DraftConsumerConfig,
  DraftHostConfig,
  PathStrategy,
  ResolvedDraftConsumerConfig,
  SessionCookieOptions,
} from './config'

export type { PreviewRoutes } from '../../../core/url/preview-routes'

export function defaultRequestHostname(req: { headers: Headers; nextUrl?: URL }): string {
  const raw =
    req.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
    req.headers.get('host') ||
    req.nextUrl?.hostname ||
    ''
  return raw.split(':')[0]?.toLowerCase() ?? ''
}

export function requestPublicOrigin(req: Request): string {
  const url = new URL(req.url)
  const hostHeader =
    req.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ?? req.headers.get('host')
  if (!hostHeader) return url.origin
  const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const protocol = forwardedProto ?? url.protocol.replace(':', '')
  return `${protocol}://${hostHeader}`
}

function defaultSessionCookie(secure: boolean): SessionCookieOptions {
  return secure ? { sameSite: 'none', secure: true } : { sameSite: 'lax', secure: false }
}

/** Block direct hits to `/…/draft` paths without a valid session. */
export function defaultBlockPublicDraftPath(pathname: string): boolean {
  return /\/draft(\/|$)/.test(pathname)
}

/** True when Host is configured draft URL host or any `draft.*` hostname. */
export function isDraftHostname(hostname: string, draftHostnames: readonly string[]): boolean {
  const host = hostname.toLowerCase()
  if (draftHostnames.some((h) => h.toLowerCase() === host)) return true
  return host.startsWith('draft.')
}

/** Edge-safe subset of `defineDraft` (for `createDraftProxy`). */
export function toDraftProxyConfig(defined: DefinedDraft): DraftConsumerConfig {
  return definedToConsumerConfig(defined)
}

export function definedToConsumerConfig(defined: DefinedDraft): DraftConsumerConfig {
  return {
    secret: defined.secret,
    preview: defined.preview,
    secure: defined.secure,
    sessionCookie: defined.sessionCookie,
    previewRoutes: defined.previewRoutes,
    resolveCollectionId: defined.resolveCollectionId,
    rewriteResponseHeaders: defined.rewriteResponseHeaders,
    mode: defined.mode,
    paths: defined.paths,
    locales: defined.locales,
    defaultLocale: defined.defaultLocale,
    pages: defined.pages,
  }
}

export function resolveDraftConsumerConfig(
  config: DraftConsumerConfig
): ResolvedDraftConsumerConfig {
  const liveUrl = (config.preview?.liveUrl ?? config.liveUrl ?? config.frontendUrl)?.replace(
    /\/$/,
    ''
  )
  const draftUrl = (
    config.preview?.draftUrl ??
    config.draftUrl ??
    config.draftFrontendUrl ??
    liveUrl
  )?.replace(/\/$/, '')

  if (!liveUrl || !draftUrl) {
    throw new Error('DraftConsumerConfig: provide preview.liveUrl (and optional preview.draftUrl)')
  }

  const mode =
    config.mode ??
    (new URL(liveUrl).hostname.toLowerCase() === new URL(draftUrl).hostname.toLowerCase()
      ? 'path'
      : 'origin')

  const secure = config.secure ?? process.env.NODE_ENV !== 'development'
  const sessionCookie = config.sessionCookie ?? defaultSessionCookie(secure)

  const draftHostnames =
    mode === 'origin' ? ([new URL(draftUrl).hostname.toLowerCase()] as const) : ([] as const)

  const hosts: DraftHostConfig = config.hosts ?? {
    draftHostnames,
    requestHostname: config.requestHostname ?? defaultRequestHostname,
  }

  // CMS live + share bootstrap always land on draft surface origin.
  const resolveBootstrapOrigin =
    config.resolveBootstrapOrigin ?? ((_mode: DraftMode, _req: Request) => draftUrl)

  const paths: PathStrategy = config.paths ?? {
    blockPublicDraftPath: defaultBlockPublicDraftPath,
  }
  const pathsResolved = paths.blockPublicDraftPath
    ? paths
    : { ...paths, blockPublicDraftPath: defaultBlockPublicDraftPath }

  return {
    secret: config.secret,
    previewRoutes: config.previewRoutes,
    resolveCollectionId: config.resolveCollectionId,
    sessionCookie,
    hosts: {
      ...hosts,
      draftHostnames: config.hosts?.draftHostnames ?? draftHostnames,
    },
    paths: pathsResolved,
    resolveBootstrapOrigin,
    rewriteResponseHeaders: config.rewriteResponseHeaders ?? DRAFT_RESPONSE_HEADERS,
    draftHostnames: config.hosts?.draftHostnames ?? draftHostnames,
    mode,
    liveUrl,
    draftUrl,
    locales: config.locales,
    defaultLocale: config.defaultLocale,
    pages: config.pages,
  }
}
