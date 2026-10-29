import { afterEach, describe, expect, it } from 'bun:test'
import { NextRequest } from 'next/server'
import { createDraft } from '../../../../../src/consumers/next/create-draft'
import { defineDraft, resetDraft } from '../../../../../src/consumers/next/define-draft'
import { createDraftProxy } from '../../../../../src/consumers/next/proxy/create-draft-proxy'

const SECRET = 'test-root-secret-v1-golden!!'

const originPreview = {
  liveUrl: 'http://localhost:3000',
  draftUrl: 'http://draft.localhost:3000',
} as const

afterEach(() => {
  resetDraft()
})

describe('createDraftProxy', () => {
  it('throws without registry when called with no args', async () => {
    await expect(createDraftProxy()).rejects.toThrow(/must be called before/)
  })

  it('reads defineDraft registry', async () => {
    defineDraft({
      secret: SECRET,
      preview: originPreview,
      secure: false,
    })
    const draft = await createDraftProxy()
    expect(draft.mode).toBe('origin')
    expect(draft.isDraftHost('draft.localhost')).toBe(true)
    expect(draft.isDraftHost('localhost')).toBe(false)
  })

  it('is callable and callable === .proxy', async () => {
    defineDraft({
      secret: SECRET,
      preview: originPreview,
      secure: false,
    })
    const draft = await createDraftProxy()
    expect(typeof draft).toBe('function')
    expect(draft.proxy).toBe(draft)

    const req = new NextRequest('http://draft.localhost:3000/pl/draft?resource=projects&id=1')
    const viaCall = draft(req)
    const viaProp = draft.proxy(req)
    expect(viaCall.status).toBe(viaProp.status)
  })

  it('accepts explicit config without registry', async () => {
    const draft = await createDraftProxy({
      secret: SECRET,
      preview: { liveUrl: 'http://localhost:3000' },
      secure: false,
    })
    expect(draft.mode).toBe('path')
    expect(draft.isDraftHost('localhost')).toBe(false)
  })

  it('throws when sameSite none without secure', async () => {
    await expect(
      createDraftProxy({
        secret: SECRET,
        preview: originPreview,
        sessionCookie: { sameSite: 'none', secure: false },
      })
    ).rejects.toThrow(/sameSite "none" requires secure/)
  })
})

describe('createDraft callable', () => {
  it('sync factory is also callable', () => {
    const draft = createDraft({
      secret: SECRET,
      preview: originPreview,
      secure: false,
    })
    expect(typeof draft).toBe('function')
    expect(draft.proxy).toBe(draft)
  })
})
