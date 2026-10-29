/**
 * External-style consumer fixture: public adapter API only (no built-in consumers).
 */
import {
  createDraftProtocolSurface,
  type DraftConsumerRuntime,
  type DraftModeConsumerAdapter,
  type DraftProtocolSurface,
} from '../../../src/index'

export type FakeConsumerRuntime = {
  consumeBootstrapToken: (
    tokenWire: string,
    nowSec?: number
  ) => ReturnType<DraftProtocolSurface['openSession']>
}

export function createFakeConsumerAdapter(): DraftModeConsumerAdapter<FakeConsumerRuntime> {
  return {
    create(config) {
      const protocol = createDraftProtocolSurface(config)
      const runtime: FakeConsumerRuntime = {
        consumeBootstrapToken(tokenWire, nowSec) {
          const claims = protocol.verifyToken(tokenWire, nowSec)
          if (!claims) return null
          const payload = protocol.sessionPayloadFromTokenClaims(claims, nowSec)
          const sessionWire = protocol.sealSession(payload)
          return protocol.openSession(sessionWire, nowSec)
        },
      }
      return { protocol, runtime }
    },
  }
}

export type FakeConsumer = DraftConsumerRuntime<FakeConsumerRuntime>
