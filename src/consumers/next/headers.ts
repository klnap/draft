/** Default headers on draft rewrite responses + next.config draft routes. */
export const DRAFT_RESPONSE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex',
} as const
