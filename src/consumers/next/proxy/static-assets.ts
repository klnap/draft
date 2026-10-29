const METADATA_PATHS = new Set([
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.webmanifest',
])

export function isStaticOrFrameworkAsset(pathname: string): boolean {
  if (pathname.startsWith('/_next/')) return true
  if (METADATA_PATHS.has(pathname)) return true
  const last = pathname.split('/').pop() ?? ''
  if (!last.includes('.')) return false
  const ext = last.split('.').pop()?.toLowerCase() ?? ''
  return [
    'css',
    'js',
    'mjs',
    'map',
    'woff',
    'woff2',
    'ttf',
    'otf',
    'png',
    'jpg',
    'jpeg',
    'gif',
    'webp',
    'avif',
    'svg',
    'ico',
    'mp4',
    'webm',
    'mp3',
    'wav',
    'pdf',
  ].includes(ext)
}
