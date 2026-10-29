'use client'

import { useDocumentInfo, useLivePreviewContext, useLocale, useTranslation } from '@payloadcms/ui'
import { useMemo } from 'react'

import type { ResolvedPublishedPathConfig } from '../../../core/url/published-path'
import { PublishedSiteIcon } from './PublishedSiteIcon'
import { publishedPreviewHrefFromLocaleCode } from './published-preview-href'

const baseClass = 'preview-btn'

type Props = {
  /** Injected by `draft()` (`clientProps`) — avoids waiting on LivePreview context hydration. */
  frontendOrigin?: string
  publishedPathConfig?: ResolvedPublishedPathConfig
}

/** Payload `admin.preview` link — same behavior as default PreviewButton, different icon. */
export default function PublishedPreviewButton({ frontendOrigin, publishedPathConfig }: Props) {
  const { previewURL } = useLivePreviewContext()
  const { data } = useDocumentInfo()
  const locale = useLocale()
  const { t } = useTranslation()

  const hrefFromDocument = useMemo(() => {
    if (!frontendOrigin || !publishedPathConfig) return null
    return publishedPreviewHrefFromLocaleCode(
      frontendOrigin,
      publishedPathConfig,
      (data ?? undefined) as Record<string, unknown> | undefined,
      locale.code
    )
  }, [data, frontendOrigin, locale.code, publishedPathConfig])

  const href = previewURL ?? hrefFromDocument

  if (!href) {
    return null
  }

  const label = t('version:preview')

  return (
    <a
      aria-label={label}
      className={baseClass}
      href={href}
      id='preview-button'
      rel='noopener noreferrer'
      target='_blank'
      title={label}
    >
      <PublishedSiteIcon />
    </a>
  )
}
