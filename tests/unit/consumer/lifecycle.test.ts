import { describe, expect, it } from 'bun:test'

import {
  lifecycleExpiryForMode,
  parseCookieInt,
  readDraftIntent,
  readDraftSurface,
} from '../../../src/consumer/lifecycle'

describe('consumer lifecycle helpers', () => {
  it('parses intent and surface', () => {
    expect(readDraftIntent('live')).toBe('live')
    expect(readDraftIntent('nope')).toBeNull()
    expect(readDraftSurface('embedded')).toBe('embedded')
    expect(parseCookieInt('42')).toBe(42)
    expect(parseCookieInt(undefined)).toBeNull()
  })

  it('computes lifecycle expiry caps', () => {
    const { absExp, idleExp } = lifecycleExpiryForMode('live', 1000)
    expect(absExp).toBe(1000 + 12 * 3600)
    expect(idleExp).toBeLessThanOrEqual(absExp)
  })
})
