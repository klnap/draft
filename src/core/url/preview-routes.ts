import { localeCode } from './preview-path'
import {
  applyDynamicSegments,
  extractDynamicSegments,
  type RouteParamsConfig,
} from './route-params'

export type PreviewRoutes = Record<string, string | Record<string, string>>

/** Published-site path templates (`admin.preview`). */
export type PublishedLinkRoutes = PreviewRoutes

export type { RouteParamFieldSpec, RouteParamMapping, RouteParamsConfig } from './route-params'

function patternForLocale(previewRoutes: PreviewRoutes, locale: unknown): string | null {
  const entries = Object.entries(previewRoutes)
  if (entries.length === 0) return null

  const first = entries[0]
  if (!first) return null
  const [, template] = first
  const code = localeCode(locale)
  if (!code) return null

  if (typeof template === 'string') return template
  return template[code] ?? null
}

/** Whether the locale-specific pathname template contains dynamic `[param]` segments. */
export function templateRequiresRouteParams(
  previewRoutes: PreviewRoutes,
  locale: unknown
): boolean {
  const pattern = patternForLocale(previewRoutes, locale)
  if (!pattern) return false
  return extractDynamicSegments(pattern).length > 0
}

/** Build `/${locale}…` path from draft-mode route config + document data. */
export function buildPreviewPath(
  previewRoutes: PreviewRoutes,
  data: Record<string, unknown>,
  locale: unknown,
  routeParams?: RouteParamsConfig
): string | null {
  const code = localeCode(locale)
  if (!code) return null

  const pattern = patternForLocale(previewRoutes, locale)
  if (!pattern) return null

  const resolved = applyDynamicSegments(pattern, data, locale, routeParams)
  if (resolved === null) return null

  if (resolved === '/' || resolved === '') return `/${code}`

  return `/${code}${resolved.startsWith('/') ? resolved : `/${resolved}`}`
}

export type PreviewRouteMatch =
  | { kind: 'collection'; resource: string; params: Record<string, string> }
  | { kind: 'global'; resource: string }

function matchPathSuffixToPattern(
  pathSuffix: string,
  pattern: string
): Record<string, string> | null {
  const pathSegs = pathSuffix.split('/').filter(Boolean)
  const patSegs = (pattern.startsWith('/') ? pattern.slice(1) : pattern).split('/').filter(Boolean)
  if (pathSegs.length !== patSegs.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < patSegs.length; i++) {
    const pat = patSegs[i]
    const seg = pathSegs[i]
    if (!pat || seg === undefined) return null
    if (pat.startsWith('[') && pat.endsWith(']')) {
      try {
        params[pat.slice(1, -1)] = decodeURIComponent(seg)
      } catch {
        return null
      }
    } else if (pat !== seg) {
      return null
    }
  }
  return params
}

/** Match normalized pathname (`/pl/...`) to configured preview routes. */
export function matchPreviewPathname(
  previewRoutes: PreviewRoutes,
  pathname: string
): PreviewRouteMatch | null {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length < 2) return null
  const locale = segments[0]
  const suffix = `/${segments.slice(1).join('/')}`

  for (const [resource, template] of Object.entries(previewRoutes)) {
    const pattern = typeof template === 'string' ? template : locale ? template[locale] : undefined
    if (!pattern) continue
    const normalizedPattern = pattern.startsWith('/') ? pattern : `/${pattern}`
    const params = matchPathSuffixToPattern(suffix, normalizedPattern)
    if (!params) continue
    if (extractDynamicSegments(normalizedPattern).length > 0) {
      return { kind: 'collection', resource, params }
    }
    return { kind: 'global', resource }
  }
  return null
}
