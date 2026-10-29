import { describe, expect, it } from 'bun:test'

import { readDraftCustom } from '../../../src/producers/payload/draft-custom'

describe('readDraftCustom', () => {
  it('reads draft block by default', () => {
    expect(readDraftCustom({ draft: { publishedLink: { path: '/x' } } })).toEqual({
      publishedLink: { path: '/x' },
    })
  })

  it('returns null when enabled false', () => {
    expect(readDraftCustom({ draft: { enabled: false, publishedLink: { path: '/x' } } })).toBeNull()
  })
})
