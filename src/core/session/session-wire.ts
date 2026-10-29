import { createHmac, timingSafeEqual } from 'node:crypto'

import {
  SESSION_DESTINATION_UTF8_MAX,
  SESSION_ENTRY_SLUG_UTF8_MAX,
  SESSION_ID_UTF8_MAX,
  SESSION_MAGIC,
  SESSION_MAGIC_V2,
  SESSION_RESOURCE_UTF8_MAX,
} from '../config/constants'
import type { DraftAuthScope, DraftMode, DraftSessionPayload } from '../config/types'
import {
  readU32Be,
  readU64Be,
  readUtf8Prefixed,
  writeU32Be,
  writeU64Be,
  writeUtf8Prefixed,
} from '../crypto/binary'
import { isDraftMode } from '../url/url'

const MAC_LEN = 32

const MODE_BYTE: Record<DraftMode, number> = { live: 0, share: 1 }
const BYTE_MODE: Record<number, DraftMode> = { 0: 'live', 1: 'share' }

const AUTH_KIND_BYTE: Record<DraftAuthScope['kind'], number> = {
  collection: 0,
  global: 1,
}
const BYTE_AUTH_KIND: Record<number, DraftAuthScope['kind']> = {
  0: 'collection',
  1: 'global',
}

function utf8ByteLength(text: string): number {
  return Buffer.byteLength(text, 'utf8')
}

function validateBindingPayload(payload: DraftSessionPayload): void {
  const { binding } = payload
  const resourceLen = utf8ByteLength(binding.authScope.resource)
  if (resourceLen < 1 || resourceLen > SESSION_RESOURCE_UTF8_MAX) {
    throw new Error('invalid session resource length')
  }
  const destLen = utf8ByteLength(binding.destinationPathname)
  if (destLen < 1 || destLen > SESSION_DESTINATION_UTF8_MAX) {
    throw new Error('invalid session destination length')
  }
  const slugLen = utf8ByteLength(binding.entrySlug)
  if (slugLen > SESSION_ENTRY_SLUG_UTF8_MAX) {
    throw new Error('invalid session entry slug length')
  }
  if (binding.authScope.kind === 'collection') {
    const idLen = utf8ByteLength(binding.authScope.id)
    if (idLen < 1 || idLen > SESSION_ID_UTF8_MAX) {
      throw new Error('invalid session collection id length')
    }
  } else if (slugLen !== 0) {
    throw new Error('global session must have empty entry slug')
  }
}

function encodeSessionCanonicalV2(payload: DraftSessionPayload): Buffer {
  validateBindingPayload(payload)
  const scope = payload.binding.authScope
  const idUtf8 = scope.kind === 'collection' ? scope.id : ''
  const parts: Buffer[] = []
  const head = Buffer.alloc(4 + 1 + 8 + 4 + 1 + 1)
  let o = 0
  head.write(SESSION_MAGIC_V2, o, 4, 'ascii')
  o += 4
  head.writeUInt8(MODE_BYTE[payload.mode], o)
  o += 1
  writeU64Be(head, o, payload.expiresAt)
  o += 8
  writeU32Be(head, o, payload.ttl)
  o += 4
  head.writeUInt8(payload.refreshOnActivity ? 1 : 0, o)
  o += 1
  head.writeUInt8(AUTH_KIND_BYTE[scope.kind], o)
  parts.push(head)

  const tail = Buffer.alloc(
    2 +
      utf8ByteLength(scope.resource) +
      2 +
      utf8ByteLength(idUtf8) +
      2 +
      utf8ByteLength(payload.binding.destinationPathname) +
      2 +
      utf8ByteLength(payload.binding.entrySlug)
  )
  let t = 0
  t += writeUtf8Prefixed(tail, t, scope.resource)
  t += writeUtf8Prefixed(tail, t, idUtf8)
  t += writeUtf8Prefixed(tail, t, payload.binding.destinationPathname)
  t += writeUtf8Prefixed(tail, t, payload.binding.entrySlug)
  parts.push(tail)

  return Buffer.concat(parts)
}

