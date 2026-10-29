import { describe, expect, it } from 'bun:test'

import { publishedPreviewHrefFromLocaleCode } from '../../../../../src/producers/payload/admin/published-preview-href'

describe('publishedPreviewHrefFromLocaleCode', () => {
  const pathConfig = {
    localePrefix: { en: '', pl: '/pl' },
    path: '/projects/[slug]',
    paths: { pl: '/projekty/[slug]' },
    params: { slug: { field: 'slug', localized: true } },
  } as const

  it('builds absolute published URL from document data', () => {
    const href = publishedPreviewHrefFromLocaleCode(
      'http://localhost:3000',
      pathConfig,
      { slug: 'alfa' },
      'pl'
    )
    expect(href).toBe('http://localhost:3000/pl/projekty/alfa')
  })

  it('returns null when path cannot be resolved', () => {
    expect(
      publishedPreviewHrefFromLocaleCode('http://localhost:3000', pathConfig, {}, 'pl')
    ).toBeNull()
  })
})
