import type { PreviewRoutes } from './preview-routes'
import type { LocalePrefix, PublishedLinkPathTemplate } from './published-path'
import { resolvePathTemplate, resolvePublishedPathConfig } from './published-path'

/** Legacy `routes` keyed by locale code (`en`, `pl`) rather than pathname template. */
export function isFlatLocalePreviewRouteMap(routes: PreviewRoutes): boolean {
  return Object.entries(routes).every(
    ([key, value]) => typeof value === 'string' && !key.startsWith('/')
  )
}

/** Locale-specific path templates (suffix after `/{locale}`) for `matchPreviewPathname`. */
export function previewRouteTemplatesFromPublishedLink(
  link: PublishedLinkPathTemplate,
  locales: readonly string[],
  pluginLocalePrefix?: LocalePrefix
): PreviewRoutes[string] {
  const config = resolvePublishedPathConfig(pluginLocalePrefix, link)
  if (!config) return {}

  if (config.routes && isFlatLocalePreviewRouteMap(config.routes)) {
    const templates: Record<string, string> = {}
    for (const locale of locales) {
      const pattern = config.routes[locale]
      if (typeof pattern !== 'string') continue
      templates[locale] = pattern.startsWith('/') ? pattern : `/${pattern}`
    }
    return templates
  }

  const templates: Record<string, string> = {}
  for (const locale of locales) {
    const pattern = resolvePathTemplate(config, locale)
    if (!pattern) continue
    templates[locale] = pattern.startsWith('/') ? pattern : `/${pattern}`
  }
  return templates
}
