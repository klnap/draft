import { type NextRequest, NextResponse } from 'next/server'

import { evaluateSoftLifecycleBypass } from '../../../consumer/lifecycle-gate'
import { SESSION_COOKIE_NAME } from '../../../core/config/constants'
import type { DerivedKeys } from '../../../core/crypto/keys'
import { readSessionCookie, validPreviewSession } from '../../../core/session/preview'
import type { ResolvedDraftConsumerConfig } from '../config'
import { isDraftHostname } from '../config/resolve-config'
import {
  clearDraftCookies,
  clearShareDocumentPass,
  DRAFT_COOKIE_ABS_EXP,
  DRAFT_COOKIE_DOC_PASS,
  DRAFT_COOKIE_GATE,
  DRAFT_COOKIE_INTENT,
  DRAFT_COOKIE_SURFACE,
  DRAFT_COOKIE_VIEW,
  DRAFT_QUERY_GATE,
  NEXT_DRAFT_BYPASS_COOKIE,
  parseCookieInt,
  readDraftIntent,
  refreshDraftLifecycleCookies,
  setDraftViewPath,
  setShareDocumentPass,
} from '../lifecycle'

const NO_STORE = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
} as const

function emptyNotFound(): NextResponse {
  return new NextResponse(null, { status: 404, headers: NO_STORE })
}

function onDraftHost(config: ResolvedDraftConsumerConfig, req: NextRequest): boolean {
  return isDraftHostname(
    config.hosts.requestHostname(req).toLowerCase(),
    config.hosts.draftHostnames
  )
}

function clearSession(
  config: ResolvedDraftConsumerConfig,
  req: NextRequest,
  onDraftHostFlag: boolean
): NextResponse {
  if (onDraftHostFlag) {
    const res = emptyNotFound()
    clearDraftCookies(config, res)
    res.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      path: config.sessionCookie.path ?? '/',
      sameSite: config.sessionCookie.sameSite,
      secure: config.sessionCookie.secure,
      expires: new Date(0),
    })
    return res
  }
  const res = NextResponse.redirect(req.nextUrl)
  clearDraftCookies(config, res)
  res.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    path: config.sessionCookie.path ?? '/',
    sameSite: config.sessionCookie.sameSite,
    secure: config.sessionCookie.secure,
    expires: new Date(0),
  })
  return res
}

function mergeLifecycleRefresh(
  config: ResolvedDraftConsumerConfig,
  res: NextResponse,
  intent: 'live' | 'share',
  absExp: number,
  nowSec: number
): NextResponse {
  refreshDraftLifecycleCookies(config, res, intent, absExp, nowSec)
  return res
}

/** Soft-session UX (iframe vs document, share gate) around rewrite proxy. */
export function withDraftLifecycleGate(
  config: ResolvedDraftConsumerConfig,
  keys: DerivedKeys,
  baseProxy: (req: NextRequest) => NextResponse
) {
  return function draftProxyWithLifecycle(req: NextRequest): NextResponse {
    const onDraftHostFlag = onDraftHost(config, req)
    const pathname = req.nextUrl.pathname
    const hasBypass = Boolean(req.cookies.get(NEXT_DRAFT_BYPASS_COOKIE)?.value)
    const blockedDraftPath = Boolean(config.paths?.blockPublicDraftPath?.(pathname))
    const session = validPreviewSession(keys, readSessionCookie(req.cookies))

    if (onDraftHostFlag && !hasBypass) {
      return emptyNotFound()
    }

    if (!onDraftHostFlag && blockedDraftPath && !hasBypass && !session) {
      return emptyNotFound()
    }

    if (!hasBypass) {
      return baseProxy(req)
    }

    const nowSec = Math.floor(Date.now() / 1000)
    const absExp = parseCookieInt(req.cookies.get(DRAFT_COOKIE_ABS_EXP)?.value)
    const intentCookie = req.cookies.get(DRAFT_COOKIE_INTENT)?.value

    const decision = evaluateSoftLifecycleBypass({
      nowSec,
      intentCookie,
      absExpCookie: req.cookies.get(DRAFT_COOKIE_ABS_EXP)?.value,
      surfaceCookie: req.cookies.get(DRAFT_COOKIE_SURFACE)?.value,
      fetchDest: req.headers.get('sec-fetch-dest'),
      pathname,
      onDraftHost: onDraftHostFlag,
      gateQuery: req.nextUrl.searchParams.get(DRAFT_QUERY_GATE),
      gateCookie: req.cookies.get(DRAFT_COOKIE_GATE)?.value,
      viewPath: req.cookies.get(DRAFT_COOKIE_VIEW)?.value,
      docPass: req.cookies.get(DRAFT_COOKIE_DOC_PASS)?.value === '1',
      isBlockedPublicDraftPath: Boolean(config.paths?.blockPublicDraftPath?.(pathname)),
    })

    if (decision.action === 'clear_session') {
      return clearSession(config, req, onDraftHostFlag)
    }

    const intent = readDraftIntent(intentCookie)
    if (!intent) {
      return clearSession(config, req, onDraftHostFlag)
    }
    const absExpValue = absExp ?? nowSec

    if (decision.action === 'accept_gate_redirect') {
      const clean = req.nextUrl.clone()
      clean.searchParams.delete(DRAFT_QUERY_GATE)
      const res = NextResponse.redirect(clean)
      const cleared = { expires: new Date(0), path: '/' }
      res.cookies.set(DRAFT_COOKIE_GATE, '', cleared)
      setDraftViewPath(config, res, decision.setViewPath, absExpValue, nowSec)
      setShareDocumentPass(config, res)
      refreshDraftLifecycleCookies(config, res, intent, absExpValue, nowSec)
      return res
    }

    const runBase = () => {
      const res = baseProxy(req)
      return mergeLifecycleRefresh(config, res, intent, absExpValue, nowSec)
    }

    if (decision.action === 'run_base') {
      const res = runBase()
      if ('clearDocPass' in decision && decision.clearDocPass) {
        clearShareDocumentPass(config, res)
        setDraftViewPath(config, res, decision.setViewPath, absExpValue, nowSec)
      } else if ('setViewPath' in decision && decision.setViewPath) {
        setDraftViewPath(config, res, decision.setViewPath, absExpValue, nowSec)
      }
      return res
    }

    return clearSession(config, req, onDraftHostFlag)
  }
}
