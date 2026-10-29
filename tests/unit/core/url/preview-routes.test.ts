import { describe, expect, it } from 'bun:test'
import {
  buildPreviewPath,
  type PreviewRoutes,
  templateRequiresRouteParams,
} from '../../../../src/core/url/preview-routes'
import {
  applyDynamicSegments,
  extractDynamicSegments,
  type RouteParamsConfig,
  readValueAtPath,
  resolveRouteParam,
} from '../../../../src/core/url/route-params'

const staticRoutes: PreviewRoutes = {
  '/about': { en: '/about', pl: '/o-nas' },
}

const singleSlugRoutes: PreviewRoutes = {
  '/projects/[slug]': { en: '/projects/[slug]', pl: '/projekty/[slug]' },
}

const userIdRoutes: PreviewRoutes = {
  '/users/[userId]': { en: '/users/[userId]' },
}

const multiParamRoutes: PreviewRoutes = {
  '/blog/[category]/[postId]': { en: '/blog/[category]/[postId]' },
}

const localeSpecificDynamicRoutes: PreviewRoutes = {
  '/pages': {
    en: '/pages',
    pl: '/strony/[slug]',
  },
}

const localeDifferentParamsRoutes: PreviewRoutes = {
  '/item': {
    en: '/items/[id]',
    pl: '/elementy/[slug]',
  },
}

describe('extractDynamicSegments', () => {
  it('returns empty for static paths', () => {
    expect(extractDynamicSegments('/about')).toEqual([])
  })

  it('extracts single and multiple param names in order', () => {
    expect(extractDynamicSegments('/projects/[slug]')).toEqual(['slug'])
    expect(extractDynamicSegments('/users/[userId]')).toEqual(['userId'])
    expect(extractDynamicSegments('/blog/[category]/[postId]')).toEqual(['category', 'postId'])
  })
})

describe('readValueAtPath', () => {
  it('reads nested and deeply nested fields', () => {
    const data = {
      seo: { slug: 'nested' },
      author: { profile: { id: 'deep-9' } },
    }
    expect(readValueAtPath(data, 'seo.slug')).toBe('nested')
    expect(readValueAtPath(data, 'author.profile.id')).toBe('deep-9')
  })

  it('returns undefined for missing intermediate objects', () => {
    expect(readValueAtPath({ author: null }, 'author.id')).toBeUndefined()
    expect(readValueAtPath({}, 'seo.slug')).toBeUndefined()
  })
})

describe('resolveRouteParam', () => {
  it('uses shorthand field mapping', () => {
    const params: RouteParamsConfig = { userId: 'author.id' }
    expect(resolveRouteParam('userId', { author: { id: '5' } }, 'en', params)).toBe('5')
  })

  it('uses nested field mapping', () => {
    const params: RouteParamsConfig = { slug: 'seo.slug', userId: 'author.id' }
    expect(resolveRouteParam('slug', { seo: { slug: 'hello' } }, 'en', params)).toBe('hello')
  })

  it('returns null when nested value is missing', () => {
    const params: RouteParamsConfig = { slug: 'seo.slug' }
    expect(resolveRouteParam('slug', { seo: null }, 'en', params)).toBeNull()
    expect(resolveRouteParam('slug', {}, 'en', params)).toBeNull()
  })

  it('resolves localized nested fields for active locale', () => {
    const params: RouteParamsConfig = {
      slug: { field: 'seo.slug', localized: true },
    }
    const data = { seo: { slug: { en: 'en-slug', pl: 'pl-slug' } } }
    expect(resolveRouteParam('slug', data, 'pl', params)).toBe('pl-slug')
    expect(resolveRouteParam('slug', data, 'en', params)).toBe('en-slug')
  })

  it('returns null when routeParams is undefined', () => {
    expect(resolveRouteParam('slug', { slug: 'ignored' }, 'en', undefined)).toBeNull()
    expect(resolveRouteParam('userId', { author: { id: '5' } }, 'en', undefined)).toBeNull()
  })

  it('returns null when routeParams is empty', () => {
    expect(resolveRouteParam('slug', { slug: 'ignored' }, 'en', {})).toBeNull()
  })
})

