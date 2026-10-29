import { isValidPreviewPath } from './url'

export const DRAFT_SURFACE_PATHNAME = '/draft'

export type DraftSurfaceQuery = {
  resource: string
  id?: string
  locale?: string
  frame?: string
  route?: string
}

function splitDestination(path: string): { pathname: string; search: string } {
  const qIndex = path.indexOf('?')
  if (qIndex === -1) return { pathname: path, search: '' }
  return { pathname: path.slice(0, qIndex), search: path.slice(qIndex) }
}

/** Build canonical draft surface destination for NDM1 `destinationPath`. */
export function buildDraftSurfacePath(input: {
  resource: string
  id?: string
  locale?: string
  frame?: string
  route?: string
}): string {
  const params = new URLSearchParams()
  if (input.locale) params.set('locale', input.locale)
  params.set('resource', input.resource)
  if (input.id) params.set('id', input.id)
  if (input.frame) params.set('frame', input.frame)
  if (input.route) params.set('route', input.route)
  const qs = params.toString()
  const path = qs ? `${DRAFT_SURFACE_PATHNAME}?${qs}` : DRAFT_SURFACE_PATHNAME
  if (!isValidPreviewPath(path)) {
    throw new Error('buildDraftSurfacePath: invalid preview path')
  }
  return path
}

export function parseDraftSurfaceDestination(path: string): DraftSurfaceQuery | null {
  if (!isValidPreviewPath(path)) return null
  const { pathname, search } = splitDestination(path)
  if (pathname !== DRAFT_SURFACE_PATHNAME) return null
  if (!search) return null

  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const resource = params.get('resource')
  if (!resource) return null

  const id = params.get('id') ?? undefined
  const locale = params.get('locale') ?? undefined
  const frame = params.get('frame') ?? undefined
  const route = params.get('route') ?? undefined

  return { resource, id, locale, frame, route }
}

export function isDraftSurfaceDestination(path: string): boolean {
  return parseDraftSurfaceDestination(path) !== null
}
