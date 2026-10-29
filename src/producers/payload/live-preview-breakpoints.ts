import type { LivePreviewConfig } from 'payload'

import type { PayloadDraftCustom } from './draft-custom'
import type { PayloadDraftPluginDefaults } from './draft-resolve'

export type DraftLivePreviewBreakpoint = NonNullable<LivePreviewConfig['breakpoints']>[number]

/** Desktop + mobile; Payload UI always appends a “Responsive” (100%) option. */
export const DEFAULT_DRAFT_LIVE_PREVIEW_BREAKPOINTS: DraftLivePreviewBreakpoint[] = [
  {
    name: 'desktop',
    label: 'Desktop',
    width: 1280,
    height: 800,
  },
  {
    name: 'mobile',
    label: 'Mobile',
    width: 390,
    height: 844,
  },
]

export type DraftLivePreviewOptions = {
  breakpoints?: DraftLivePreviewBreakpoint[]
}

export type PayloadDraftConfigWithLivePreview = PayloadDraftPluginDefaults & {
  livePreview?: DraftLivePreviewOptions
}

export function resolveLivePreviewBreakpoints(
  plugin: PayloadDraftConfigWithLivePreview | undefined,
  schema: PayloadDraftCustom | undefined,
  existing?: LivePreviewConfig['breakpoints']
): DraftLivePreviewBreakpoint[] {
  if (existing?.length) return [...existing]
  const fromSchema = schema?.livePreview?.breakpoints
  if (fromSchema?.length) return [...fromSchema]
  const fromPlugin = plugin?.livePreview?.breakpoints
  if (fromPlugin?.length) return [...fromPlugin]
  return [...DEFAULT_DRAFT_LIVE_PREVIEW_BREAKPOINTS]
}
