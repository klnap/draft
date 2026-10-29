import { DRAFT_PREVIEW_LOCALE_HEADER } from '../../core/config/constants'
import { DRAFT_SURFACE_PATHNAME } from '../../core/url/draft-surface'

/** Internal: `?locale=` on `/draft` (opaque — no allowlist). Host layouts use `getDraftLocale()`. */
export function draftLocaleFromQuery(searchParams: URLSearchParams): string | undefined {
  const value = searchParams.get('locale')
  return value && value.length > 0 ? value : undefined
}

/**
 * Copy `?locale=` from the draft surface URL into a request header for RSC/layout
 * (layouts do not receive `searchParams`). Returns `null` when there is nothing to forward.
 */
export function forwardDraftPreviewLocaleHeaders(
  pathname: string,
  searchParams: URLSearchParams,
  requestHeaders: Headers
): Headers | null {
  if (pathname !== DRAFT_SURFACE_PATHNAME) return null
  const locale = draftLocaleFromQuery(searchParams)
  if (!locale) return null
  const next = new Headers(requestHeaders)
  next.set(DRAFT_PREVIEW_LOCALE_HEADER, locale)
  return next
}
