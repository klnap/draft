import { afterEach, describe, expect, it } from 'bun:test'
import {
  definedToConsumerConfig,
  toDraftProxyConfig,
} from '../../../../src/consumers/next/config/resolve-config'
import {
  defineDraft,
  getDraft,
  isDefinedDraft,
  resetDraft,
} from '../../../../src/consumers/next/define-draft'

const SECRET = 'test-root-secret-v1-golden!!'

afterEach(() => {
  resetDraft()
})

describe('defineDraft', () => {
  it('registers preview and mode origin', () => {
    const defined = defineDraft({
      secret: SECRET,
      preview: {
        liveUrl: 'http://localhost:3000/',
        draftUrl: 'http://draft.localhost:3000/',
      },
      secure: false,
      previewRoutes: {
        projects: { en: '/projects/[slug]' },
      },
    })

    expect(defined.preview).toEqual({
      liveUrl: 'http://localhost:3000',
      draftUrl: 'http://draft.localhost:3000',
    })
    expect(defined.mode).toBe('origin')
    expect(defined.secure).toBe(false)
    expect(getDraft()).toBe(defined)
  })

  it('path mode when draftUrl omitted or same host', () => {
    const a = defineDraft({
      secret: SECRET,
      preview: { liveUrl: 'http://localhost:3000' },
    })
    expect(a.mode).toBe('path')
    resetDraft()
    const b = defineDraft({
      secret: SECRET,
      preview: { liveUrl: 'http://localhost:3000', draftUrl: 'http://localhost:3000' },
    })
    expect(b.mode).toBe('path')
  })

  it('maps to consumer config for proxy', () => {
    const defined = defineDraft({
      secret: SECRET,
      preview: { liveUrl: 'http://localhost:3000' },
      previewRoutes: { projects: { en: '/projects/[slug]' } },
    })
    const consumer = definedToConsumerConfig(defined)
    expect(consumer.previewRoutes?.projects).toBeDefined()
    expect(toDraftProxyConfig(defined).secret).toBe(SECRET)
  })

  it('isDefinedDraft recognizes registry', () => {
    const defined = defineDraft({
      secret: SECRET,
      preview: { liveUrl: 'http://localhost:3000' },
    })
    expect(isDefinedDraft(defined)).toBe(true)
    expect(isDefinedDraft({})).toBe(false)
  })
})
