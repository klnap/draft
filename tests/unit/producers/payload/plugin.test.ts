import { describe, expect, it } from 'bun:test'

import { PUBLISHED_PREVIEW_BUTTON } from '../../../../src/producers/payload/admin/published-preview-ui'
import { SHARE_DRAFT_PREVIEW_BUTTON } from '../../../../src/producers/payload/admin/share-ui'
import {
  resolveLiveDraft,
  resolvePublishedLink,
  resolveShareDraft,
} from '../../../../src/producers/payload/draft-resolve'
import { DEFAULT_DRAFT_LIVE_PREVIEW_BREAKPOINTS } from '../../../../src/producers/payload/live-preview-breakpoints'
import { draft } from '../../../../src/producers/payload/plugin'
import { createPayloadDraftSigning } from '../../../../src/producers/payload/share/signing'

const preview = {
  liveUrl: 'http://localhost:3000',
  draftUrl: 'http://draft.localhost:3000',
} as const

const publishedRoutes = {
  '/projects/[slug]': {
    en: '/projects/[slug]',
    pl: '/projekty/[slug]',
  },
} as const

describe('draft (payload plugin)', () => {
  it('merges livePreview when custom.draft exists (publishedLink)', () => {
    const config = draft({
      secret: 'test-draft-mode-secret-at-least-24-chars',
      preview,
    })({
      collections: [
        {
          slug: 'projects',
          custom: {
            draft: {
              publishedLink: {
                routes: publishedRoutes,
                params: { slug: 'slug' },
              },
            },
          },
          fields: [],
        },
      ],
    })

    const url = config.collections?.[0]?.admin?.livePreview?.url?.({
      data: { slug: 'alfa', id: 'doc-1' },
      locale: 'pl',
    })
    expect(url).toMatch(/^http:\/\/draft\.localhost:3000\/api\/draft\?token=/)
  })

  it('wires desktop + mobile live preview breakpoints by default', () => {
    const config = draft({
      secret: 'test-draft-mode-secret-at-least-24-chars',
      preview,
    })({
      collections: [
        {
          slug: 'projects',
          custom: { draft: {} },
          fields: [],
        },
      ],
    })

    const breakpoints = config.collections?.[0]?.admin?.livePreview?.breakpoints
    expect(breakpoints?.map((b: { name: string }) => b.name)).toEqual(['desktop', 'mobile'])
    expect(breakpoints?.[0]).toMatchObject({ width: 1280, height: 800 })
    expect(breakpoints?.[1]).toMatchObject({ width: 390, height: 844 })
  })

  it('livePreview without publishedLink still bootstraps draft surface', () => {
    const config = draft({
      secret: 'test-draft-mode-secret-at-least-24-chars',
      preview,
    })({
      collections: [
        {
          slug: 'projects',
          custom: {
            draft: {},
          },
          fields: [],
        },
      ],
    })

    const url = config.collections?.[0]?.admin?.livePreview?.url?.({
      data: { id: 'doc-1' },
      locale: 'pl',
    })
    expect(url).toMatch(/^http:\/\/draft\.localhost:3000\/api\/draft\?token=/)
    expect(config.collections?.[0]?.admin?.preview).toBeUndefined()
  })

  it('wires share UI when shareDraft enabled', () => {
    const config = draft({
      secret: 'test-draft-mode-secret-at-least-24-chars',
      preview,
    })({
      collections: [
        {
          slug: 'projects',
          custom: {
            draft: {
              publishedLink: { routes: publishedRoutes },
            },
          },
          fields: [],
        },
      ],
    })

    const edit = config.collections?.[0]?.admin?.components?.edit
    expect(edit?.PreviewButton).toEqual({
      path: PUBLISHED_PREVIEW_BUTTON,
      clientProps: {
        frontendOrigin: 'http://localhost:3000',
        publishedPathConfig: expect.any(Object),
      },
    })
    const controls = edit?.beforeDocumentControls
    expect(controls?.[0]?.path).toBe(SHARE_DRAFT_PREVIEW_BUTTON)
    expect(controls?.[0]?.clientProps?.shareDraftTtl).toBe(86_400)
  })

  it('omits share UI when shareDraft.enabled is false', () => {
    const config = draft({
      secret: 'test-draft-mode-secret-at-least-24-chars',
      preview,
    })({
      collections: [
        {
          slug: 'projects',
          custom: {
            draft: {
              publishedLink: { routes: publishedRoutes },
              shareDraft: { enabled: false },
            },
          },
          fields: [],
        },
      ],
    })

    const edit = config.collections?.[0]?.admin?.components?.edit
    expect(edit?.PreviewButton).toEqual({
      path: PUBLISHED_PREVIEW_BUTTON,
      clientProps: {
        frontendOrigin: 'http://localhost:3000',
        publishedPathConfig: expect.any(Object),
      },
    })
    expect(edit?.beforeDocumentControls).toBeUndefined()
  })

  it('registers share preview endpoint once', () => {
    const config = draft({
      secret: 'test-draft-mode-secret-at-least-24-chars',
      preview,
    })({
      endpoints: [
        { path: '/preview/share-url', method: 'post', handler: async () => new Response() },
      ],
    })

    const share = config.endpoints?.filter(
      (ep: { path?: string; method?: string }) =>
        ep.path === '/preview/share-url' && ep.method === 'post'
    )
    expect(share?.length).toBe(1)
  })

  it('wires globals livePreview + share', () => {
    const config = draft({
      secret: 'test-draft-mode-secret-at-least-24-chars',
      preview,
    })({
      globals: [
        {
          slug: 'about-page',
          custom: {
            draft: {
              publishedLink: {
                routes: {
                  '/about': { en: '/about', pl: '/o-nas' },
                },
              },
            },
          },
          fields: [],
        },
      ],
    })

    const url = config.globals?.[0]?.admin?.livePreview?.url?.({
      data: {},
      locale: 'pl',
    })
    expect(url).toMatch(/^http:\/\/draft\.localhost:3000\/api\/draft\?token=/)
    const elements = config.globals?.[0]?.admin?.components?.elements
    expect(elements?.PreviewButton).toEqual({
      path: PUBLISHED_PREVIEW_BUTTON,
      clientProps: {
        frontendOrigin: 'http://localhost:3000',
        publishedPathConfig: expect.any(Object),
      },
    })
    const controls = elements?.beforeDocumentControls
    expect(controls?.[0]?.path).toBe(SHARE_DRAFT_PREVIEW_BUTTON)
  })

  it('published preview uses liveUrl path from publishedLink', () => {
    const config = draft({
      secret: 'test-draft-mode-secret-at-least-24-chars',
      preview,
    })({
      collections: [
        {
          slug: 'projects',
          custom: {
            draft: {
              publishedLink: {
                routes: publishedRoutes,
                params: { slug: 'slug' },
              },
            },
          },
          fields: [],
        },
      ],
    })

    const published = config.collections?.[0]?.admin?.preview?.({ slug: 'alfa' }, { locale: 'pl' })
    expect(published).toBe('http://localhost:3000/pl/projekty/alfa')
  })

  it('plugin shareDraft ttl flows to clientProps', () => {
    const config = draft({
      secret: 'test-draft-mode-secret-at-least-24-chars',
      preview,
      shareDraft: { ttl: 3600 },
    })({
      collections: [
        {
          slug: 'projects',
          custom: { draft: {} },
          fields: [],
        },
      ],
    })

    const controls = config.collections?.[0]?.admin?.components?.edit?.beforeDocumentControls
    expect(controls?.[0]?.clientProps?.shareDraftTtl).toBe(3600)
  })
})

