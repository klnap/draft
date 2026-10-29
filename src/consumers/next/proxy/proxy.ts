import { type NextRequest, NextResponse } from 'next/server'

import { PREVIEW_REQUEST_HEADER, SESSION_COOKIE_NAME } from '../../../core/config/constants'
import type { DraftSessionPayload } from '../../../core/config/types'
import type { DerivedKeys } from '../../../core/crypto/keys'
import { requestPathMatchesSessionBinding } from '../../../core/draft-surface-query'
import {
  readSessionCookie,
  refreshSessionPayload,
  serializeSessionCookie,
  validPreviewSession,
} from '../../../core/session/preview'
import type { ResolvedDraftConsumerConfig } from '../config'
import { isDraftHostname } from '../config/resolve-config'
import { isActivityRequest } from './activity'
import { withDraftLifecycleGate } from './lifecycle-gate'
import { isStaticOrFrameworkAsset } from './static-assets'

const NO_STORE = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
} as const

function emptyNotFound(): NextResponse {
  return new NextResponse(null, { status: 404, headers: NO_STORE })
}

function hostname(config: ResolvedDraftConsumerConfig, req: NextRequest): string {
  return config.hosts.requestHostname(req).toLowerCase()
}

function onDraftHost(config: ResolvedDraftConsumerConfig, req: NextRequest): boolean {
  return isDraftHostname(hostname(config, req), config.hosts.draftHostnames)
}

function isBlockedPublicDraftPath(config: ResolvedDraftConsumerConfig, pathname: string): boolean {
  return Boolean(config.paths?.blockPublicDraftPath?.(pathname))
}

function stripClientPreviewHeader(headers: Headers): void {
  headers.delete(PREVIEW_REQUEST_HEADER)
  headers.delete(PREVIEW_REQUEST_HEADER.toLowerCase())
}

function isQualifiedAppForward(req: NextRequest): boolean {
  if (req.method !== 'GET' && req.headers.has('next-action')) return true
  if (req.method === 'GET' && req.headers.get('rsc') === '1') return true
  if (req.method !== 'GET') return false
  const dest = req.headers.get('sec-fetch-dest')
  if (dest === null) return false
  return dest === 'document' || dest === 'iframe' || dest === 'empty'
}

function resolveInternalPath(
  config: ResolvedDraftConsumerConfig,
  pathname: string,
  searchParams: URLSearchParams
): string | null | 'malformed' {
  const map = config.paths?.getInternalPath
  if (!map) return pathname
  const candidate = map(pathname, searchParams)
  if (candidate === null) return null
  if (typeof candidate !== 'string' || !candidate.startsWith('/') || candidate.startsWith('//')) {
    return 'malformed'
  }
  return candidate
}

/** Drop `locale` from the query only when it is encoded in the internal path (`/pl/draft`). */
function rewriteSearchForInternal(search: string, internal: string): string {
  if (!search || search === '?') return ''
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const localeInInternalPath = /^\/[^/]+\/draft(?:\/|$)/.test(internal)
  if (localeInInternalPath) {
    params.delete('locale')
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

function sessionCookieOptions(config: ResolvedDraftConsumerConfig, maxAge: number) {
  return {
    httpOnly: true,
    path: config.sessionCookie.path ?? '/',
    sameSite: config.sessionCookie.sameSite,
    secure: config.sessionCookie.secure,
    maxAge,
  }
}

function sessionAuthorizesRequest(session: DraftSessionPayload, pathname: string): boolean {
  return requestPathMatchesSessionBinding(session.binding, pathname)
}

function attachSessionRefresh(
  config: ResolvedDraftConsumerConfig,
  keys: DerivedKeys,
  req: NextRequest,
  res: NextResponse,
  session: NonNullable<ReturnType<typeof validPreviewSession>>
): void {
  if (!isActivityRequest(req)) return
  const nowSec = Math.floor(Date.now() / 1000)
  const refreshed = refreshSessionPayload(keys, session, nowSec)
  if (!refreshed) return
  const maxAge = Math.max(0, refreshed.expiresAt - nowSec)
  res.cookies.set(
    SESSION_COOKIE_NAME,
    serializeSessionCookie(keys, refreshed),
    sessionCookieOptions(config, maxAge)
  )
}

export function createDraftProxy(config: ResolvedDraftConsumerConfig, keys: DerivedKeys) {
  const rewriteHeaders = { ...NO_STORE, ...config.rewriteResponseHeaders }

  function rewriteProxy(req: NextRequest): NextResponse {
    const onDraftHostFlag = onDraftHost(config, req)
    const pathname = req.nextUrl.pathname
    const blockedDraftPath = isBlockedPublicDraftPath(config, pathname)
    const session = validPreviewSession(keys, readSessionCookie(req.cookies))

    const headers = new Headers(req.headers)
    stripClientPreviewHeader(headers)

    if (session && !sessionAuthorizesRequest(session, pathname)) {
      return emptyNotFound()
    }

    if (!session) {
      if (onDraftHostFlag) return emptyNotFound()
      if (blockedDraftPath) return emptyNotFound()
      return NextResponse.next({ request: { headers } })
    }

    if (isStaticOrFrameworkAsset(pathname)) {
      return NextResponse.next({ request: { headers } })
    }

    const qualified = isQualifiedAppForward(req) || (session !== null && blockedDraftPath)
    if (qualified) {
      headers.set(PREVIEW_REQUEST_HEADER, session.mode)
    }

    const internal = resolveInternalPath(config, pathname, req.nextUrl.searchParams)
    if (internal === 'malformed') {
      return new NextResponse('Misconfigured getInternalPath', { status: 500, headers: NO_STORE })
    }

    let res: NextResponse
    if (internal !== null && qualified) {
      const rewriteUrl = new URL(
        internal + rewriteSearchForInternal(req.nextUrl.search, internal),
        req.url
      )
      res = NextResponse.rewrite(rewriteUrl, {
        request: { headers },
        headers: rewriteHeaders,
      })
    } else if (onDraftHostFlag && internal === null) {
      return emptyNotFound()
    } else {
      res = NextResponse.next({ request: { headers } })
      if (qualified && blockedDraftPath) {
        for (const [key, value] of Object.entries(rewriteHeaders)) {
          res.headers.set(key, value)
        }
      }
    }

    attachSessionRefresh(config, keys, req, res, session)
    return res
  }

  return withDraftLifecycleGate(config, keys, rewriteProxy)
}
