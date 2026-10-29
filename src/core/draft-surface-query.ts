import type { DraftSessionBinding } from './config/types'
import { DRAFT_SURFACE_PATHNAME } from './url/draft-surface'
import { isValidPreviewPath } from './url/url'

/** Normalize site-route pathname for full-page NDM1 / proxy binding (no query). */
export function normalizePreviewPathname(input: string): string | null {
  if (input.includes('?') || input.includes('#')) return null
  if (input.startsWith('http://') || input.startsWith('https://') || input.startsWith('//')) {
    return null
  }
  if (!input.startsWith('/')) return null

  const segments = input.split('/')
  const normalized: string[] = []
  for (const segment of segments) {
    if (segment === '') continue
    if (segment === '.' || segment === '..') return null
    let decoded: string
    try {
      decoded = decodeURIComponent(segment)
    } catch {
      return null
    }
    if (decoded.includes('/') || decoded.includes('\\')) return null
    if (decoded === '.' || decoded === '..') return null
    normalized.push(decoded)
  }

  let pathname = `/${normalized.join('/')}`
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1)
  }
  if (!isValidPreviewPath(pathname)) return null
  return pathname
}

export function requestPathMatchesSessionBinding(
  binding: DraftSessionBinding,
  pathname: string
): boolean {
  if (binding.destinationPathname === DRAFT_SURFACE_PATHNAME) {
    return pathname === DRAFT_SURFACE_PATHNAME
  }
  const normalized = normalizePreviewPathname(pathname)
  if (!normalized) return false
  return normalized === binding.destinationPathname
}
