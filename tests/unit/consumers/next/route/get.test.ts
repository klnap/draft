import { afterEach, describe, expect, it } from 'bun:test'

import { defineDraft, resetDraft } from '../../../../../src/consumers/next/define-draft'

const SECRET = 'test-root-secret-v1-golden!!'

afterEach(() => {
  resetDraft()
})

describe('route GET', () => {
  it('throws when defineDraft was not called', async () => {
    const { GET } = await import('../../../../../src/consumers/next/route/get')
    await expect(GET(new Request('http://localhost/api/draft'))).rejects.toThrow(
      /must be called before/
    )
  })

  it('returns 400 without token when registry exists', async () => {
    defineDraft({
      secret: SECRET,
      preview: { liveUrl: 'http://localhost:3000' },
      secure: false,
    })
    const { GET } = await import('../../../../../src/consumers/next/route/get')
    const res = await GET(new Request('http://localhost/api/draft'))
    expect(res.status).toBe(400)
  })
})
