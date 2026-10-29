import { CLOCK_SKEW_SECONDS, TOKEN_MAGIC } from '../config/constants'
import type { DraftMode, DraftTokenClaims } from '../config/types'
import {
  readU32Be,
  readU64Be,
  readUtf8Prefixed,
  writeU32Be,
  writeU64Be,
  writeUtf8Prefixed,
} from '../crypto/binary'
import { deriveKeys, hmacSha256, timingSafeEqualBuf } from '../crypto/node'
import { isDraftMode, isValidPreviewPath } from '../url/url'

const SIG_LEN = 32

function encodeCanonical(claims: DraftTokenClaims): Buffer {
  const modeBytes = Buffer.byteLength(claims.mode, 'utf8')
  const pathBytes = Buffer.byteLength(claims.destinationPath, 'utf8')
  const size = 4 + 2 + modeBytes + 2 + pathBytes + 8 + 8 + 4 + 1
  const buf = Buffer.alloc(size)
  let o = 0
  buf.write(TOKEN_MAGIC, o, 4, 'ascii')
  o += 4
  o += writeUtf8Prefixed(buf, o, claims.mode)
  o += writeUtf8Prefixed(buf, o, claims.destinationPath)
  writeU64Be(buf, o, claims.iat)
  o += 8
  writeU64Be(buf, o, claims.exp)
  o += 8
  writeU32Be(buf, o, claims.ttl)
  o += 4
  buf.writeUInt8(claims.refreshOnActivity ? 1 : 0, o)
  return buf
}

function decodeCanonical(buf: Buffer): DraftTokenClaims {
  if (buf.subarray(0, 4).toString('ascii') !== TOKEN_MAGIC) {
    throw new Error('invalid token magic')
  }
  let o = 4
  const modeField = readUtf8Prefixed(buf, o)
  o = modeField.next
  if (!isDraftMode(modeField.value)) throw new Error('invalid token mode')
  const pathField = readUtf8Prefixed(buf, o)
  o = pathField.next
  const iat = readU64Be(buf, o)
  o += 8
  const exp = readU64Be(buf, o)
  o += 8
  const ttl = readU32Be(buf, o)
  o += 4
  const refreshOnActivity = buf.readUInt8(o) === 1
  return {
    mode: modeField.value,
    destinationPath: pathField.value,
    iat,
    exp,
    ttl,
    refreshOnActivity,
  }
}

export function signToken(rootSecret: string, claims: DraftTokenClaims): string {
  if (!isValidPreviewPath(claims.destinationPath)) throw new Error('invalid destination path')
  const { tokenKey } = deriveKeys(rootSecret)
  return signTokenWithKey(tokenKey, claims)
}

export function signTokenWithKey(tokenKey: Buffer, claims: DraftTokenClaims): string {
  const canonical = encodeCanonical(claims)
  const sig = hmacSha256(tokenKey, canonical)
  return Buffer.concat([canonical, sig]).toString('base64url')
}

export function verifyToken(
  rootSecret: string,
  wire: string,
  nowSec = Math.floor(Date.now() / 1000)
): DraftTokenClaims | null {
  const { tokenKey } = deriveKeys(rootSecret)
  return verifyTokenWithKey(tokenKey, wire, nowSec)
}

export function verifyTokenWithKey(
  tokenKey: Buffer,
  wire: string,
  nowSec = Math.floor(Date.now() / 1000)
): DraftTokenClaims | null {
  let raw: Buffer
  try {
    raw = Buffer.from(wire, 'base64url')
  } catch {
    return null
  }
  if (raw.length < 4 + SIG_LEN) return null
  const canonical = raw.subarray(0, raw.length - SIG_LEN)
  const sig = raw.subarray(raw.length - SIG_LEN)
  const expected = hmacSha256(tokenKey, canonical)
  if (!timingSafeEqualBuf(sig, expected)) return null

  let claims: DraftTokenClaims
  try {
    claims = decodeCanonical(canonical)
  } catch {
    return null
  }
  if (!isValidPreviewPath(claims.destinationPath)) return null
  if (claims.exp + CLOCK_SKEW_SECONDS < nowSec) return null
  if (claims.iat > nowSec + CLOCK_SKEW_SECONDS) return null
  return claims
}

export function encodeTokenCanonicalHex(claims: DraftTokenClaims): string {
  return encodeCanonical(claims).toString('hex')
}

export function tokenDerivedKeyHex(rootSecret: string): string {
  return deriveKeys(rootSecret).tokenKey.toString('hex')
}

export function tokenHmacHex(rootSecret: string, claims: DraftTokenClaims): string {
  const canonical = encodeCanonical(claims)
  return hmacSha256(deriveKeys(rootSecret).tokenKey, canonical).toString('hex')
}

export type { DraftMode }
