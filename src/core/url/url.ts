import { DRAFT_MODES } from '../config/constants'
import type { DraftMode } from '../config/types'

function isValidPreviewPathname(pathname: string): boolean {
  if (pathname.length === 0 || pathname.length > 512) return false
  if (!pathname.startsWith('/') || pathname.startsWith('//')) return false
  if (pathname.includes('\\')) return false
  if (pathname.includes('..')) return false
  if (/%2e%2e/i.test(pathname)) return false
  for (let i = 0; i < pathname.length; i++) {
    const code = pathname.charCodeAt(i)
    if (code <= 0x1f || code === 0x7f) return false
  }

  for (const segment of pathname.split('/')) {
    if (segment.length === 0) continue
    let decoded: string
    try {
      decoded = decodeURIComponent(segment)
    } catch {
      return false
    }
    if (decoded === '..' || decoded.includes('/') || decoded.includes('\\')) return false
  }

  const lower = pathname.toLowerCase()
  if (lower.startsWith('/javascript:') || lower.startsWith('/data:')) return false

  return true
}

function isValidPreviewSearch(search: string): boolean {
  if (!search.startsWith('?') || search.length > 512) return false
  const params = new URLSearchParams(search.slice(1))
  for (const [key, value] of params.entries()) {
    if (key.length === 0 || key.length > 64) return false
    if (value.length > 256) return false
    if (value.includes('..')) return false
    if (/%2e%2e/i.test(value)) return false
    if (value.includes('\\')) return false
    if (/^https?:/i.test(value) || /^\/\//.test(value)) return false
  }
  return true
}

/** Relative in-app preview path (no scheme/host). Rejects open-redirect and traversal shapes. */
export function isValidPreviewPath(path: string): boolean {
  const qIndex = path.indexOf('?')
  const pathname = qIndex === -1 ? path : path.slice(0, qIndex)
  const search = qIndex === -1 ? '' : path.slice(qIndex)
  if (!isValidPreviewPathname(pathname)) return false
  if (search && !isValidPreviewSearch(search)) return false
  return true
}

export function isDraftMode(value: string): value is DraftMode {
  return (DRAFT_MODES as readonly string[]).includes(value)
}

export function liveBucketExp(nowSec: number, ttl: number): number {
  return (Math.floor(nowSec / ttl) + 1) * ttl
}
