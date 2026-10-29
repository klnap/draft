import { describe, expect, it } from 'bun:test'

import { resolveBootstrapSurface } from '../../../../../src/consumers/next/route/bootstrap-surface'

describe('resolveBootstrapSurface (Next re-export)', () => {
  it('live document pop-out → embedded, no gate', () => {
    expect(resolveBootstrapSurface('live', 'document')).toEqual({ surface: 'embedded' })
  })

  it('share iframe → embedded', () => {
    expect(resolveBootstrapSurface('share', 'iframe')).toEqual({ surface: 'embedded' })
  })
})
