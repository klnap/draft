import { describe, expect, it } from 'bun:test'

import { deriveKeys } from '../../../../src/core/crypto/node'
import { deriveKeysWeb } from '../../../../src/core/crypto/web'

describe('deriveKeysWeb', () => {
  it('matches node hkdfSync keys', async () => {
    const secret = 'test-root-secret-v1-golden'
    const [node, web] = [deriveKeys(secret), await deriveKeysWeb(secret)]
    expect(web.tokenKey.equals(node.tokenKey)).toBe(true)
    expect(web.sessionKey.equals(node.sessionKey)).toBe(true)
  })
})
