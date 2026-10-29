import type { DraftSessionPayload } from '../config/types'
import { deriveKeys, hmacSha256 } from '../crypto/node'
import { encodeSessionCanonicalHex, openSessionWithKey, sealSessionWithKey } from './session-wire'

export { encodeSessionCanonicalHex, openSessionWithKey, sealSessionWithKey }

export function sealSession(rootSecret: string, payload: DraftSessionPayload): string {
  const { sessionKey } = deriveKeys(rootSecret)
  return sealSessionWithKey(sessionKey, payload)
}

export function openSession(
  rootSecret: string,
  wire: string,
  nowSec = Math.floor(Date.now() / 1000)
): DraftSessionPayload | null {
  return openSessionWithKey(deriveKeys(rootSecret).sessionKey, wire, nowSec)
}

export function sessionDerivedKeyHex(rootSecret: string): string {
  return deriveKeys(rootSecret).sessionKey.toString('hex')
}

export function sessionMacHex(rootSecret: string, payload: DraftSessionPayload): string {
  const { sessionKey } = deriveKeys(rootSecret)
  const canonical = Buffer.from(encodeSessionCanonicalHex(payload), 'hex')
  return hmacSha256(sessionKey, canonical).toString('hex')
}
