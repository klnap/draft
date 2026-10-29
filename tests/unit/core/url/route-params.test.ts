import { describe, expect, it } from 'bun:test'
import { buildPreviewPath } from '../../../../src/core/url/preview-routes'
import {
  applyDynamicSegments,
  extractDynamicSegments,
  readValueAtPath,
  resolveRouteParam,
  templateHasUnsupportedDynamicSyntax,
} from '../../../../src/core/url/route-params'
import { isValidPreviewPath } from '../../../../src/core/url/url'

describe('readValueAtPath hardening', () => {
  const data = { seo: { slug: 'ok' }, slug: 'top' }

  it('blocks prototype-pollution path segments', () => {
    expect(readValueAtPath(data, '__proto__.x')).toBeUndefined()
    expect(readValueAtPath(data, 'constructor.x')).toBeUndefined()
    expect(readValueAtPath(data, 'prototype.x')).toBeUndefined()
  })

  it('rejects malformed paths', () => {
    expect(readValueAtPath(data, 'foo..bar')).toBeUndefined()
    expect(readValueAtPath(data, '.foo')).toBeUndefined()
    expect(readValueAtPath(data, 'foo.')).toBeUndefined()
    expect(readValueAtPath(data, '')).toBeUndefined()
  })

  it('does not traverse arrays', () => {
    expect(readValueAtPath({ items: ['a'] }, 'items.0')).toBeUndefined()
  })
})

describe('dynamic segment parsing', () => {
  it('extracts supported param names', () => {
    expect(extractDynamicSegments('/projects/[slug]')).toEqual(['slug'])
    expect(extractDynamicSegments('/users/[userId]/posts/[postId]')).toEqual(['userId', 'postId'])
  })

  it('rejects catch-all and optional catch-all syntax', () => {
    expect(templateHasUnsupportedDynamicSyntax('/blog/[...slug]')).toBe(true)
    expect(templateHasUnsupportedDynamicSyntax('/blog/[[...slug]]')).toBe(true)
    expect(extractDynamicSegments('/blog/[...slug]')).toEqual([])
    expect(
      applyDynamicSegments('/blog/[...slug]', { slug: 'x' }, 'en', { slug: 'slug' })
    ).toBeNull()
  })

  it('rejects templates with unsupported brackets even when params are configured', () => {
    expect(
      buildPreviewPath({ '/x': '/x/[...slug]' }, { slug: 'a' }, 'en', { slug: 'slug' })
    ).toBeNull()
  })
})

describe('route parameter encoding and safety', () => {
  const routes = { '/p/[slug]': { en: '/p/[slug]' } }
  const params = { slug: 'slug' }

  it('percent-encodes reserved characters in segment values', () => {
    expect(buildPreviewPath(routes, { slug: 'a b' }, 'en', params)).toBe('/en/p/a%20b')
    expect(buildPreviewPath(routes, { slug: 'a?b' }, 'en', params)).toBe('/en/p/a%3Fb')
    expect(buildPreviewPath(routes, { slug: 'a/b' }, 'en', params)).toBe('/en/p/a%2Fb')
  })

  it('returns null for malicious redirect-like values without mapping', () => {
    expect(resolveRouteParam('slug', { slug: 'https://evil.example' }, 'en', undefined)).toBeNull()
    expect(buildPreviewPath(routes, { slug: '//evil.example' }, 'en', params)).toBe(
      '/en/p/%2F%2Fevil.example'
    )
  })
})

describe('isValidPreviewPath', () => {
  it('accepts normal relative paths', () => {
    expect(isValidPreviewPath('/en/projects/foo')).toBe(true)
  })

  it('rejects protocol-relative and traversal shapes', () => {
    expect(isValidPreviewPath('//evil.example')).toBe(false)
    expect(isValidPreviewPath('/../secret')).toBe(false)
    expect(isValidPreviewPath('/%2e%2e/admin')).toBe(false)
    expect(isValidPreviewPath('\\evil')).toBe(false)
  })

  it('rejects javascript/data scheme-like paths', () => {
    expect(isValidPreviewPath('/javascript:alert(1)')).toBe(false)
    expect(isValidPreviewPath('/data:text/html,hi')).toBe(false)
    expect(isValidPreviewPath('/draft?locale=pl&resource=layout&frame=%2Fpl')).toBe(true)
  })
})

describe('resolveRouteParam without implicit slug fallback', () => {
  it('returns null when routeParams is undefined or empty', () => {
    expect(resolveRouteParam('slug', { slug: 'x' }, 'en', undefined)).toBeNull()
    expect(resolveRouteParam('slug', { slug: 'x' }, 'en', {})).toBeNull()
  })
})
