import { describe, expect, it } from 'bun:test'

import { normalizePreviewPathname } from '../../../src/core/draft-surface-query'

describe('normalizePreviewPathname', () => {
  it('accepts locale project path', () => {
    expect(normalizePreviewPathname('/pl/projekty/foo')).toBe('/pl/projekty/foo')
  })

  it('rejects query and open redirect', () => {
    expect(normalizePreviewPathname('/pl/foo?bar=1')).toBeNull()
    expect(normalizePreviewPathname('https://evil/x')).toBeNull()
    expect(normalizePreviewPathname('//evil')).toBeNull()
  })

  it('rejects traversal segments', () => {
    expect(normalizePreviewPathname('/pl/../secret')).toBeNull()
  })

  it('preserves slug case', () => {
    expect(normalizePreviewPathname('/pl/AbC')).toBe('/pl/AbC')
  })

  it('strips trailing slash', () => {
    expect(normalizePreviewPathname('/pl/foo/')).toBe('/pl/foo')
  })
})
