import { type NextRequest, NextResponse } from 'next/server'

import { forwardDraftPreviewLocaleHeaders } from '../preview-locale-core'

/**
 * Optional proxy-chain step: pass `?locale=` on `/draft` to downstream RSC via header.
 * Framework-agnostic locale value; no next-intl dependency.
 */
export function draftPreviewLocaleProxy(req: NextRequest): NextResponse | null {
  const forwarded = forwardDraftPreviewLocaleHeaders(
    req.nextUrl.pathname,
    req.nextUrl.searchParams,
    req.headers
  )
  if (!forwarded) return null
  return NextResponse.next({ request: { headers: forwarded } })
}
