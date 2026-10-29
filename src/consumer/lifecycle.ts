import type { DraftMode } from '../core/config/types'
import type { DraftSurface } from '../core/lifecycle'
import { DRAFT_IDLE_EXTENSION_SECONDS, DRAFT_SOFT_ABSOLUTE_CAP_SECONDS } from '../core/lifecycle'

export function lifecycleExpiryForMode(mode: DraftMode, nowSec = Math.floor(Date.now() / 1000)) {
  const absExp = nowSec + DRAFT_SOFT_ABSOLUTE_CAP_SECONDS[mode]
  const idleExp = Math.min(nowSec + DRAFT_IDLE_EXTENSION_SECONDS[mode], absExp)
  return { absExp, idleExp }
}

export function readDraftIntent(cookieValue: string | undefined): DraftMode | null {
  if (cookieValue === 'live' || cookieValue === 'share') return cookieValue
  return null
}

export function readDraftSurface(value: string | undefined): DraftSurface | null {
  if (value === 'embedded' || value === 'top') return value
  return null
}

export function parseCookieInt(value: string | undefined): number | null {
  if (!value) return null
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? n : null
}