describe('createPayloadDraftSigning', () => {
  it('collectionPreview builds live bootstrap URLs with custom liveDraft ttl', () => {
    const draft = createPayloadDraftSigning({
      secret: 'test-draft-mode-secret-at-least-24-chars',
      preview: {
        liveUrl: 'http://localhost:3000',
        draftUrl: 'http://draft.localhost:3000',
      },
      liveDraft: { ttl: 1200 },
      publishedPreviewButtonPath: PUBLISHED_PREVIEW_BUTTON,
      shareDraftPreviewButtonPath: SHARE_DRAFT_PREVIEW_BUTTON,
    })

    const meta = {
      publishedLink: {
        path: '/projects/[slug]',
        paths: { pl: '/projekty/[slug]' },
        params: { slug: 'slug' },
        routes: publishedRoutes,
      },
    }
    const pathConfig = resolvePublishedLink(undefined, meta).pathConfig!
    const admin = draft.collectionPreview('projects', {
      liveDraft: resolveLiveDraft({ liveDraft: { ttl: 1200 } }, meta),
      shareDraft: resolveShareDraft(undefined, meta),
      publishedLink: {
        enabled: true,
        pathConfig,
      },
      livePreviewBreakpoints: DEFAULT_DRAFT_LIVE_PREVIEW_BREAKPOINTS,
    })

    const livePreview = admin.livePreview as {
      url: (args: { data: Record<string, unknown>; locale: string }) => string | null
    }
    const url = livePreview.url({ data: { slug: 'alfa', id: '1' }, locale: 'pl' })
    expect(url).toMatch(/^http:\/\/draft\.localhost:3000\/api\/draft\?token=/)
    expect(
      (
        admin.components as {
          edit?: {
            PreviewButton?: string | { path: string; clientProps?: Record<string, unknown> }
          }
        }
      )?.edit?.PreviewButton
    ).toEqual({
      path: PUBLISHED_PREVIEW_BUTTON,
      clientProps: {
        frontendOrigin: 'http://localhost:3000',
        publishedPathConfig: pathConfig,
      },
    })

    const token = new URL(url!).searchParams.get('token')
    expect(token).toBeTruthy()
    const claims = draft.signDraftBootstrapToken({
      mode: 'live',
      destinationPath: '/pl/projekty/alfa',
      ttl: 1200,
    })
    expect(claims.ttl).toBe(1200)
  })
})
