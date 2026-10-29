import 'server-only'

import { headers } from 'next/headers'

import { DRAFT_PREVIEW_LOCALE_HEADER } from '../../core/config/constants'

/**
 * Active locale for draft chrome (layout shell), if the proxy forwarded it.
 * No validation, no default — `undefined` when absent (non-localized CMS or no `?locale=`).
 */
export async function getDraftLocale(): Promise<string | undefined> {
  const value = (await headers()).get(DRAFT_PREVIEW_LOCALE_HEADER)
  return value && value.length > 0 ? value : undefined
}
