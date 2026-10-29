import { describe, expect, it } from 'bun:test'
import {
  resolveLiveDraft,
  resolvePublishedLink,
  resolveShareDraft,
} from '../../../../../src/producers/payload/draft-resolve'
import { DEFAULT_DRAFT_LIVE_PREVIEW_BREAKPOINTS } from '../../../../../src/producers/payload/live-preview-breakpoints'
import { createPayloadDraftSigning } from '../../../../../src/producers/payload/share/signing'

const projectsRouteParams = { slug: 'slug' } as const

const wireMeta = {
  publishedLink: {
    path: '/projects/[slug]',
    paths: { pl: '/projekty/[slug]', de: '/projekte/[slug]' },
    params: projectsRouteParams,
  },
}

const pluginLocalePrefix = { en: '', pl: '/pl', de: '/de' }

function resolvedProjectsLink() {
  return resolvePublishedLink({ publishedLink: { localePrefix: pluginLocalePrefix } }, wireMeta)
    .pathConfig!
}

describe('createPayloadDraftSigning (payload)', () => {
  const draft = createPayloadDraftSigning({
    secret: 'test-draft-mode-secret-at-least-24-chars',
    preview: {
      liveUrl: 'http://localhost:3000',
      draftUrl: 'http://draft.localhost:3000',
    },
    publishedPreviewButtonPath: '@test/published',
    shareDraftPreviewButtonPath: '@test/share',
  })

  function collectionAdmin(enableShare = true) {
    return draft.collectionPreview('projects', {
      liveDraft: resolveLiveDraft(undefined, wireMeta),
      shareDraft: resolveShareDraft(undefined, {
        ...wireMeta,
        shareDraft: enableShare ? undefined : { enabled: false },
      }),
      publishedLink: { enabled: true, pathConfig: resolvedProjectsLink() },
      livePreviewBreakpoints: DEFAULT_DRAFT_LIVE_PREVIEW_BREAKPOINTS,
    })
  }

  it('collectionPreview builds live bootstrap on draft origin', () => {
    const admin = collectionAdmin(true)
    const livePreview = admin.livePreview as {
      url: (args: { data: Record<string, unknown>; locale: string }) => string | null
    }
    expect(livePreview.url({ data: { slug: 'alfa' }, locale: 'en' })).toBeNull()
    const url = livePreview.url({ data: { slug: 'alfa', id: '1' }, locale: 'pl' })
    expect(url).toMatch(/^http:\/\/draft\.localhost:3000\/api\/draft\?token=/)
    const token = new URL(url!).searchParams.get('token')
    expect(token).toBeTruthy()
  })

  it('collection live uses published pathname destination', () => {
    const admin = collectionAdmin(false)
    const livePreview = admin.livePreview as {
      url: (args: { data: Record<string, unknown>; locale: string }) => string | null
    }
    const url = livePreview.url({ data: { slug: 'alfa', id: 'doc-9' }, locale: 'pl' })!
    expect(url.startsWith('http://draft.localhost:3000/api/draft?token=')).toBe(true)
  })

  it('globalPreview mints draft surface without id', () => {
    const admin = draft.globalPreview('about-page', {
      liveDraft: resolveLiveDraft(undefined, {
        publishedLink: {
          routes: { '/about': { en: '/about', pl: '/o-nas' } },
        },
      }),
      shareDraft: resolveShareDraft(undefined, wireMeta),
      publishedLink: {
        enabled: true,
        pathConfig: resolvePublishedLink(undefined, {
          publishedLink: { routes: { '/about': { en: '/about', pl: '/o-nas' } } },
        }).pathConfig!,
      },
      livePreviewBreakpoints: DEFAULT_DRAFT_LIVE_PREVIEW_BREAKPOINTS,
    })
    const livePreview = admin.livePreview as {
      url: (args: { data: Record<string, unknown>; locale: string }) => string | null
    }
    const url = livePreview.url({ data: {}, locale: 'pl' })
    expect(url).toMatch(/^http:\/\/draft\.localhost:3000\/api\/draft\?token=/)
    expect(admin.components).toBeDefined()
  })

  it('buildPublishedLinkUrl has no token and uses liveUrl', () => {
    const pathConfig = resolvedProjectsLink()
    expect(draft.buildPublishedLinkUrl(pathConfig, { slug: 'x' }, 'en')).toBe(
      'http://localhost:3000/projects/x'
    )
    expect(draft.buildPublishedLinkUrl(pathConfig, { slug: 'x' }, 'pl')).toBe(
      'http://localhost:3000/pl/projekty/x'
    )
  })

  it('path mode: draftUrl omitted → bootstrap on liveUrl', () => {
    const pathDraft = createPayloadDraftSigning({
      secret: 'test-draft-mode-secret-at-least-24-chars',
      preview: { liveUrl: 'http://localhost:3000' },
    })
    const admin = pathDraft.collectionPreview('projects', {
      liveDraft: resolveLiveDraft(undefined, wireMeta),
      shareDraft: resolveShareDraft(undefined, { shareDraft: { enabled: false } }),
      publishedLink: { enabled: true, pathConfig: resolvedProjectsLink() },
      livePreviewBreakpoints: DEFAULT_DRAFT_LIVE_PREVIEW_BREAKPOINTS,
    })
    const livePreview = admin.livePreview as {
      url: (args: { data: Record<string, unknown>; locale: string }) => string | null
    }
    const url = livePreview.url({ data: { id: '1', slug: 'a' }, locale: 'en' })
    expect(url).toMatch(/^http:\/\/localhost:3000\/api\/draft\?token=/)
  })

  it('bootstrapDraftSurface passes ttl to token claims', () => {
    const url = draft.bootstrapDraftSurface('/en/projects/a', 'share', {
      ttl: 3600,
      refreshOnActivity: false,
    })
    expect(url).toContain('token=')
    const claims = draft.signDraftBootstrapToken({
      mode: 'share',
      destinationPath: '/en/projects/a',
      ttl: 3600,
      refreshOnActivity: false,
    })
    expect(claims.ttl).toBe(3600)
    expect(claims.refreshOnActivity).toBe(false)
  })
})
