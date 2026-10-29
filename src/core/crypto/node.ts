import { createHmac, hkdfSync, timingSafeEqual } from 'node:crypto'

import { SESSION_HKDF_PURPOSE, TOKEN_HKDF_PURPOSE } from '../config/constants'
import type { DerivedKeys } from './keys'

export type { DerivedKeys } from './keys'

export function deriveKeys(rootSecret: string): DerivedKeys {
  const tokenKey = Buffer.from(hkdfSync('sha256', rootSecret, '', TOKEN_HKDF_PURPOSE, 32))
  const sessionKey = Buffer.from(hkdfSync('sha256', rootSecret, '', SESSION_HKDF_PURPOSE, 32))
  return { tokenKey, sessionKey }
}

export function hmacSha256(key: Buffer, data: Buffer): Buffer {
  return createHmac('sha256', key).update(data).digest()
}

export function timingSafeEqualBuf(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
