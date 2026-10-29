import type { NextResponse } from 'next/server'
import {
  lifecycleExpiryForMode,
  parseCookieInt,
  readDraftIntent,
  readDraftSurface,
} from '../../../consumer/lifecycle'
import type { DraftMode } from '../../../core/config/types'
import type { DraftBootstrapContext } from '../../../core/lifecycle'
import {
  DRAFT_COOKIE_ABS_EXP,
  DRAFT_COOKIE_DOC_PASS,
  DRAFT_COOKIE_GATE,
  DRAFT_COOKIE_IDLE_EXP,
  DRAFT_COOKIE_INTENT,
  DRAFT_COOKIE_SURFACE,
  DRAFT_COOKIE_VIEW,
  DRAFT_IDLE_EXTENSION_SECONDS,
} from '../../../core/lifecycle'
import type { SessionCookieOptions } from '../config'
import { NEXT_DRAFT_BYPASS_COOKIE, NEXT_PREVIEW_DATA_COOKIE } from './next-integration'

export type { DraftSurface } from '../../../core/lifecycle'
export type { DraftBootstrapContext }
export { lifecycleExpiryForMode, parseCookieInt, readDraftIntent, readDraftSurface }

type CookieConfig = { sessionCookie: SessionCookieOptions }

function cookieBase(config: CookieConfig) {
  return {
    httpOnly: true,
    path: config.sessionCookie.path ?? '/',
    sameSite: config.sessionCookie.sameSite,
    secure: config.sessionCookie.secure,
  }
}

export function setDraftLifecycleCookies(
  config: CookieConfig,
  res: NextResponse,
  mode: DraftMode,
  ctx: DraftBootstrapContext,
  nowSec = Math.floor(Date.now() / 1000)
) {
  const { absExp, idleExp } = lifecycleExpiryForMode(mode, nowSec)
  const base = cookieBase(config)
  const maxAgeAbs = Math.max(0, absExp - nowSec)
  res.cookies.set(DRAFT_COOKIE_INTENT, mode, { ...base, maxAge: maxAgeAbs })
  res.cookies.set(DRAFT_COOKIE_ABS_EXP, String(absExp), { ...base, maxAge: maxAgeAbs })
  res.cookies.set(DRAFT_COOKIE_IDLE_EXP, String(idleExp), {
    ...base,
    maxAge: Math.max(0, idleExp - nowSec),
  })
  res.cookies.set(DRAFT_COOKIE_SURFACE, ctx.surface, { ...base, maxAge: maxAgeAbs })
  if (ctx.surface === 'top' && ctx.gate) {
    res.cookies.set(DRAFT_COOKIE_GATE, ctx.gate, { ...base, maxAge: 120 })
  }
}

export function setDraftViewPath(
  config: CookieConfig,
  res: NextResponse,
  pathname: string,
  absExp: number,
  nowSec: number
) {
  const base = cookieBase(config)
  const maxAge = Math.max(0, absExp - nowSec)
  res.cookies.set(DRAFT_COOKIE_VIEW, pathname, { ...base, maxAge })
}

export function refreshDraftLifecycleCookies(
  config: CookieConfig,
  res: NextResponse,
  mode: DraftMode,
  absExp: number,
  nowSec = Math.floor(Date.now() / 1000)
) {
  if (nowSec >= absExp) return
  const idleExp = Math.min(nowSec + DRAFT_IDLE_EXTENSION_SECONDS[mode], absExp)
  const base = cookieBase(config)
  const maxAgeAbs = absExp - nowSec
  res.cookies.set(DRAFT_COOKIE_INTENT, mode, { ...base, maxAge: maxAgeAbs })
  res.cookies.set(DRAFT_COOKIE_ABS_EXP, String(absExp), { ...base, maxAge: maxAgeAbs })
  res.cookies.set(DRAFT_COOKIE_IDLE_EXP, String(idleExp), {
    ...base,
    maxAge: Math.max(0, idleExp - nowSec),
  })
}

export function clearDraftCookies(config: CookieConfig, res: NextResponse) {
  const cleared = { ...cookieBase(config), expires: new Date(0) }
  res.cookies.set(NEXT_DRAFT_BYPASS_COOKIE, '', cleared)
  res.cookies.set(NEXT_PREVIEW_DATA_COOKIE, '', cleared)
  res.cookies.set(DRAFT_COOKIE_INTENT, '', cleared)
  res.cookies.set(DRAFT_COOKIE_ABS_EXP, '', cleared)
  res.cookies.set(DRAFT_COOKIE_IDLE_EXP, '', cleared)
  res.cookies.set(DRAFT_COOKIE_SURFACE, '', cleared)
  res.cookies.set(DRAFT_COOKIE_GATE, '', cleared)
  res.cookies.set(DRAFT_COOKIE_VIEW, '', cleared)
  res.cookies.set(DRAFT_COOKIE_DOC_PASS, '', cleared)
}

export function setShareDocumentPass(config: CookieConfig, res: NextResponse) {
  const base = cookieBase(config)
  res.cookies.set(DRAFT_COOKIE_DOC_PASS, '1', { ...base, maxAge: 120 })
}

export function clearShareDocumentPass(config: CookieConfig, res: NextResponse) {
  const cleared = { ...cookieBase(config), expires: new Date(0) }
  res.cookies.set(DRAFT_COOKIE_DOC_PASS, '', cleared)
}
