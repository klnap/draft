'use client'

import { Button } from '@base-ui/react/button'
import { SHARE_TTL_SECONDS } from '../../../core/config/constants'
import type { ResolvedPublishedPathConfig } from '../../../core/url/published-path'
import { formatDraftTtlLabel } from '../draft-resolve'
import { ShareDraftIcon } from './ShareDraftIcon'
import { useShareDraftPreview } from './use-share-draft-preview'

type Props = {
  resource: string
  apiRoute?: string
  shareDraftTtl?: number
  shareDraftRefreshOnActivity?: boolean
  publishedPathConfig?: ResolvedPublishedPathConfig
  /** When true (default), share bootstraps `/draft?resource=…` like live preview. */
  shareViaDraftSurface?: boolean
  /** Globals must not send document `id` (Payload still exposes one in document info). */
  shareDocumentKind?: 'global' | 'collection'
}

/** Payload admin control — wired automatically by `draft()` when shareDraft is enabled. */
export default function ShareDraftPreviewButton({
  resource,
  apiRoute,
  shareDraftTtl,
  shareDraftRefreshOnActivity,
  publishedPathConfig,
  shareViaDraftSurface,
  shareDocumentKind,
}: Props) {
  const { share, pending } = useShareDraftPreview(resource, {
    apiRoute,
    shareDraftTtl,
    shareDraftRefreshOnActivity,
    publishedPathConfig,
    shareViaDraftSurface,
    shareDocumentKind,
  })

  const ttlSeconds = typeof shareDraftTtl === 'number' ? shareDraftTtl : SHARE_TTL_SECONDS
  const title = `Copy share draft link (${formatDraftTtlLabel(ttlSeconds)})`

  return (
    <Button
      aria-label={title}
      className='preview-btn'
      disabled={pending}
      id='share-draft-preview'
      onClick={() => void share()}
      title={title}
      type='button'
    >
      <ShareDraftIcon />
    </Button>
  )
}
