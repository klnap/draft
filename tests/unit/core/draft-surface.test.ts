import { describe, expect, it } from 'bun:test'

import {
  buildDraftSurfacePath,
  isDraftSurfaceDestination,
  parseDraftSurfaceDestination,
} from '../../../src/core/url/draft-surface'

describe('draft-surface', () => {
  it('builds and parses draft surface query', () => {
    const path = buildDraftSurfacePath({
      locale: 'pl',
      resource: 'projects',
      id: 'doc-1',
    })
    expect(path).toBe('/draft?locale=pl&resource=projects&id=doc-1')
    expect(isDraftSurfaceDestination(path)).toBe(true)
    expect(parseDraftSurfaceDestination(path)).toEqual({
      locale: 'pl',
      resource: 'projects',
      id: 'doc-1',
    })
  })

  it('includes frame for component preview', () => {
    const path = buildDraftSurfacePath({
      locale: 'pl',
      resource: 'layout',
      frame: '/pl',
    })
    expect(parseDraftSurfaceDestination(path)?.frame).toBe('/pl')
  })
})
