import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { createElement } from 'react'

import { parseDraftSurfaceDestination } from '../../core/url/draft-surface'
import { authScopeMatchesSurface } from './auth-scope'
import { getDraft } from './define-draft'
import { getDraftContext } from './draft-context'
import type { DraftPageEntry, DraftPageLoadContext } from './draft-registry'

export type DraftPageSearchParams = Record<string, string | string[] | undefined>

function pickParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].length > 0) {
    return value[0]
  }
  return undefined
}

function resolveLocale(
  queryLocale: string | undefined,
  locales: readonly string[] | undefined,
  defaultLocale: string | undefined
): string {
  if (queryLocale) {
    if (!locales?.length || locales.includes(queryLocale)) return queryLocale
  }
  if (defaultLocale) return defaultLocale
  if (locales?.[0]) return locales[0]
  return queryLocale ?? ''
}

async function loadPage(entry: DraftPageEntry, ctx: DraftPageLoadContext): Promise<unknown | null> {
  return entry.load(ctx)
}

type DraftPageProps = {
  searchParams: Promise<DraftPageSearchParams>
}

export async function DraftPage({ searchParams }: DraftPageProps) {
  await connection()
  const params = await searchParams
  const resource = pickParam(params.resource)
  if (!resource) notFound()

  const id = pickParam(params.id)
  const frame = pickParam(params.frame)
  const route = pickParam(params.route)
  const destination = `/draft?${new URLSearchParams(
    Object.entries({ locale: pickParam(params.locale), resource, id, frame, route }).filter(
      ([, v]) => typeof v === 'string' && v.length > 0
    ) as [string, string][]
  ).toString()}`

  const surface = parseDraftSurfaceDestination(destination)
  if (!surface) notFound()

  const { session } = await getDraftContext()
  if (!session) notFound()

  if (!authScopeMatchesSurface(session.binding.authScope, surface)) {
    notFound()
  }

  const registry = getDraft()
  const locale = resolveLocale(surface.locale, registry.locales, registry.defaultLocale)
  const frameResource = surface.frame ?? surface.route

  // Site chrome global — `LocaleLayout` in app draft layout; body = `frame` page entry.
  if (resource === 'layout') {
    const frameKey = frameResource ?? 'home-page'
    const frameEntry = registry.pages?.[frameKey] as DraftPageEntry | undefined
    if (!frameEntry) notFound()
    const frameData = await loadPage(frameEntry, {
      locale,
      resource: frameKey,
      id: surface.id,
    })
    if (!frameData) notFound()
    return createElement(frameEntry.view, { data: frameData })
  }

  const ctx: DraftPageLoadContext = {
    locale,
    resource: surface.resource,
    id: surface.id,
    frame: frameResource,
  }

  const pageEntry = registry.pages?.[resource] as DraftPageEntry | undefined
  if (!pageEntry) notFound()

  const data = await loadPage(pageEntry, ctx)
  if (!data) notFound()

  const View = pageEntry.view

  if (frameResource) {
    const frameEntry = registry.pages?.[frameResource] as DraftPageEntry | undefined
    if (!frameEntry) {
      return createElement(
        View,
        { data },
        <p className='text-sm text-zinc-600'>Unknown preview frame resource.</p>
      )
    }

    const frameData = await loadPage(frameEntry, {
      locale,
      resource: frameResource,
      id: surface.id,
    })
    if (!frameData) {
      return createElement(
        View,
        { data },
        <p className='text-sm text-zinc-600'>Preview frame could not be loaded.</p>
      )
    }

    const FrameView = frameEntry.view
    return createElement(View, { data }, createElement(FrameView, { data: frameData }))
  }

  return createElement(View, { data })
}
