import { describe, expect, it } from 'bun:test'

import { enforcePreviewDraftReadOptions } from '../../../src/core/preview/preview-draft-read'

describe('enforcePreviewDraftReadOptions', () => {
  it('forces draft true when preview active', () => {
    const result = enforcePreviewDraftReadOptions({ draft: false }, true)
    expect((result as { draft: boolean }).draft).toBe(true)
  })

  it('defaults draft false when inactive', () => {
    expect(enforcePreviewDraftReadOptions({}, false)).toEqual({ draft: false })
  })
})
