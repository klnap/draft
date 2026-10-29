import { describe, expect, it } from 'bun:test'
import { planBootstrapFromToken, resolveBootstrapSurface } from '../../../src/consumer/bootstrap'
import { createDraftProtocolSurface } from '../../../src/index'

const ROOT = 'test-root-secret-v1-golden'

describe('resolveBootstrapSurface', () => {
  it('live iframe → embedded, no gate', () => {
    expect(resolveBootstrapSurface('live', 'iframe')).toEqual({ surface: 'embedded' })
  })

  it('share document → top + gate', () => {
    const out = resolveBootstrapSurface('share', 'document', () => 'fixed-gate')
    expect(out).toEqual({ surface: 'top', gate: 'fixed-gate' })
  })
})

describe('planBootstrapFromToken', () => {
  const protocol = createDraftProtocolSurface({ rootSecret: ROOT })

  it('rejects bad token count', () => {
    expect(
      planBootstrapFromToken(protocol, {
        tokenWire: '',
        tokenCount: 0,
        hasLegacyPathParams: false,
        resolveBootstrapOrigin: () => 'http://localhost:3000',
        secFetchDest: 'document',
      }).ok
    ).toBe(false)
  })

  it('rejects legacy path query params', () => {
    const plan = planBootstrapFromToken(protocol, {
      tokenWire: 'x',
      tokenCount: 1,
      hasLegacyPathParams: true,
      resolveBootstrapOrigin: () => 'http://localhost:3000',
      secFetchDest: 'document',
    })
    expect(plan).toEqual({ ok: false, reason: 'bad_request' })
  })

  it('rejects invalid token wire', () => {
    const plan = planBootstrapFromToken(protocol, {
      tokenWire: 'not-a-token',
      tokenCount: 1,
      hasLegacyPathParams: false,
      resolveBootstrapOrigin: () => 'http://localhost:3000',
      secFetchDest: 'document',
      nowSec: 1_700_000_000,
    })
    expect(plan).toEqual({ ok: false, reason: 'forbidden' })
  })

  it('rejects expired token', async () => {
    const { signToken } = await import('../../../src/core/token/token')
    const token = signToken(ROOT, {
      mode: 'share',
      destinationPath: '/draft?resource=projects&id=1',
      iat: 1_700_000_000,
      exp: 1_700_000_100,
      ttl: 3600,
      refreshOnActivity: true,
    })
    const plan = planBootstrapFromToken(protocol, {
      tokenWire: token,
      tokenCount: 1,
      hasLegacyPathParams: false,
      resolveBootstrapOrigin: () => 'http://draft.example.com',
      secFetchDest: 'document',
      nowSec: 1_700_001_000,
    })
    expect(plan).toEqual({ ok: false, reason: 'forbidden' })
  })

  it('produces session wire and redirect for golden token', async () => {
    const { signToken } = await import('../../../src/core/token/token')
    const token = signToken(ROOT, {
      mode: 'live',
      destinationPath: '/draft?resource=projects&id=1',
      iat: 1_700_000_000,
      exp: 1_700_003_600,
      ttl: 3600,
      refreshOnActivity: true,
    })
    const plan = planBootstrapFromToken(protocol, {
      tokenWire: token,
      tokenCount: 1,
      hasLegacyPathParams: false,
      resolveBootstrapOrigin: () => 'http://draft.example.com',
      secFetchDest: 'iframe',
      nowSec: 1_700_000_000,
    })
    expect(plan.ok).toBe(true)
    if (plan.ok) {
      expect(plan.value.sessionWire.length).toBeGreaterThan(10)
      expect(plan.value.redirectUrl).toContain('/draft?resource=projects')
      expect(plan.value.lifecycle.surface).toBe('embedded')
    }
  })
})
