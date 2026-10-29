import type { BootstrapResolveCollectionId } from './bootstrap-resolve'
import type { PathStrategy, PreviewRoutes, SessionCookieOptions } from './config'
import type { DraftPagesRegistry } from './draft-registry'
import { clearDraftStore, readDraftStore, writeDraftStore } from './draft-store'

export type DraftPreviewMode = 'origin' | 'path'

export type DefineDraftInput = {
  secret?: string
  preview?: {
    liveUrl: string
    draftUrl?: string
  }
  secure?: boolean
  sessionCookie?: SessionCookieOptions
  previewRoutes?: PreviewRoutes
  resolveCollectionId?: BootstrapResolveCollectionId
  paths?: PathStrategy
  rewriteResponseHeaders?: Record<string, string>
  locales?: readonly string[]
  defaultLocale?: string
  pages?: DraftPagesRegistry
}

export type DefinedDraft = {
  secret: string
  preview: {
    liveUrl: string
    draftUrl: string
  }
  mode: DraftPreviewMode
  secure: boolean
  sessionCookie?: SessionCookieOptions
  paths?: PathStrategy
  previewRoutes?: PreviewRoutes
  resolveCollectionId?: BootstrapResolveCollectionId
  rewriteResponseHeaders?: Record<string, string>
  locales?: readonly string[]
  defaultLocale?: string
  pages?: DraftPagesRegistry
}

function registered(): DefinedDraft | null {
  const value = readDraftStore()
  return value && isDefinedDraft(value) ? value : null
}

function hostnameOf(origin: string): string {
  return new URL(origin).hostname.toLowerCase()
}

function assertCoreMatches(input: DefineDraftInput): void {
  const current = registered()
  if (!current || !input.preview) return
  const liveUrl = input.preview.liveUrl.replace(/\/$/, '')
  const draftUrl = (input.preview.draftUrl ?? input.preview.liveUrl).replace(/\/$/, '')
  if (
    (input.secret && input.secret !== current.secret) ||
    current.preview.liveUrl !== liveUrl ||
    current.preview.draftUrl !== draftUrl
  ) {
    throw new Error('defineDraft: already called in this process with different configuration')
  }
}

export function defineDraft(input: DefineDraftInput): DefinedDraft {
  const current = registered()
  if (current) {
    assertCoreMatches(input)
    const next: DefinedDraft = {
      ...current,
      previewRoutes: input.previewRoutes ?? current.previewRoutes,
      resolveCollectionId: input.resolveCollectionId ?? current.resolveCollectionId,
      paths: input.paths ?? current.paths,
      locales: input.locales ?? current.locales,
      defaultLocale: input.defaultLocale ?? current.defaultLocale,
      pages: input.pages ? { ...current.pages, ...input.pages } : current.pages,
    }
    writeDraftStore(next)
    return next
  }

  if (!input.secret || input.secret.length < 24) {
    throw new Error('defineDraft: secret must be at least 24 characters')
  }
  if (!input.preview?.liveUrl) {
    throw new Error('defineDraft: preview.liveUrl is required')
  }

  const liveUrl = input.preview.liveUrl.replace(/\/$/, '')
  const draftUrl = (input.preview.draftUrl ?? input.preview.liveUrl).replace(/\/$/, '')
  const mode: DraftPreviewMode = hostnameOf(liveUrl) === hostnameOf(draftUrl) ? 'path' : 'origin'
  const secure = input.secure ?? process.env.NODE_ENV !== 'development'

  const defined: DefinedDraft = {
    secret: input.secret,
    preview: { liveUrl, draftUrl },
    mode,
    secure,
    sessionCookie: input.sessionCookie,
    paths: input.paths,
    previewRoutes: input.previewRoutes,
    resolveCollectionId: input.resolveCollectionId,
    rewriteResponseHeaders: input.rewriteResponseHeaders,
    locales: input.locales,
    defaultLocale: input.defaultLocale,
    pages: input.pages,
  }
  writeDraftStore(defined)
  return defined
}

export function getDraft(): DefinedDraft {
  const current = registered()
  if (!current) {
    throw new Error('defineDraft must be called before createDraftProxy')
  }
  return current
}

export function resetDraft(): void {
  clearDraftStore()
}

export function isDefinedDraft(value: unknown): value is DefinedDraft {
  return (
    typeof value === 'object' &&
    value !== null &&
    'preview' in value &&
    'mode' in value &&
    'secret' in value
  )
}
