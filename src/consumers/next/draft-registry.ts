import type { ComponentType, ReactNode } from 'react'

export type DraftPageLoadContext = {
  locale: string
  resource: string
  id?: string
  /** Nested page registry key (`custom.draft.componentPreview.defaultFrame` in CMS). */
  frame?: string
}

/** Registry seam: `load` + `view`. Optional `frame` query composes another page entry as children. */
export type DraftPageEntry = {
  load: (ctx: DraftPageLoadContext) => Promise<unknown | null>
  view: ComponentType<{ data: any; children?: ReactNode }>
}

export type DraftPagesRegistry = Record<string, DraftPageEntry>
