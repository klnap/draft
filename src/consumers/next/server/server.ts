import { cookies, draftMode, headers } from 'next/headers'
import { connection } from 'next/server'

import { PREVIEW_REQUEST_HEADER } from '../../../core/config/constants'
import type { ResolvedDraftConsumerConfig } from '../config'
import {
  DRAFT_COOKIE_ABS_EXP,
  DRAFT_COOKIE_INTENT,
  DRAFT_COOKIE_SURFACE,
  DRAFT_COOKIE_VIEW,
  parseCookieInt,
  readDraftIntent,
} from '../lifecycle'

export function createDraftPreviewChecker(_config: ResolvedDraftConsumerConfig) {
  return async function isDraftPreviewEnabled(options?: { pathname?: string }): Promise<boolean> {
    const h = await headers()
    const marker = h.get(PREVIEW_REQUEST_HEADER)
    if (marker === 'live' || marker === 'share') return true
    if ((await draftMode()).isEnabled) return true

    await connection()
    const jar = await cookies()
    const nowSec = Math.floor(Date.now() / 1000)
    const absExp = parseCookieInt(jar.get(DRAFT_COOKIE_ABS_EXP)?.value)
    if (absExp === null || nowSec >= absExp) return false

    const intent = readDraftIntent(jar.get(DRAFT_COOKIE_INTENT)?.value)
    if (intent === 'live' && jar.get(DRAFT_COOKIE_SURFACE)?.value === 'embedded') {
      return true
    }

    if (intent === 'share' && jar.get(DRAFT_COOKIE_SURFACE)?.value === 'top' && options?.pathname) {
      return jar.get(DRAFT_COOKIE_VIEW)?.value === options.pathname
    }

    return false
  }
}
