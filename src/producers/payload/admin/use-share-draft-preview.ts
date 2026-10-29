'use client'

import { toast, useDocumentInfo, useLocale } from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'
import { useCallback, useState } from 'react'
import { SHARE_TTL_SECONDS } from '../../../core/config/constants'
import { normalizePreviewPathname } from '../../../core/draft-surface-query'
import {
  buildPublishedPath,
  type ResolvedPublishedPathConfig,
} from '../../../core/url/published-path'
import { formatDraftTtlLabel } from '../draft-resolve'

export function useShareDraftPreview(
  resource: string,
  options?: {
    apiRoute?: string
    shareDraftTtl?: number
    shareDraftRefreshOnActivity?: boolean
    publishedPathConfig?: ResolvedPublishedPathConfig
    /** Default true — matches query-surface live preview (`/draft?resource=`). */
    shareViaDraftSurface?: boolean
    shareDocumentKind?: 'global' | 'collection'
  }
) {
  const { id, data } = useDocumentInfo()
  const locale = useLocale()
  const apiRoute = options?.apiRoute ?? '/api'
  const shareDraftTtl = options?.shareDraftTtl
  const shareDraftRefreshOnActivity = options?.shareDraftRefreshOnActivity
  const [pending, setPending] = useState(false)

  const share = useCallback(async () => {
    if (pending) return
    setPending(true)
    try {
      const useSurface = options?.shareViaDraftSurface ?? true
      const record = (data ?? {}) as Record<string, unknown>
      if (id != null && record.id === undefined) {
        record.id = id
      }

      let body: Record<string, unknown>
      if (useSurface) {
        const isCollection = options?.shareDocumentKind === 'collection'
        const docId = isCollection
          ? id != null
            ? String(id)
            : typeof record.id === 'string' || typeof record.id === 'number'
              ? String(record.id)
              : undefined
          : undefined
        if (isCollection && !docId) {
          toast.error('Save the document before sharing a draft link.')
          return
        }
        body = {
          surface: {
            resource,
            locale: locale.code,
            ...(docId ? { id: docId } : {}),
          },
        }
      } else {
        const pathConfig = options?.publishedPathConfig
        if (!pathConfig) {
          toast.error('Published preview routes are required to share draft links.')
          return
        }
        const published = buildPublishedPath(pathConfig, record, locale.code)
        const destinationPath = published ? normalizePreviewPathname(published) : null
        if (!destinationPath) {
          toast.error('Cannot build share preview link for this document yet.')
          return
        }
        body = { path: destinationPath }
      }

      if (typeof shareDraftTtl === 'number') body.ttl = shareDraftTtl
      if (typeof shareDraftRefreshOnActivity === 'boolean') {
        body.refreshOnActivity = shareDraftRefreshOnActivity
      }

      const res = await fetch(
        formatAdminURL({
          apiRoute,
          path: '/preview/share-url',
        }),
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )

      const json = (await res.json()) as { url?: string | null }
      if (!res.ok || !json.url) {
        toast.error('Cannot build share preview link for this document yet.')
        return
      }

      await navigator.clipboard.writeText(json.url)
      const ttlSeconds = typeof shareDraftTtl === 'number' ? shareDraftTtl : SHARE_TTL_SECONDS
      toast.success(`Share draft link copied (${formatDraftTtlLabel(ttlSeconds)}).`)
    } catch {
      toast.error('Could not create share preview link.')
    } finally {
      setPending(false)
    }
  }, [
    apiRoute,
    data,
    id,
    locale.code,
    options?.publishedPathConfig,
    options?.shareViaDraftSurface,
    options?.shareDocumentKind,
    pending,
    resource,
    shareDraftRefreshOnActivity,
    shareDraftTtl,
  ])

  return { share, pending }
}
