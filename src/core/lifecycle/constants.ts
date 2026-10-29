import type { DraftMode } from '../config/types'

export type { DraftMode }
export type DraftSurface = 'embedded' | 'top'
export type DraftBootstrapContext = {
  surface: DraftSurface
  gate?: string
}

export const DRAFT_IDLE_EXTENSION_SECONDS: Record<DraftMode, number> = {
  live: 3600,
  share: 86_400,
}

export const DRAFT_SOFT_ABSOLUTE_CAP_SECONDS: Record<DraftMode, number> = {
  live: 12 * 3600,
  share: 86_400,
}

export const DRAFT_COOKIE_INTENT = 'draft_intent'
export const DRAFT_COOKIE_ABS_EXP = 'draft_abs_exp'
export const DRAFT_COOKIE_IDLE_EXP = 'draft_idle_exp'
export const DRAFT_COOKIE_SURFACE = 'draft_surface'
export const DRAFT_QUERY_GATE = 'dg'
export const DRAFT_COOKIE_GATE = 'draft_gate'
export const DRAFT_COOKIE_VIEW = 'draft_view'
export const DRAFT_COOKIE_DOC_PASS = 'draft_doc_pass'
