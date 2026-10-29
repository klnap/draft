import { describe, expect, it } from 'bun:test'

import { previewRouteTemplatesFromPublishedLink } from '../../src/core/url/preview-routes-from-link'

const CMS_LOCALES = ['pl', 'en', 'de'] as const

describe('preview route templates from publishedLink', () => {
  it('builds locale suffix templates from path + paths', () => {
    expect(
      previewRouteTemplatesFromPublishedLink(
        {
          path: '/projects/[slug]',
          paths: { pl: '/projekty/[slug]', de: '/projekte/[slug]' },
        },
        CMS_LOCALES
      )
    ).toEqual({
      pl: '/projekty/[slug]',
      en: '/projects/[slug]',
      de: '/projekte/[slug]',
    })
  })
})
