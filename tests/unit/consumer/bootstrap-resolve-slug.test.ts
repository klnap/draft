import { describe, expect, it } from 'bun:test'

import { buildBootstrapSessionPayload } from '../../../src/consumers/next/seal-auth-scope'

const CLAIMS_BASE = {
  mode: 'live' as const,
  iat: 1_700_000_000,
  exp: 1_700_003_600,
  ttl: 3600,
  refreshOnActivity: true,
}

const ROUTES = {
  projects: { pl: '/projekty/[slug]', en: '/projects/[slug]' },
}

describe('bootstrap full-page slug resolve', () => {
  it('seals id when resolver returns unique match', async () => {
    const payload = await buildBootstrapSessionPayload(
      {
        ...CLAIMS_BASE,
        destinationPath: '/pl/projekty/my-slug',
      },
      {
        previewRoutes: ROUTES,
        resolveCollectionId: async () => 'doc-uuid',
      },
      1_700_000_000
    )
    expect(payload?.binding.authScope).toEqual({
      kind: 'collection',
      resource: 'projects',
      id: 'doc-uuid',
    })
    expect(payload?.binding.entrySlug).toBe('my-slug')
  })

  it('seals draft surface auth scope from query destination', async () => {
    const payload = await buildBootstrapSessionPayload(
      {
        ...CLAIMS_BASE,
        destinationPath: '/draft?resource=projects&id=doc-uuid',
      },
      {},
      1_700_000_000
    )
    expect(payload?.binding).toEqual({
      authScope: { kind: 'collection', resource: 'projects', id: 'doc-uuid' },
      destinationPathname: '/draft',
      entrySlug: '',
    })
  })

  it('returns null when resolver fails (branch B)', async () => {
    const payload = await buildBootstrapSessionPayload(
      {
        ...CLAIMS_BASE,
        destinationPath: '/pl/projekty/unknown',
      },
      {
        previewRoutes: ROUTES,
        resolveCollectionId: async () => null,
      },
      1_700_000_000
    )
    expect(payload).toBeNull()
  })
})
