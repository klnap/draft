import { cookies, draftMode } from 'next/headers'
import { NextResponse } from 'next/server'

import { createDraftProtocolSurface } from '../../../adapters/protocol-surface'
import { SESSION_COOKIE_NAME } from '../../../core/config/constants'
import { checkMemoryRateLimit, clientKeyFromRequest } from '../../../core/rate-limit/memory-window'
import { planNextBootstrapFromToken } from '../bootstrap-plan'
import type { ResolvedDraftConsumerConfig } from '../config'
import { setDraftLifecycleCookies } from '../lifecycle'
import { NEXT_DRAFT_BYPASS_COOKIE, NEXT_PREVIEW_DATA_COOKIE } from '../lifecycle/next-integration'

const NO_STORE = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
} as const

function attachNextDraftModeCookies(
  config: ResolvedDraftConsumerConfig,
  res: NextResponse,
  jar: Awaited<ReturnType<typeof cookies>>
): void {
  const base = {
    httpOnly: true,
    path: config.sessionCookie.path ?? '/',
    sameSite: config.sessionCookie.sameSite,
    secure: config.sessionCookie.secure,
  }
  const bypass = jar.get(NEXT_DRAFT_BYPASS_COOKIE)?.value
  const previewData = jar.get(NEXT_PREVIEW_DATA_COOKIE)?.value
  if (bypass) res.cookies.set(NEXT_DRAFT_BYPASS_COOKIE, bypass, base)
  if (previewData) res.cookies.set(NEXT_PREVIEW_DATA_COOKIE, previewData, base)
}

export function createDraftRouteHandler(config: ResolvedDraftConsumerConfig) {
  const protocol = createDraftProtocolSurface({ rootSecret: config.secret })

  return async function GET(req: Request): Promise<Response> {
    const rateKey = `draft-bootstrap:${clientKeyFromRequest(req)}`
    if (!checkMemoryRateLimit(rateKey, 120, 60_000)) {
      return new Response('Too Many Requests', { status: 429, headers: NO_STORE })
    }

    const url = new URL(req.url)
    const tokens = url.searchParams.getAll('token')
    const plan = await planNextBootstrapFromToken(protocol, config, {
      tokenWire: tokens[0] ?? '',
      tokenCount: tokens.length,
      hasLegacyPathParams: url.searchParams.has('path') || url.searchParams.has('destinationPath'),
      resolveBootstrapOrigin: (mode) => config.resolveBootstrapOrigin(mode, req),
      secFetchDest: req.headers.get('sec-fetch-dest'),
    })

    if (!plan.ok) {
      const status = plan.reason === 'bad_request' ? 400 : 403
      return new Response(plan.reason === 'bad_request' ? 'Bad Request' : 'Forbidden', {
        status,
        headers: NO_STORE,
      })
    }

    const d = await draftMode()
    d.enable()

    const { value } = plan
    const nowSec = Math.floor(Date.now() / 1000)
    const maxAge = Math.max(0, value.sessionPayload.expiresAt - nowSec)
    const cookieOpts = {
      httpOnly: true,
      path: config.sessionCookie.path ?? '/',
      sameSite: config.sessionCookie.sameSite,
      secure: config.sessionCookie.secure,
      maxAge,
    } as const

    const cookieStore = await cookies()
    const res = NextResponse.redirect(value.redirectUrl)
    res.cookies.set(SESSION_COOKIE_NAME, value.sessionWire, cookieOpts)
    setDraftLifecycleCookies(config, res, value.claims.mode, value.lifecycle, nowSec)
    attachNextDraftModeCookies(config, res, cookieStore)

    for (const [key, val] of Object.entries(NO_STORE)) {
      res.headers.set(key, val)
    }
    return res
  }
}
