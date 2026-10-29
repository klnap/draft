import { localeCode } from '../../../core/url/preview-path'
import {
  buildPublishedPath,
  type ResolvedPublishedPathConfig,
} from '../../../core/url/published-path'

export function publishedPreviewHref(
  frontendOrigin: string,
  pathConfig: ResolvedPublishedPathConfig,
  data: Record<string, unknown> | undefined,
  locale: unknown
): string | null {
  const path = buildPublishedPath(pathConfig, data ?? {}, locale)
  if (!path) return null
  return `${frontendOrigin.replace(/\/$/, '')}${path}`
}

export function publishedPreviewHrefFromLocaleCode(
  frontendOrigin: string,
  pathConfig: ResolvedPublishedPathConfig,
  data: Record<string, unknown> | undefined,
  localeCodeValue: string
): string | null {
  return publishedPreviewHref(frontendOrigin, pathConfig, data, localeCodeValue)
}

export function publishedPreviewHrefLocale(
  frontendOrigin: string,
  pathConfig: ResolvedPublishedPathConfig,
  data: Record<string, unknown> | undefined,
  locale: unknown
): string | null {
  const code = localeCode(locale)
  if (!code) return null
  return publishedPreviewHrefFromLocaleCode(frontendOrigin, pathConfig, data, code)
}
