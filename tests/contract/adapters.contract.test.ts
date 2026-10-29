import { describe, expect, it } from 'bun:test'

import { deriveKeys } from '../../src/core/crypto/node'
import { signTokenWithKey, verifyTokenWithKey } from '../../src/core/token/token'
import { liveBucketExp } from '../../src/core/url/url'
import {
  createDraftProducer,
  createDraftProtocolSurface,
  planBootstrapFromToken,
  sessionPayloadFromTokenClaims,
  signToken,
} from '../../src/index'
import { createFakeConsumerAdapter } from '../helpers/fakes/fake-consumer'
import { createFakeProducerAdapter } from '../helpers/fakes/fake-producer'

const ROOT = 'test-root-secret-v1-golden'

const CLAIMS_INPUT = {
  mode: 'live' as const,
  destinationPath: '/projects/example',
  nowSec: 1_700_000_000,
  ttl: 3600,
  refreshOnActivity: true,
}

const GOLDEN_CLAIMS = {
  mode: 'live' as const,
  destinationPath: '/projects/example',
  iat: 1_700_000_000,
  exp: 1_700_003_600,
  ttl: 3600,
  refreshOnActivity: true,
}

const GOLDEN_WIRE =
  'TkRNMQAEbGl2ZQARL3Byb2plY3RzL2V4YW1wbGUAAAAAZVPxAAAAAABlU_8QAAAOEAHHVlZsJ9IZZxPKj_oQUxRrGzaE_Q6Lx2N6OzeO3L7RZw'

describe('external adapter fixtures', () => {
  it('public signToken matches locked golden NDM1 wire', () => {
    expect(signToken(ROOT, GOLDEN_CLAIMS)).toBe(GOLDEN_WIRE)
  })

  it('fake producer via createDraftProducer matches golden wire when exp is explicit', () => {
    const producer = createFakeProducerAdapter(ROOT)
    const { token } = producer.signBootstrapToken({ ...CLAIMS_INPUT, exp: GOLDEN_CLAIMS.exp })
    expect(token).toBe(GOLDEN_WIRE)
  })

  it('createDraftProducer live policy uses liveBucketExp for token exp', () => {
    const producer = createDraftProducer({ rootSecret: ROOT })
    const { token, exp, iat } = producer.signBootstrapToken(CLAIMS_INPUT)
    const expectedExp = liveBucketExp(CLAIMS_INPUT.nowSec, CLAIMS_INPUT.ttl)
    const expectedIat = expectedExp - CLAIMS_INPUT.ttl
    expect(exp).toBe(expectedExp)
    expect(iat).toBe(expectedIat)
    const keys = deriveKeys(ROOT)
    expect(verifyTokenWithKey(keys.tokenKey, token, CLAIMS_INPUT.nowSec)?.exp).toBe(expectedExp)
    expect(
      signTokenWithKey(keys.tokenKey, {
        mode: CLAIMS_INPUT.mode,
        destinationPath: CLAIMS_INPUT.destinationPath,
        iat: expectedIat,
        exp: expectedExp,
        ttl: CLAIMS_INPUT.ttl,
        refreshOnActivity: true,
      })
    ).toBe(token)
  })

  it('live bootstrap URL is identical within the same exp bucket', () => {
    const producer = createDraftProducer({ rootSecret: ROOT })
    const path = '/draft?locale=pl&resource=projects&id=1'
    const a = producer.bootstrapUrl('http://localhost:3000', {
      mode: 'live',
      destinationPath: path,
      nowSec: 1_700_000_100,
      ttl: 3600,
    })
    const b = producer.bootstrapUrl('http://localhost:3000', {
      mode: 'live',
      destinationPath: path,
      nowSec: 1_700_000_500,
      ttl: 3600,
    })
    expect(a).toBe(b)
  })

  it('live bootstrap URL changes after bucket boundary', () => {
    const producer = createDraftProducer({ rootSecret: ROOT })
    const path = '/draft?locale=pl&resource=projects&id=1'
    const ttl = 3600
    const before = producer.bootstrapUrl('http://localhost:3000', {
      mode: 'live',
      destinationPath: path,
      nowSec: 1_700_000_000,
      ttl,
    })
    const boundary = liveBucketExp(1_700_000_000, ttl)
    const after = producer.bootstrapUrl('http://localhost:3000', {
      mode: 'live',
      destinationPath: path,
      nowSec: boundary,
      ttl,
    })
    expect(before).not.toBe(after)
  })

  it('sessionPayloadFromTokenClaims uses bootstrapNow + ttl (not token exp)', () => {
    const tokenExp = liveBucketExp(CLAIMS_INPUT.nowSec, CLAIMS_INPUT.ttl)
    expect(tokenExp).not.toBe(GOLDEN_CLAIMS.exp)
    const payload = sessionPayloadFromTokenClaims(
      { ...GOLDEN_CLAIMS, exp: tokenExp },
      CLAIMS_INPUT.nowSec
    )
    expect(payload.expiresAt).toBe(CLAIMS_INPUT.nowSec + CLAIMS_INPUT.ttl)
  })

  it('custom producer → custom consumer → NDS1 session without built-in adapters', () => {
    const producer = createFakeProducerAdapter(ROOT)
    const consumer = createFakeConsumerAdapter().create({ rootSecret: ROOT })

    const { token } = producer.signBootstrapToken(CLAIMS_INPUT)
    const session = consumer.runtime.consumeBootstrapToken(token, CLAIMS_INPUT.nowSec)

    expect(session?.mode).toBe('live')
    expect(session?.expiresAt).toBe(CLAIMS_INPUT.nowSec + CLAIMS_INPUT.ttl)
  })
})

describe('generic consumer bootstrap', () => {
  it('producer token is consumable via planBootstrapFromToken without Next', () => {
    const producer = createDraftProducer({ rootSecret: ROOT })
    const protocol = createDraftProtocolSurface({ rootSecret: ROOT })
    const path = '/draft?resource=projects&id=9'
    const { token } = producer.signBootstrapToken({
      mode: 'share',
      destinationPath: path,
      nowSec: CLAIMS_INPUT.nowSec,
      ttl: 3600,
    })
    const plan = planBootstrapFromToken(protocol, {
      tokenWire: token,
      tokenCount: 1,
      hasLegacyPathParams: false,
      resolveBootstrapOrigin: () => 'https://draft.example.com',
      secFetchDest: 'document',
      nowSec: CLAIMS_INPUT.nowSec,
      createGate: () => 'gate-1',
    })
    expect(plan.ok).toBe(true)
    if (plan.ok) {
      expect(plan.value.redirectUrl).toContain('dg=gate-1')
      expect(plan.value.sessionPayload.mode).toBe('share')
    }
  })
})
