import { SESSION_COOKIE_NAME } from '../config/constants'
import type { DraftSessionPayload } from '../config/types'
import type { DerivedKeys } from '../crypto/keys'
import { openSessionWithKey, sealSessionWithKey } from './session-wire'

export function readSessionCookie(cookies: {
  get: (name: string) => { value: string } | undefined
}): string | undefined {
  return cookies.get(SESSION_COOKIE_NAME)?.value
}

export function validPreviewSession(
  keys: DerivedKeys,
  cookieValue: string | undefined,
  nowSec = Math.floor(Date.now() / 1000)
): DraftSessionPayload | null {
  if (!cookieValue) return null
  return openSessionWithKey(keys.sessionKey, cookieValue, nowSec)
}

export function refreshSessionPayload(
  _keys: DerivedKeys,
  current: DraftSessionPayload,
  nowSec: number
): DraftSessionPayload | null {
  if (!current.refreshOnActivity) return null
  if (nowSec >= current.expiresAt) return null
  return {
    mode: current.mode,
    expiresAt: current.expiresAt,
    ttl: current.ttl,
    refreshOnActivity: current.refreshOnActivity,
    binding: {
      authScope:
        current.binding.authScope.kind === 'collection'
          ? {
              kind: 'collection',
              resource: current.binding.authScope.resource,
              id: current.binding.authScope.id,
            }
          : { kind: 'global', resource: current.binding.authScope.resource },
      destinationPathname: current.binding.destinationPathname,
      entrySlug: current.binding.entrySlug,
    },
  }
}

export function serializeSessionCookie(keys: DerivedKeys, payload: DraftSessionPayload): string {
  return sealSessionWithKey(keys.sessionKey, payload)
}
