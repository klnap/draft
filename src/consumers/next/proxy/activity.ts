/** Document navigation that may refresh session TTL (strict). */
export function isActivityRequest(req: { method: string; headers: Headers }): boolean {
  if (req.method !== 'GET') return false
  const dest = req.headers.get('sec-fetch-dest')
  if (dest === null) return false
  return dest === 'document'
}
