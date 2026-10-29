import { describe, expect, it } from 'bun:test'

import {
  clampBootstrapTtl,
  formatDraftTtlLabel,
  resolveDraftBootstrap,
  resolveLiveDraft,
  resolvePublishedLink,
  resolveShareDraft,
} from '../../../../src/producers/payload/draft-resolve'

const pluginPrefix = {
  publishedLink: { localePrefix: { en: '', pl: '/pl' } },
}

describe('draft-resolve', () => {
  it('merges plugin and schema ttl for live', () => {
    const resolved = resolveLiveDraft({ liveDraft: { ttl: 7200 } }, { liveDraft: { ttl: 1800 } })
    expect(resolved.ttl).toBe(1800)
    expect(resolved.refreshOnActivity).toBe(true)
  })

  it('shareDraft enabled defaults true', () => {
    expect(resolveShareDraft(undefined, {}).enabled).toBe(true)
    expect(resolveShareDraft(undefined, { shareDraft: { enabled: false } }).enabled).toBe(false)
  })

  it('publishedLink requires path or routes', () => {
    expect(resolvePublishedLink(undefined, {}).enabled).toBe(false)
    expect(
      resolvePublishedLink(undefined, {
        publishedLink: { routes: { '/': '/' } },
      }).enabled
    ).toBe(true)
    const withPath = resolvePublishedLink(pluginPrefix, {
      publishedLink: { path: '/projects/[slug]' },
    })
    expect(withPath.enabled).toBe(true)
    expect(withPath.pathConfig?.localePrefix.pl).toBe('/pl')
  })

  it('clampBootstrapTtl respects caps', () => {
    expect(clampBootstrapTtl('live', 30)).toBe(60)
    expect(resolveDraftBootstrap('share', { ttl: 999_999 }, undefined).ttl).toBe(86_400)
  })

  it('refreshOnActivity false from schema', () => {
    const live = resolveLiveDraft(undefined, { liveDraft: { refreshOnActivity: false } })
    expect(live.refreshOnActivity).toBe(false)
  })

  it('formatDraftTtlLabel uses whole hours from seconds', () => {
    expect(formatDraftTtlLabel(86_400)).toBe('24h')
    expect(formatDraftTtlLabel(3600)).toBe('1h')
    expect(formatDraftTtlLabel(5400)).toBe('90m')
  })
})
