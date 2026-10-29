import { describe, expect, it } from 'bun:test'

import {
  normalizePreviewPathname,
  requestPathMatchesSessionBinding,
} from '../../../src/core/draft-surface-query'

describe('draft-surface-query', () => {
  it('matches session pathname binding', () => {
    const binding = {
      authScope: { kind: 'collection' as const, resource: 'projects', id: '1' },
      destinationPathname: '/pl/projekty/alfa',
      entrySlug: 'alfa',
    }
    expect(requestPathMatchesSessionBinding(binding, '/pl/projekty/alfa')).toBe(true)
    expect(requestPathMatchesSessionBinding(binding, '/pl/projekty/other')).toBe(false)
  })

  it('rejects query in normalize input', () => {
    expect(normalizePreviewPathname('/pl/projekty/alfa?x=1')).toBeNull()
  })

  it('matches /draft pathname for query-surface session binding', () => {
    const binding = {
      authScope: { kind: 'collection' as const, resource: 'projects', id: '1' },
      destinationPathname: '/draft',
      entrySlug: '',
    }
    expect(requestPathMatchesSessionBinding(binding, '/draft')).toBe(true)
    expect(requestPathMatchesSessionBinding(binding, '/pl/draft')).toBe(false)
  })
})
