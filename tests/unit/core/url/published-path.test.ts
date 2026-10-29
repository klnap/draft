import { describe, expect, it } from 'bun:test'
import {
  buildPublishedPath,
  mergeLocalePrefix,
  type ResolvedPublishedPathConfig,
  resolveLocaleRoutePrefix,
} from '../../../../src/core/url/published-path'

const projectsParams = {
  slug: { field: 'slug', localized: true },
}

describe('mergeLocalePrefix', () => {
  it('merges with schema winning', () => {
    expect(mergeLocalePrefix({ en: '', pl: '/pl' }, { de: '/de' })).toEqual({
      en: '',
      pl: '/pl',
      de: '/de',
    })
  })
})

describe('resolveLocaleRoutePrefix', () => {
  it('uses explicit prefix', () => {
    expect(resolveLocaleRoutePrefix({ pl: '/pl' }, 'pl')).toBe('/pl')
    expect(resolveLocaleRoutePrefix({ en: '' }, 'en')).toBe('')
  })

  it('returns null when map is set but locale missing', () => {
    expect(resolveLocaleRoutePrefix({ en: '', pl: '/pl' }, 'de')).toBeNull()
  })

  it('legacy empty map uses locale segment', () => {
    expect(resolveLocaleRoutePrefix({}, 'pl')).toBe('/pl')
  })
})

describe('buildPublishedPath', () => {
  const baseConfig = (
    overrides?: Partial<ResolvedPublishedPathConfig>
  ): ResolvedPublishedPathConfig => ({
    localePrefix: { en: '', pl: '/pl', de: '/de' },
    path: '/projects/[slug]',
    paths: {
      pl: '/projekty/[slug]',
      de: '/projekte/[slug]',
    },
    params: projectsParams,
    ...overrides,
  })

  it('composes prefix + localized path + slug', () => {
    expect(buildPublishedPath(baseConfig(), { slug: 'alfa' }, 'pl')).toBe('/pl/projekty/alfa')
    expect(buildPublishedPath(baseConfig(), { slug: 'alfa' }, 'en')).toBe('/projects/alfa')
    expect(buildPublishedPath(baseConfig(), { slug: 'alfa' }, 'de')).toBe('/de/projekte/alfa')
  })

  it('home path with prefix', () => {
    expect(
      buildPublishedPath(
        {
          localePrefix: { en: '', pl: '/pl' },
          path: '/',
        },
        {},
        'pl'
      )
    ).toBe('/pl')
  })

  it('null when locale missing from prefix map', () => {
    expect(
      buildPublishedPath(baseConfig({ localePrefix: { en: '', pl: '/pl' } }), { slug: 'x' }, 'de')
    ).toBeNull()
  })

  it('falls back to legacy buildPreviewPath when only routes map', () => {
    expect(
      buildPublishedPath(
        {
          localePrefix: {},
          routes: {
            '/projects/[slug]': {
              en: '/projects/[slug]',
              pl: '/projekty/[slug]',
            },
          },
          params: projectsParams,
        },
        { slug: 'x' },
        'pl'
      )
    ).toBe('/pl/projekty/x')
  })
})
