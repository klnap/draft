import 'server-only'

import { cookies, draftMode, headers } from 'next/headers'
import { connection } from 'next/server'

import { PREVIEW_REQUEST_HEADER, SESSION_COOKIE_NAME } from '../../core/config/constants'
import type { DraftSessionPayload } from '../../core/config/types'
import { enforcePreviewDraftReadOptions } from '../../core/preview/preview-draft-read'
import { openSession } from '../../core/session/session'
import { getDraft } from './define-draft'
import {
  DRAFT_COOKIE_ABS_EXP,
  DRAFT_COOKIE_INTENT,
  DRAFT_COOKIE_SURFACE,
  parseCookieInt,
  readDraftIntent,
} from './lifecycle'

/** Per-request draft state (session, CMS draft reads, live/share markers). */
export type DraftContext = {
  active: boolean
  session: DraftSessionPayload | null
  enforceDraft: <T extends { draft?: boolean }>(opts: T) => T
}

function activeFromLifecycleCookies(
  jar: Awaited<ReturnType<typeof cookies>>,
  nowSec: number
): boolean {
  const absExp = parseCookieInt(jar.get(DRAFT_COOKIE_ABS_EXP)?.value)
  if (absExp === null || nowSec >= absExp) return false
  const intent = readDraftIntent(jar.get(DRAFT_COOKIE_INTENT)?.value)
  const surface = jar.get(DRAFT_COOKIE_SURFACE)?.value
  if ((intent === 'live' || intent === 'share') && surface === 'embedded') {
    return true
  }
  return false
}

export async function getDraftContext(): Promise<DraftContext> {
  await connection()
  const h = await headers()
  const marker = h.get(PREVIEW_REQUEST_HEADER)
  const draftEnabled = (await draftMode()).isEnabled

  const jar = await cookies()
  const wire = jar.get(SESSION_COOKIE_NAME)?.value
  const nowSec = Math.floor(Date.now() / 1000)
  const session = wire ? openSession(getDraft().secret, wire, nowSec) : null

  const active =
    marker === 'live' ||
    marker === 'share' ||
    draftEnabled ||
    activeFromLifecycleCookies(jar, nowSec) ||
    session !== null

  return {
    active,
    session,
    enforceDraft: <T extends { draft?: boolean }>(opts: T) =>
      enforcePreviewDraftReadOptions(opts, active),
  }
}
