import { describe, expect, it } from 'bun:test'
import {
  draftLocaleFromQuery,
  forwardDraftPreviewLocaleHeaders,
} from '../../../../src/consumers/next/preview-locale-core'
import { DRAFT_PREVIEW_LOCALE_HEADER } from '../../../../src/core/config/constants'

describe('preview locale (i18n-agnostic)', () => {
  it('draftLocaleFromQuery returns opaque locale string', () => {
    expect(draftLocaleFromQuery(new URLSearchParams('locale=pl'))).toBe('pl')
    expect(draftLocaleFromQuery(new URLSearchParams('locale='))).toBeUndefined()
    expect(draftLocaleFromQuery(new URLSearchParams(''))).toBeUndefined()
  })

  it('forwardDraftPreviewLocaleHeaders copies query locale to header on /draft only', () => {
    const base = new Headers({ host: 'localhost' })
    expect(
      forwardDraftPreviewLocaleHeaders('/pl/draft', new URLSearchParams('locale=pl'), base)
    ).toBeNull()
    const next = forwardDraftPreviewLocaleHeaders(
      '/draft',
      new URLSearchParams('locale=de&resource=home-page'),
      base
    )
    expect(next?.get(DRAFT_PREVIEW_LOCALE_HEADER)).toBe('de')
  })
})
