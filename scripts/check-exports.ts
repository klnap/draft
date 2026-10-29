/**
 * Asserts every package.json export subpath resolves and exposes expected public symbols.
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const root = new URL('../src/index.ts', import.meta.url).href
const consumerIndex = join(pkgRoot, 'src/consumers/next/index.ts')
const headers = new URL('../src/consumers/next/headers.ts', import.meta.url).href
const producer = new URL('../src/producers/payload/index.ts', import.meta.url).href
const shareButton = new URL(
  '../src/producers/payload/admin/ShareDraftPreviewButton.tsx',
  import.meta.url
).href
const publishedButton = new URL(
  '../src/producers/payload/admin/PublishedPreviewButton.tsx',
  import.meta.url
).href

function resolveModule(baseDir: string, spec: string): string | null {
  const rel = join(baseDir, spec)
  for (const candidate of [`${rel}.ts`, `${rel}.tsx`, join(rel, 'index.ts')]) {
    if (existsSync(candidate)) return candidate
  }
  return null
}

function parseExportBinding(spec: string): string | null {
  const trimmed = spec.trim()
  if (!trimmed || trimmed.startsWith('type ')) return null
  const asMatch = trimmed.match(/\bas\s+(\w+)\s*$/)
  if (asMatch) return asMatch[1]!
  const name = trimmed.split(/\s+/).pop()
  return name ?? null
}

/** Next consumer barrel re-exports server-only modules — verify surface from index.ts without importing. */
function loadConsumerNextExportSurface(): Record<string, unknown> {
  const dir = dirname(consumerIndex)
  const src = readFileSync(consumerIndex, 'utf8')
  const out: Record<string, true> = {}

  const fromRe = /export\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g
  for (const match of src.matchAll(fromRe)) {
    const spec = match[2]!
    const target = resolveModule(dir, spec)
    if (!target) {
      throw new Error(`check:exports: unresolved consumer re-export ${spec}`)
    }
    for (const part of match[1]!.split(',')) {
      const name = parseExportBinding(part)
      if (name) out[name] = true
    }
  }

  for (const match of src.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)) {
    out[match[1]!] = true
  }

  return out
}

const expected: { mod: Record<string, unknown>; names: string[]; label: string }[] = [
  {
    label: '.',
    mod: await import(root),
    names: [
      'deriveKeysWeb',
      'signToken',
      'verifyToken',
      'sealSession',
      'openSession',
      'isValidPreviewPath',
      'isDraftMode',
      'createDraftProducer',
      'createDraftProtocolSurface',
      'sessionPayloadFromTokenClaims',
      'DRAFT_MODES',
      'PREVIEW_REQUEST_HEADER',
      'SESSION_COOKIE_NAME',
      'CLOCK_SKEW_SECONDS',
      'LIVE_TTL_SECONDS',
      'SHARE_TTL_SECONDS',
      'DEFAULT_BOOTSTRAP_PATH',
      'normalizePreviewPathname',
      'planBootstrapFromToken',
      'resolveBootstrapSurface',
      'evaluateSoftLifecycleBypass',
      'lifecycleExpiryForMode',
      'readDraftIntent',
      'readDraftSurface',
    ],
  },
  {
    label: './consumers/next',
    mod: loadConsumerNextExportSurface(),
    names: [
      'createDraft',
      'createDraftProxy',
      'GET',
      'defineDraft',
      'getDraft',
      'resetDraft',
      'isDefinedDraft',
      'isActivityRequest',
      'DRAFT_RESPONSE_HEADERS',
      'defaultBlockPublicDraftPath',
      'defaultRequestHostname',
      'isDraftHostname',
      'requestPublicOrigin',
      'resolveDraftConsumerConfig',
      'definedToConsumerConfig',
      'toDraftProxyConfig',
      'buildPreviewPath',
    ],
  },
  {
    label: './consumers/next/headers',
    mod: await import(headers),
    names: ['DRAFT_RESPONSE_HEADERS'],
  },
  {
    label: './producers/payload',
    mod: await import(producer),
    names: [
      'draftBootstrapUrl',
      'signDraftBootstrapToken',
      'createPayloadDraftSigning',
      'PUBLISHED_PREVIEW_BUTTON',
      'SHARE_DRAFT_PREVIEW_BUTTON',
      'draft',
      'buildPreviewPath',
      'signToken',
      'verifyToken',
    ],
  },
]

const failures: string[] = []

for (const entry of expected) {
  for (const name of entry.names) {
    if (!(name in entry.mod)) {
      failures.push(`${entry.label} missing export ${name}`)
    }
  }
}

const shareMod = await import(shareButton)
if (!('default' in shareMod)) {
  failures.push('./producers/payload/admin/ShareDraftPreviewButton missing default export')
}

const publishedMod = await import(publishedButton)
if (!('default' in publishedMod)) {
  failures.push('./producers/payload/admin/PublishedPreviewButton missing default export')
}

const shareUi = await import(
  new URL('../src/producers/payload/admin/share-ui.ts', import.meta.url).href
)
if (
  shareUi.SHARE_DRAFT_PREVIEW_BUTTON !==
  '@klnap/draft/producers/payload/admin/ShareDraftPreviewButton'
) {
  failures.push('SHARE_DRAFT_PREVIEW_BUTTON path string changed')
}

const publishedUi = await import(
  new URL('../src/producers/payload/admin/published-preview-ui.ts', import.meta.url).href
)
if (
  publishedUi.PUBLISHED_PREVIEW_BUTTON !==
  '@klnap/draft/producers/payload/admin/PublishedPreviewButton'
) {
  failures.push('PUBLISHED_PREVIEW_BUTTON path string changed')
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('check:exports ok')
