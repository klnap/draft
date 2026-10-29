import type {
  DraftSessionBinding,
  DraftSessionPayload,
  DraftTokenClaims,
} from '../core/config/types'
import { normalizePreviewPathname } from '../core/draft-surface-query'
import { openSession, sealSession } from '../core/session/session'
import { verifyToken } from '../core/token/token'
import { isValidPreviewPath } from '../core/url/url'
import type { DraftConsumerAdapterConfig, DraftProtocolSurface } from './consumer'

/** Bootstrap placeholder until consumer seals canonical scope at `/api/draft`. */
function bindingFromTokenClaims(claims: DraftTokenClaims): DraftSessionBinding {
  const destinationPathname =
    normalizePreviewPathname(claims.destinationPath) ?? claims.destinationPath
  return {
    authScope: { kind: 'collection', resource: 'pending', id: 'pending' },
    destinationPathname,
    entrySlug: '',
  }
}

/** Session lifetime at bootstrap: `bootstrapNow + ttl` (token `exp` is bootstrap validity only). */
export function sessionPayloadFromTokenClaims(
  claims: DraftTokenClaims,
  bootstrapNowSec = Math.floor(Date.now() / 1000)
): DraftSessionPayload {
  return {
    mode: claims.mode,
    expiresAt: bootstrapNowSec + claims.ttl,
    ttl: claims.ttl,
    refreshOnActivity: claims.refreshOnActivity,
    binding: bindingFromTokenClaims(claims),
  }
}

/** Framework-neutral protocol surface for custom consumer adapters (public API). */
export function createDraftProtocolSurface(
  config: DraftConsumerAdapterConfig
): DraftProtocolSurface {
  const { rootSecret } = config
  return {
    verifyToken(wire, nowSec) {
      return verifyToken(rootSecret, wire, nowSec)
    },
    sessionPayloadFromTokenClaims(claims, bootstrapNowSec) {
      return sessionPayloadFromTokenClaims(claims, bootstrapNowSec)
    },
    sealSession(payload) {
      return sealSession(rootSecret, payload)
    },
    openSession(wire, nowSec) {
      return openSession(rootSecret, wire, nowSec)
    },
    isValidPreviewPath,
  }
}
