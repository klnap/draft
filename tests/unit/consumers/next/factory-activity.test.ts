import { describe, expect, it } from 'bun:test'

import { createDraft } from '../../../../src/consumers/next/create-draft'
import { defineDraft, resetDraft } from '../../../../src/consumers/next/define-draft'
import { isActivityRequest } from '../../../../src/consumers/next/proxy/activity'

const baseConfig = {
  secret: 'test-root-secret-v1-golden!!',
  preview: {
    liveUrl: 'http://localhost:3000',
    draftUrl: 'http://draft.localhost:3000',
  },
  secure: true,
}

describe('createDraft', () => {
  it('throws when sameSite none without secure', () => {
    expect(() =>
      createDraft({
        ...baseConfig,
        sessionCookie: { sameSite: 'none', secure: false },
      })
    ).toThrow(/sameSite "none" requires secure/)
  })

  it('binds proxy synchronously', () => {
    const draft = createDraft(baseConfig)
    expect(typeof draft.proxy).toBe('function')
    expect(draft.mode).toBe('origin')
  })

  it('path mode when draftUrl omitted', () => {
    const draft = createDraft({
      secret: 'test-root-secret-v1-golden!!',
      preview: { liveUrl: 'http://localhost:3000' },
      secure: false,
    })
    expect(draft.mode).toBe('path')
  })
})

describe('defineDraft registry', () => {
  it('createDraft() reads registry', () => {
    resetDraft()
    defineDraft({
      secret: 'test-root-secret-v1-golden!!',
      preview: {
        liveUrl: 'http://localhost:3000',
        draftUrl: 'http://draft.localhost:3000',
      },
      secure: false,
    })
    const draft = createDraft()
    expect(draft.mode).toBe('origin')
    resetDraft()
  })
})

describe('isActivityRequest', () => {
  it('requires GET + Sec-Fetch-Dest document', () => {
    expect(
      isActivityRequest({
        method: 'GET',
        headers: new Headers({ 'sec-fetch-dest': 'document' }),
      })
    ).toBe(true)
    expect(
      isActivityRequest({
        method: 'GET',
        headers: new Headers(),
      })
    ).toBe(false)
    expect(
      isActivityRequest({
        method: 'POST',
        headers: new Headers({ 'sec-fetch-dest': 'document' }),
      })
    ).toBe(false)
  })
})
