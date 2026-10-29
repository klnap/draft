// @ts-nocheck — Payload Local API mocks are intentionally partial.
import { describe, expect, it, mock } from 'bun:test'
import type { PayloadRequest } from 'payload'

import { draft } from '../../src/producers/payload/plugin'

const SECRET = 'test-draft-mode-secret-at-least-24-chars'
const preview = {
  liveUrl: 'http://localhost:3000',
  draftUrl: 'http://draft.localhost:3000',
} as const

const publishedRoutes = {
  en: '/projects/[slug]',
  pl: '/projekty/[slug]',
} as const

function pluginConfig() {
  return draft({ secret: SECRET, preview })({
    collections: [
      {
        slug: 'projects',
        custom: {
          draft: {
            publishedLink: { routes: publishedRoutes, params: { slug: 'slug' } },
          },
        },
        fields: [],
      },
    ],
  })
}

function shareHandler() {
  const config = pluginConfig()
  const ep = config.endpoints?.find(
    (e: { path?: string; method?: string }) =>
      e.path === '/preview/share-url' && e.method === 'post'
  )
  if (!ep?.handler) throw new Error('missing share endpoint')
  return ep.handler
}

function mockReq(
  overrides: Partial<PayloadRequest> & {
    body?: Record<string, unknown>
    user?: PayloadRequest['user'] | null
  }
): PayloadRequest {
  const { body, user, ...rest } = overrides
  return {
    user: 'user' in overrides ? user : { id: 'u1' },
    data: body,
    payload: {
      findByID: mock(async () => ({ id: 'doc-1' })),
      find: mock(async () => ({ docs: [{ id: 'doc-1' }] })),
      findGlobal: mock(async () => ({ id: 'about' })),
    },
    ...rest,
  } as unknown as PayloadRequest
}

describe('POST /preview/share-url security', () => {
  it('returns 401 without user', async () => {
    const handler = shareHandler()
    const res = await handler(mockReq({ user: undefined, body: { path: '/pl/projekty/alfa' } }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for draft surface path in legacy path field', async () => {
    const handler = shareHandler()
    const res = await handler(mockReq({ body: { path: '/draft?resource=projects&id=doc-1' } }))
    expect(res.status).toBe(400)
  })

  it('returns 200 for draft query surface body', async () => {
    const handler = shareHandler()
    const res = await handler(
      mockReq({
        body: { surface: { resource: 'projects', locale: 'pl', id: 'doc-1' } },
      })
    )
    expect(res.status).toBe(200)
    const json = (await res.json()) as { url?: string }
    expect(json.url).toMatch(/\/api\/draft\?token=/)
    expect(json.url).toContain('draft.localhost')
  })

  it('returns 200 for global draft surface without id', async () => {
    const config = draft({ secret: SECRET, preview })({
      globals: [
        {
          slug: 'home-page',
          custom: { draft: { publishedLink: { paths: { pl: '/' } } } },
          fields: [],
        },
      ],
    })
    const ep = config.endpoints?.find(
      (e: { path?: string; method?: string }) =>
        e.path === '/preview/share-url' && e.method === 'post'
    )
    const handler = ep?.handler
    if (!handler) throw new Error('missing share endpoint')
    const res = await handler(
      mockReq({
        body: { surface: { resource: 'home-page', locale: 'pl' } },
        payload: {
          findByID: mock(async () => null),
          find: mock(async () => ({ docs: [] })),
          findGlobal: mock(async () => ({ id: 'home-page' })),
        },
      })
    )
    expect(res.status).toBe(200)
    const json = (await res.json()) as { url?: string }
    expect(json.url).toMatch(/\/api\/draft\?token=/)
  })

  it('returns 403 for unknown pathname (anti-enumeration)', async () => {
    const handler = shareHandler()
    const res = await handler(mockReq({ body: { path: '/pl/nieznana/alfa' } }))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json).toEqual({ error: 'Forbidden' })
  })

  it('returns 200 with url when ACL passes (pathname)', async () => {
    const handler = shareHandler()
    const res = await handler(mockReq({ body: { path: '/pl/projekty/alfa' } }))
    expect(res.status).toBe(200)
    const json = (await res.json()) as { url?: string }
    expect(json.url).toMatch(/^http:\/\/draft\.localhost:3000\/api\/draft\?token=/)
  })

  it('returns identical 403 for missing doc and denied read', async () => {
    const handler = shareHandler()
    const find = mock(async () => null)
    const denied = await handler(
      mockReq({
        body: { path: '/pl/projekty/alfa' },
        payload: { find, findByID: mock(async () => null), findGlobal: mock(async () => null) },
      })
    )
    const missing = await handler(
      mockReq({
        body: { path: '/pl/projekty/alfa' },
        payload: {
          find: mock(async () => ({ docs: [] })),
          findByID: mock(async () => null),
          findGlobal: mock(async () => null),
        },
      })
    )
    expect(denied.status).toBe(403)
    expect(missing.status).toBe(403)
    expect(await denied.json()).toEqual(await missing.json())
  })

  it('returns 500 on unexpected payload errors', async () => {
    const handler = shareHandler()
    const res = await handler(
      mockReq({
        body: { path: '/pl/projekty/alfa' },
        payload: {
          find: mock(async () => {
            throw new Error('db down')
          }),
          findByID: mock(async () => null),
          findGlobal: mock(async () => null),
        },
      })
    )
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json).toEqual({ error: 'Internal server error' })
    expect('url' in json).toBe(false)
  })
})
