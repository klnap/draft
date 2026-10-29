import type { DraftProtocolSurface } from '../adapters/consumer'
import type { DraftMode, DraftSessionPayload, DraftTokenClaims } from '../core/config/types'
import { DRAFT_QUERY_GATE, type DraftBootstrapContext, type DraftSurface } from '../core/lifecycle'

export type BootstrapSurfaceResult = { surface: DraftSurface; gate?: string }

/**
 * Live Preview pop-out opens bootstrap as a top-level document but must use the same
 * `embedded` session as the iframe so postMessage-based live preview keeps working.
 */
export function resolveBootstrapSurface(
  mode: DraftMode,
  secFetchDest: string | null,
  createGate: () => string = () => crypto.randomUUID()
): BootstrapSurfaceResult {
  if (mode === 'live') {
    return { surface: 'embedded' }
  }

  const surface: DraftSurface = secFetchDest === 'iframe' ? 'embedded' : 'top'
  if (surface === 'top') {
    return { surface, gate: createGate() }
  }
  return { surface }
}

export type BootstrapPlanFailure = 'bad_request' | 'forbidden'

export type BootstrapPlanSuccess = {
  claims: DraftTokenClaims
  sessionPayload: DraftSessionPayload
  sessionWire: string
  redirectUrl: string
  lifecycle: DraftBootstrapContext
}

export type BootstrapPlanResult =
  | { ok: false; reason: BootstrapPlanFailure }
  | { ok: true; value: BootstrapPlanSuccess }

export type PlanBootstrapFromTokenInput = {
  tokenWire: string
  tokenCount: number
  hasLegacyPathParams: boolean
  resolveBootstrapOrigin: (mode: DraftMode) => string
  secFetchDest: string | null
  nowSec?: number
  createGate?: () => string
}

export function planBootstrapFromToken(
  protocol: DraftProtocolSurface,
  input: PlanBootstrapFromTokenInput
): BootstrapPlanResult {
  if (input.tokenCount !== 1) {
    return { ok: false, reason: 'bad_request' }
  }
  if (input.hasLegacyPathParams) {
    return { ok: false, reason: 'bad_request' }
  }

  const nowSec = input.nowSec ?? Math.floor(Date.now() / 1000)
  const claims = protocol.verifyToken(input.tokenWire, nowSec)
  if (!claims) {
    return { ok: false, reason: 'forbidden' }
  }

  const sessionPayload = protocol.sessionPayloadFromTokenClaims(claims, nowSec)
  const sessionWire = protocol.sealSession(sessionPayload)
  const { surface, gate } = resolveBootstrapSurface(
    claims.mode,
    input.secFetchDest,
    input.createGate
  )

  const target = new URL(claims.destinationPath, input.resolveBootstrapOrigin(claims.mode))
  if (gate) target.searchParams.set(DRAFT_QUERY_GATE, gate)

  return {
    ok: true,
    value: {
      claims,
      sessionPayload,
      sessionWire,
      redirectUrl: target.toString(),
      lifecycle: { surface, gate },
    },
  }
}
