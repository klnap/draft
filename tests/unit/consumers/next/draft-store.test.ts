import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import { defineDraft, getDraft, resetDraft } from '../../../../src/consumers/next/define-draft'

describe('draft-store', () => {
  beforeEach(() => resetDraft())
  afterEach(() => resetDraft())

  it('merges pages across defineDraft calls', () => {
    defineDraft({
      secret: 'test-secret-at-least-24-chars!!',
      preview: { liveUrl: 'http://localhost:3000' },
    })
    defineDraft({
      pages: {
        'home-page': {
          load: async () => ({ ok: true }),
          view: () => null,
        },
      },
    })
    expect(getDraft().pages?.['home-page']).toBeDefined()
  })
})
