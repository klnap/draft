import type { DraftProtocolSurface } from '../../adapters/consumer'
import {
  type PlanBootstrapFromTokenInput,
  type planBootstrapFromToken,
  resolveBootstrapSurface,
} from '../../consumer/bootstrap'
import { DRAFT_QUERY_GATE } from '../../core/lifecycle/constants'
import { isDraftSurfaceDestination } from '../../core/url/draft-surface'
import type { ResolvedDraftConsumerConfig } from './config'
import { buildBootstrapSessionPayload } from './seal-auth-scope'

export async function planNextBootstrapFromToken(
  protocol: DraftProtocolSurface,
  config: ResolvedDraftConsumerConfig,
  input: PlanBootstrapFromTokenInput
): Promise<ReturnType<typeof planBootstrapFromToken>> {
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

  const sessionPayload = await buildBootstrapSessionPayload(claims, config, nowSec)
  if (!sessionPayload) {
    return { ok: false, reason: 'forbidden' }
  }

  const sessionWire = protocol.sealSession(sessionPayload)
  const { surface, gate } = resolveBootstrapSurface(
    claims.mode,
    input.secFetchDest,
    input.createGate
  )

  const redirectPath = isDraftSurfaceDestination(claims.destinationPath)
    ? claims.destinationPath
    : sessionPayload.binding.destinationPathname
  const redirectBase = isDraftSurfaceDestination(claims.destinationPath)
    ? config.draftUrl
    : config.liveUrl
  const target = new URL(redirectPath, redirectBase)
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
