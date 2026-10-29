import { describe, expect, it } from 'bun:test'
import { deriveKeys } from '../../../src/core/crypto/node'
import {
  encodeSessionCanonicalHex,
  openSessionWithKey,
  sealSessionWithKey,
  sessionDerivedKeyHex,
  sessionMacHex,
} from '../../../src/core/session/session'
import {
  encodeTokenCanonicalHex,
  signTokenWithKey,
  tokenDerivedKeyHex,
  tokenHmacHex,
  verifyTokenWithKey,
} from '../../../src/core/token/token'

const ROOT = 'test-root-secret-v1-golden'

const CLAIMS = {
  mode: 'live' as const,
  destinationPath: '/projects/example',
  iat: 1_700_000_000,
  exp: 1_700_003_600,
  ttl: 3600,
  refreshOnActivity: true,
}

const SESSION = {
  mode: 'live' as const,
  expiresAt: 1_700_003_600,
  ttl: 3600,
  refreshOnActivity: true,
  binding: {
    authScope: { kind: 'collection' as const, resource: 'projects', id: '1' },
    destinationPathname: '/projects/example',
    entrySlug: 'example',
  },
}

describe('golden vectors §15', () => {
  it('token canonical hex', () => {
    expect(encodeTokenCanonicalHex(CLAIMS)).toBe(
      '4e444d3100046c69766500112f70726f6a656374732f6578616d706c65000000006553f100000000006553ff1000000e1001'
    )
  })

  it('derived keys', () => {
    expect(tokenDerivedKeyHex(ROOT)).toBe(
      '7096ea7731312a7b7232cdd4c18b54e741e1d0c212a4e0bd60881cc4d53d1056'
    )
    expect(sessionDerivedKeyHex(ROOT)).toBe(
      '61f358a55867cfc37571b366c8b74eb76c68a6fee6dc3036ba499a473378a41a'
    )
  })

  it('token hmac + wire', () => {
    const keys = deriveKeys(ROOT)
    expect(tokenHmacHex(ROOT, CLAIMS)).toBe(
      'c756566c27d2196713ca8ffa1053146b1b3684fd0e8bc7637a3b378edcbed167'
    )
    expect(signTokenWithKey(keys.tokenKey, CLAIMS)).toBe(
      'TkRNMQAEbGl2ZQARL3Byb2plY3RzL2V4YW1wbGUAAAAAZVPxAAAAAABlU_8QAAAOEAHHVlZsJ9IZZxPKj_oQUxRrGzaE_Q6Lx2N6OzeO3L7RZw'
    )
  })

  it('session canonical + mac + cookie', () => {
    const keys = deriveKeys(ROOT)
    expect(encodeSessionCanonicalHex(SESSION)).toBe(
      '4e44533200000000006553ff1000000e100100000870726f6a6563747300013100112f70726f6a656374732f6578616d706c6500076578616d706c65'
    )
    expect(sessionMacHex(ROOT, SESSION)).toBe(
      'e539a9533cc67716b88ccf0ff8ec64baa9e10be6764f35fe8434ed9cfabf2065'
    )
    expect(sealSessionWithKey(keys.sessionKey, SESSION)).toBe(
      'TkRTMgAAAAAAZVP_EAAADhABAAAIcHJvamVjdHMAATEAES9wcm9qZWN0cy9leGFtcGxlAAdleGFtcGxl5TmpUzzGdxa4jM8P-OxkuqnhC-Z2TzX-hDTtnPq_IGU'
    )
  })

  it('round-trip verify at iat', () => {
    const keys = deriveKeys(ROOT)
    const wire = signTokenWithKey(keys.tokenKey, CLAIMS)
    expect(verifyTokenWithKey(keys.tokenKey, wire, CLAIMS.iat)?.destinationPath).toBe(
      '/projects/example'
    )
    expect(
      openSessionWithKey(
        keys.sessionKey,
        sealSessionWithKey(keys.sessionKey, SESSION),
        1_700_000_000
      )?.mode
    ).toBe('live')
  })
})