describe('applyDynamicSegments', () => {
  it('does not infer [slug] from data.slug when routeParams is undefined', () => {
    expect(
      applyDynamicSegments('/projects/[slug]', { slug: 'ignored' }, 'en', undefined)
    ).toBeNull()
  })

  it('does not infer [slug] from data.slug when routeParams is empty', () => {
    expect(applyDynamicSegments('/projects/[slug]', { slug: 'ignored' }, 'en', {})).toBeNull()
  })

  it('returns null when any parameter is missing', () => {
    expect(
      applyDynamicSegments('/blog/[category]/[postId]', { category: 'news' }, 'en', {
        category: 'category',
        postId: 'postId',
      })
    ).toBeNull()
  })
})

describe('templateRequiresRouteParams', () => {
  it('detects dynamic segments per locale template independently', () => {
    expect(templateRequiresRouteParams(localeSpecificDynamicRoutes, 'pl')).toBe(true)
    expect(templateRequiresRouteParams(localeSpecificDynamicRoutes, 'en')).toBe(false)
  })
})

const slugRouteParams: RouteParamsConfig = { slug: 'slug' }

describe('buildPreviewPath', () => {
  it('builds static pathname without parameters', () => {
    expect(buildPreviewPath(staticRoutes, {}, 'pl')).toBe('/pl/o-nas')
  })

  it('builds path when slug is mapped explicitly', () => {
    expect(buildPreviewPath(singleSlugRoutes, { slug: 'alfa' }, 'pl', slugRouteParams)).toBe(
      '/pl/projekty/alfa'
    )
  })

  it('returns null for dynamic [slug] when routeParams is undefined', () => {
    expect(buildPreviewPath(singleSlugRoutes, { slug: 'ignored' }, 'en', undefined)).toBeNull()
  })

  it('returns null for dynamic [slug] when routeParams is empty', () => {
    expect(buildPreviewPath(singleSlugRoutes, { slug: 'ignored' }, 'en', {})).toBeNull()
  })

  it('builds path with arbitrary param name via params config', () => {
    expect(
      buildPreviewPath(userIdRoutes, { author: { id: '5' } }, 'en', { userId: 'author.id' })
    ).toBe('/en/users/5')
  })

  it('builds path with multiple dynamic parameters', () => {
    expect(
      buildPreviewPath(multiParamRoutes, { category: 'news', postId: '42' }, 'en', {
        category: 'category',
        postId: 'postId',
      })
    ).toBe('/en/blog/news/42')
  })

  it('returns null when required parameter value is missing', () => {
    expect(buildPreviewPath(singleSlugRoutes, {}, 'en')).toBeNull()
    expect(buildPreviewPath(userIdRoutes, {}, 'en', { userId: 'author.id' })).toBeNull()
  })

  it('uses locale-specific templates and different params per locale', () => {
    const params: RouteParamsConfig = { id: 'id', slug: 'slug' }
    expect(
      buildPreviewPath(localeDifferentParamsRoutes, { id: '9', slug: 'z' }, 'en', params)
    ).toBe('/en/items/9')
    expect(
      buildPreviewPath(localeDifferentParamsRoutes, { id: '9', slug: 'z' }, 'pl', params)
    ).toBe('/pl/elementy/z')
  })

  it('requires slug only for locales whose template includes dynamic segments', () => {
    expect(buildPreviewPath(localeSpecificDynamicRoutes, {}, 'en')).toBe('/en/pages')
    expect(buildPreviewPath(localeSpecificDynamicRoutes, {}, 'pl')).toBeNull()
    expect(
      buildPreviewPath(localeSpecificDynamicRoutes, { slug: 'x' }, 'pl', slugRouteParams)
    ).toBe('/pl/strony/x')
    expect(buildPreviewPath(localeSpecificDynamicRoutes, { slug: 'x' }, 'pl', undefined)).toBeNull()
  })
})
