import { SESSION_HKDF_PURPOSE, TOKEN_HKDF_PURPOSE } from '../config/constants'
import type { DerivedKeys } from './keys'

const encoder = new TextEncoder()

async function hkdfSha256(ikm: string, info: string, length: number): Promise<Uint8Array> {
  const baseKey = await crypto.subtle.importKey('raw', encoder.encode(ikm), 'HKDF', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0),
      info: encoder.encode(info),
    },
    baseKey,
    length * 8
  )
  return new Uint8Array(bits)
}

export async function deriveKeysWeb(rootSecret: string): Promise<DerivedKeys> {
  const [tokenKey, sessionKey] = await Promise.all([
    hkdfSha256(rootSecret, TOKEN_HKDF_PURPOSE, 32),
    hkdfSha256(rootSecret, SESSION_HKDF_PURPOSE, 32),
  ])
  return {
    tokenKey: Buffer.from(tokenKey),
    sessionKey: Buffer.from(sessionKey),
  }
}
