import type { DRAFT_MODES } from './constants'

export type DraftMode = (typeof DRAFT_MODES)[number]

export type DraftTokenClaims = {
  mode: DraftMode
  destinationPath: string
  iat: number
  exp: number
  ttl: number
  refreshOnActivity: boolean
}

export type PreviewResourceKind = 'collection' | 'global'

export type DraftAuthScope =
  | { kind: 'collection'; resource: string; id: string }
  | { kind: 'global'; resource: string }

export type DraftSessionBinding = {
  authScope: DraftAuthScope
  destinationPathname: string
  entrySlug: string
}

export type DraftSessionPayload = {
  mode: DraftMode
  expiresAt: number
  ttl: number
  refreshOnActivity: boolean
  binding: DraftSessionBinding
}
