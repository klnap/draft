import type {
  DraftSessionBinding,
  DraftSessionPayload,
  DraftTokenClaims,
} from '../../core/config/types'
import { normalizePreviewPathname } from '../../core/draft-surface-query'
import { DRAFT_SURFACE_PATHNAME, parseDraftSurfaceDestination } from '../../core/url/draft-surface'
import type { PreviewRoutes } from '../../core/url/preview-routes'
import { matchPreviewPathname } from '../../core/url/preview-routes'
import type { BootstrapResolveCollectionId } from './bootstrap-resolve'

export type SealBootstrapInput = {
  previewRoutes?: PreviewRoutes
  resolveCollectionId?: BootstrapResolveCollectionId
}

export async function buildBootstrapSessionPayload(
  claims: DraftTokenClaims,
  input: SealBootstrapInput,
  nowSec: number
): Promise<DraftSessionPayload | null> {
  const binding = await resolveSessionBinding(claims, input)
  if (!binding) return null
  return {
    mode: claims.mode,
    expiresAt: nowSec + claims.ttl,
    ttl: claims.ttl,
    refreshOnActivity: claims.refreshOnActivity,
    binding,
  }
}

async function resolveSessionBinding(
  claims: DraftTokenClaims,
  input: SealBootstrapInput
): Promise<DraftSessionBinding | null> {
  const surface = parseDraftSurfaceDestination(claims.destinationPath)
  if (surface) {
    const authScope =
      surface.id && surface.id.length > 0
        ? { kind: 'collection' as const, resource: surface.resource, id: surface.id }
        : { kind: 'global' as const, resource: surface.resource }
    return {
      authScope,
      destinationPathname: DRAFT_SURFACE_PATHNAME,
      entrySlug: '',
    }
  }

  const destinationPathname = normalizePreviewPathname(claims.destinationPath)
  if (!destinationPathname || !input.previewRoutes) return null

  const match = matchPreviewPathname(input.previewRoutes, destinationPathname)
  if (!match) return null

  if (match.kind === 'global') {
    return {
      authScope: { kind: 'global', resource: match.resource },
      destinationPathname,
      entrySlug: '',
    }
  }

  const pathSlug = match.params.slug ?? match.params.id ?? Object.values(match.params)[0]
  if (!pathSlug) return null
  const resolver = input.resolveCollectionId
  if (!resolver) return null
  const id = await resolver(match.resource, pathSlug)
  if (!id) return null

  return {
    authScope: { kind: 'collection', resource: match.resource, id },
    destinationPathname,
    entrySlug: pathSlug,
  }
}
