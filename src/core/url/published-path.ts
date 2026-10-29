import { localeCode } from './preview-path'
import { buildPreviewPath, type PreviewRoutes } from './preview-routes'
import { applyDynamicSegments, type RouteParamsConfig } from './route-params'

/** Per-locale URL prefix before pathname (`''` = no prefix). */
export type LocalePrefix = Record<string, string>

export type PublishedLinkPathTemplate = {
  path?: string
  paths?: Record<string, string>
  routes?: PreviewRoutes
  params?: RouteParamsConfig
}

export type ResolvedPublishedPathConfig = PublishedLinkPathTemplate & {
  localePrefix: LocalePrefix
}

export function mergeLocalePrefix(plugin?: LocalePrefix, schema?: LocalePrefix): LocalePrefix {
  return {
    ...(plugin ?? {}),
    ...(schema ?? {}),
  }
}

function normalizeLocalePrefix(prefix: string): string {
  const trimmed = prefix.trim()
  if (!trimmed || trimmed === '/') return ''
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return withLeading.replace(/\/+$/, '')
}

export function resolveLocaleRoutePrefix(localePrefix: LocalePrefix, code: string): string | null {
  if (Object.keys(localePrefix).length === 0) {
    return `/${code}`
  }
  const explicit = localePrefix[code]
  if (explicit === undefined) {
    return null
  }
  return normalizeLocalePrefix(explicit)
}

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

export function resolvePathTemplate(
  config: Pick<PublishedLinkPathTemplate, 'path' | 'paths' | 'routes'>,
  locale: unknown
): string | null {
  const code = localeCode(locale)
  if (!code) return null
  const localized = config.paths?.[code]
  if (localized) return localized
  if (config.path) return config.path
  if (config.routes) return patternForLocale(config.routes, locale)
  return null
}

function joinPrefixAndPath(prefix: string, pathname: string): string {
  if (pathname === '/' || pathname === '') {
    return prefix || '/'
  }
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`
  return `${prefix}${normalized}`
}

function usesLegacyPreviewPathBuilder(config: ResolvedPublishedPathConfig): boolean {
  const hasNewTemplate =
    Boolean(config.path) || Boolean(config.paths && Object.keys(config.paths).length > 0)
  if (hasNewTemplate) return false
  if (!config.routes || Object.keys(config.routes).length === 0) return false
  return Object.keys(config.localePrefix).length === 0
}

/** Build site pathname (no origin) for a published document or global. */
export function buildPublishedPath(
  config: ResolvedPublishedPathConfig,
  data: Record<string, unknown>,
  locale: unknown
): string | null {
  if (usesLegacyPreviewPathBuilder(config)) {
    return buildPreviewPath(config.routes!, data, locale, config.params)
  }

  const code = localeCode(locale)
  if (!code) return null

  const pattern = resolvePathTemplate(config, locale)
  if (!pattern) return null

  const resolved = applyDynamicSegments(pattern, data, locale, config.params)
  if (resolved === null) return null

  const prefix = resolveLocaleRoutePrefix(config.localePrefix, code)
  if (prefix === null) return null

  return joinPrefixAndPath(prefix, resolved)
}

export function resolvePublishedPathConfig(
  pluginLocalePrefix?: LocalePrefix,
  link?: PublishedLinkPathTemplate & { localePrefix?: LocalePrefix }
): ResolvedPublishedPathConfig | null {
  if (!link) return null
  const hasRoutes =
    link.routes && typeof link.routes === 'object' && Object.keys(link.routes).length > 0
  const hasPath = typeof link.path === 'string' && link.path.length > 0
  const hasPaths = link.paths && Object.keys(link.paths).length > 0
  if (!hasRoutes && !hasPath && !hasPaths) return null

  return {
    localePrefix: mergeLocalePrefix(pluginLocalePrefix, link.localePrefix),
    path: link.path,
    paths: link.paths,
    routes: hasRoutes ? link.routes : undefined,
    params: link.params,
  }
}