function decodeSessionCanonicalV2(buf: Buffer): DraftSessionPayload {
  if (buf.subarray(0, 4).toString('ascii') !== SESSION_MAGIC_V2) {
    throw new Error('invalid session magic')
  }
  const modeByte = buf.readUInt8(4)
  const mode = BYTE_MODE[modeByte]
  if (!mode || !isDraftMode(mode)) throw new Error('invalid session mode')
  let o = 5
  const expiresAt = readU64Be(buf, o)
  o += 8
  const ttl = readU32Be(buf, o)
  o += 4
  const refreshOnActivity = buf.readUInt8(o) === 1
  o += 1
  const authKindByte = buf.readUInt8(o)
  o += 1
  const kind = BYTE_AUTH_KIND[authKindByte]
  if (!kind) throw new Error('invalid auth kind')

  const resourceField = readUtf8Prefixed(buf, o)
  o = resourceField.next
  const idField = readUtf8Prefixed(buf, o)
  o = idField.next
  const destField = readUtf8Prefixed(buf, o)
  o = destField.next
  const slugField = readUtf8Prefixed(buf, o)
  o = slugField.next
  if (o !== buf.length) throw new Error('trailing session bytes')

  const resource = resourceField.value
  const idWire = idField.value
  const destinationPathname = destField.value
  const entrySlug = slugField.value

  if (utf8ByteLength(resource) < 1 || utf8ByteLength(resource) > SESSION_RESOURCE_UTF8_MAX) {
    throw new Error('invalid resource')
  }
  if (
    utf8ByteLength(destinationPathname) < 1 ||
    utf8ByteLength(destinationPathname) > SESSION_DESTINATION_UTF8_MAX
  ) {
    throw new Error('invalid destination')
  }
  if (utf8ByteLength(entrySlug) > SESSION_ENTRY_SLUG_UTF8_MAX) {
    throw new Error('invalid entry slug')
  }

  let authScope: DraftAuthScope
  if (kind === 'collection') {
    if (utf8ByteLength(idWire) < 1 || utf8ByteLength(idWire) > SESSION_ID_UTF8_MAX) {
      throw new Error('invalid collection id')
    }
    authScope = { kind: 'collection', resource, id: idWire }
  } else {
    if (idWire.length > 0 || entrySlug.length > 0) {
      throw new Error('global scope shape')
    }
    authScope = { kind: 'global', resource }
  }

  return {
    mode,
    expiresAt,
    ttl,
    refreshOnActivity,
    binding: { authScope, destinationPathname, entrySlug },
  }
}

function hmacSha256(key: Buffer, data: Buffer): Buffer {
  return createHmac('sha256', key).update(data).digest()
}

function timingSafeEqualBuf(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function encodeSessionCanonicalHex(payload: DraftSessionPayload): string {
  return encodeSessionCanonicalV2(payload).toString('hex')
}

export function sealSessionWithKey(sessionKey: Buffer, payload: DraftSessionPayload): string {
  const canonical = encodeSessionCanonicalV2(payload)
  const mac = hmacSha256(sessionKey, canonical)
  return Buffer.concat([canonical, mac]).toString('base64url')
}

export function openSessionWithKey(
  sessionKey: Buffer,
  wire: string,
  nowSec = Math.floor(Date.now() / 1000)
): DraftSessionPayload | null {
  let raw: Buffer
  try {
    raw = Buffer.from(wire, 'base64url')
  } catch {
    return null
  }
  if (raw.length < 4 + MAC_LEN) return null
  const magic = raw.subarray(0, 4).toString('ascii')
  if (magic === SESSION_MAGIC) {
    return null
  }
  if (magic !== SESSION_MAGIC_V2) {
    return null
  }
  if (raw.length < 4 + 1 + 8 + 4 + 1 + 1 + 2 + 2 + MAC_LEN) return null
  const canonical = raw.subarray(0, raw.length - MAC_LEN)
  const mac = raw.subarray(raw.length - MAC_LEN)
  const expected = hmacSha256(sessionKey, canonical)
  if (!timingSafeEqualBuf(mac, expected)) return null
  let payload: DraftSessionPayload
  try {
    payload = decodeSessionCanonicalV2(canonical)
  } catch {
    return null
  }
  if (payload.expiresAt <= nowSec) return null
  return payload
}
