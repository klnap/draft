import { describe, expect, it } from 'bun:test'
import type { DraftSessionPayload } from '../../../src/core/config/types'
import { deriveKeys } from '../../../src/core/crypto/node'
import {
  encodeSessionCanonicalHex,
  openSessionWithKey,
  sealSessionWithKey,
} from '../../../src/core/session/session-wire'

const BINDING = {
  authScope: { kind: 'collection' as const, resource: 'projects', id: '9' },
  destinationPathname: '/pl/projekty/example',
  entrySlug: 'example',
}

const SESSION: DraftSessionPayload = {
  mode: 'live',
  expiresAt: 1_700_003_600,
  ttl: 3600,
  refreshOnActivity: true,
  binding: BINDING,
}

describe('NDS2 session wire', () => {
  it('round-trips binding fields', () => {
    const keys = deriveKeys('test-root-secret-v1-golden')
    const wire = sealSessionWithKey(keys.sessionKey, SESSION)
    const opened = openSessionWithKey(keys.sessionKey, wire, 1_700_000_000)
    expect(opened?.binding).toEqual(BINDING)
  })

  it('rejects NDS1 wire', () => {
    const keys = deriveKeys('test-root-secret-v1-golden')
    const nds1 = 'TkRTMQAAAAAAZVP_EAAADhABI6XmQZXnyzgbpbdcsmGZCT8BzBHzXvdAEt7yXVJA8ug'
    expect(openSessionWithKey(keys.sessionKey, nds1, 1_700_000_000)).toBeNull()
  })

  it('canonical hex starts with NDS2 magic', () => {
    const hex = encodeSessionCanonicalHex(SESSION)
    expect(hex.startsWith('4e445332')).toBe(true)
  })
})
