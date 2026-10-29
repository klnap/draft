import type { PayloadRequest } from 'payload'

import { normalizePreviewPathname } from '../../../core/draft-surface-query'
import { matchPreviewPathname, type PreviewRoutes } from '../../../core/url/preview-routes'
import { isValidPreviewPath } from '../../../core/url/url'

const FORBIDDEN = { error: 'Forbidden' } as const

export type SharePathResolution =
  | { kind: 'collection'; resource: string; slug: string }
  | { kind: 'global'; resource: string }

export type ShareSurfaceResolution =
  | { kind: 'global'; resource: string }
  | { kind: 'collection'; resource: string; id: string }

export function resolveSharePathScope(
  path: string,
  routeIndex: Map<string, PreviewRoutes[string]>
): SharePathResolution | null {
  if (!isValidPreviewPath(path)) return null
  if (path.includes('?')) return null

  const pathname = normalizePreviewPathname(path)
  if (!pathname) return null

  for (const [resource, routes] of routeIndex.entries()) {
    const match = matchPreviewPathname({ [resource]: routes } as PreviewRoutes, pathname)
    if (!match) continue
    if (match.kind === 'global') return { kind: 'global', resource: match.resource }
    const slug = match.params.slug ?? Object.values(match.params)[0]
    if (!slug) return null
    return { kind: 'collection', resource: match.resource, slug }
  }
  return null
}

export async function assertSharePreviewSurfaceAccess(
  req: PayloadRequest,
  scope: ShareSurfaceResolution
): Promise<void> {
  if (!req.user) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 })
  }

  try {
    if (scope.kind === 'global') {
      const doc = await req.payload.findGlobal({
        slug: scope.resource,
        user: req.user,
        overrideAccess: false,
        draft: true,
        depth: 0,
        disableErrors: true,
      })
      if (!doc) {
        throw Object.assign(new Error('Forbidden'), { status: 403, body: FORBIDDEN })
      }
      return
    }

    const doc = await req.payload.findByID({
      collection: scope.resource,
      id: scope.id,
      user: req.user,
      overrideAccess: false,
      draft: true,
      depth: 0,
      disableErrors: true,
    })
    if (!doc) {
      throw Object.assign(new Error('Forbidden'), { status: 403, body: FORBIDDEN })
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error) throw error
    throw error
  }
}

export async function assertSharePreviewAccess(
  req: PayloadRequest,
  scope: SharePathResolution
): Promise<void> {
  if (!req.user) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 })
  }

  try {
    if (scope.kind === 'global') {
      const doc = await req.payload.findGlobal({
        slug: scope.resource,
        user: req.user,
        overrideAccess: false,
        draft: true,
        depth: 0,
        disableErrors: true,
      })
      if (!doc) {
        throw Object.assign(new Error('Forbidden'), { status: 403, body: FORBIDDEN })
      }
      return
    }

    const result = await req.payload.find({
      collection: scope.resource,
      where: { slug: { equals: scope.slug } },
      user: req.user,
      overrideAccess: false,
      draft: true,
      limit: 2,
      depth: 0,
    })
    const docs = result?.docs ?? []
    if (docs.length !== 1) {
      throw Object.assign(new Error('Forbidden'), { status: 403, body: FORBIDDEN })
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error) throw error
    throw error
  }
}
