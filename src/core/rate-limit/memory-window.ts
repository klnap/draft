type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

/** Process-local fixed window limiter (P1 bootstrap/share guard; not distributed). */
export function checkMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): boolean {
  const bucket = buckets.get(key)
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (bucket.count >= limit) return false
  bucket.count += 1
  return true
}

export function clientKeyFromRequest(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  const realIp = req.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp
  return 'unknown'
}
