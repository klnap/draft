import { describe, expect, it } from 'bun:test'

import { previewRouteTemplatesFromPublishedLink } from '../../../../src/core/url/preview-routes-from-link'

describe('previewRouteTemplatesFromPublishedLink', () => {
  it('builds locale templates from path + paths', () => {
    expect(
      previewRouteTemplatesFromPublishedLink(
        {
          path: '/projects/[slug]',
          paths: { pl: '/projekty/[slug]', de: '/projekte/[slug]' },
        },
        ['pl', 'en', 'de']
      )
    ).toEqual({
      pl: '/projekty/[slug]',
      en: '/projects/[slug]',
      de: '/projekte/[slug]',
    })
  })
})
