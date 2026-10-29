import { describe, expect, it } from 'bun:test'

import {
  DEFAULT_DRAFT_LIVE_PREVIEW_BREAKPOINTS,
  resolveLivePreviewBreakpoints,
} from '../../../../src/producers/payload/live-preview-breakpoints'

describe('resolveLivePreviewBreakpoints', () => {
  it('defaults to desktop + mobile', () => {
    expect(resolveLivePreviewBreakpoints(undefined, undefined)).toEqual(
      DEFAULT_DRAFT_LIVE_PREVIEW_BREAKPOINTS
    )
  })

  it('prefers collection admin breakpoints', () => {
    const custom = [{ name: 'tablet', label: 'Tablet', width: 768, height: 1024 }]
    expect(resolveLivePreviewBreakpoints(undefined, undefined, custom)).toEqual(custom)
  })

  it('uses schema then plugin overrides', () => {
    const plugin = {
      livePreview: {
        breakpoints: [{ name: 'wide', label: 'Wide', width: 1440, height: 900 }],
      },
    }
    const schema = {
      livePreview: {
        breakpoints: [{ name: 'phone', label: 'Phone', width: 375, height: 667 }],
      },
    }
    expect(resolveLivePreviewBreakpoints(plugin, schema)).toEqual(schema.livePreview!.breakpoints)
  })
})
