import { describe, expect, it } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const PKG = join(import.meta.dir, '..', '..', 'src')

function collectSourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...collectSourceFiles(p))
    else if (p.endsWith('.ts') || p.endsWith('.tsx')) out.push(p)
  }
  return out
}

function collectTsFiles(dir: string): string[] {
  return collectSourceFiles(dir).filter((p) => p.endsWith('.ts'))
}

function fileText(path: string): string {
  return readFileSync(path, 'utf8')
}

function fileImportsNextHeaders(path: string): boolean {
  return /from ['"]next\/headers['"]/.test(fileText(path))
}

function staticImportTargets(path: string): string[] {
  const text = fileText(path)
  const imports: string[] = []
  const re = /from ['"](\.\.?\/[^'"]+)['"]/g
  let m = re.exec(text)
  while (m !== null) {
    imports.push(m[1]!)
    m = re.exec(text)
  }
  return imports
}

function resolveRelative(fromFile: string, spec: string): string {
  const base = join(fromFile, '..', spec)
  for (const ext of ['', '.ts', '.tsx', '/index.ts']) {
    const candidate = base.endsWith('.ts') || base.endsWith('.tsx') ? base : base + ext
    try {
      if (statSync(candidate).isFile()) return candidate
    } catch {
      /* try next */
    }
  }
  return `${base}.ts`
}

function collectStaticGraph(entry: string, stopDirs: string[] = []): string[] {
  const seen = new Set<string>()
  const stack = [entry]
  while (stack.length) {
    const file = stack.pop()!
    if (seen.has(file)) continue
    seen.add(file)
    const rel = relative(PKG, file)
    if (stopDirs.some((d) => rel.startsWith(d))) continue
    for (const spec of staticImportTargets(file)) {
      if (!spec.startsWith('.')) continue
      stack.push(resolveRelative(file, spec))
    }
  }
  return [...seen]
}

function relPath(file: string): string {
  return relative(PKG, file).replaceAll('\\', '/')
}

function assertNoPatterns(file: string, patterns: RegExp[], label: string) {
  const text = fileText(file)
  for (const pattern of patterns) {
    expect({
      file: relPath(file),
      label,
      pattern: pattern.source,
      hit: pattern.test(text),
    }).toEqual({
      file: relPath(file),
      label,
      pattern: pattern.source,
      hit: false,
    })
  }
}

const CORE_FORBIDDEN = [
  /from ['"]next(?:\/|['"])/,
  /from ['"]react(?:\/|['"])/,
  /from ['"]react-dom(?:\/|['"])/,
  /from ['"]payload(?:\/|['"])/,
  /from ['"]@payloadcms\//,
  /consumers\/next/,
  /producers\/payload/,
  /\/adapters\//,
]

const ADAPTER_FORBIDDEN = [
  /from ['"]next(?:\/|['"])/,
  /from ['"]react(?:\/|['"])/,
  /from ['"]react-dom(?:\/|['"])/,
  /from ['"]payload(?:\/|['"])/,
  /from ['"]@payloadcms\//,
  /consumers\/next/,
  /producers\/payload/,
]

const GENERIC_CONSUMER_FORBIDDEN = [
  /from ['"]next(?:\/|['"])/,
  /from ['"]react(?:\/|['"])/,
  /from ['"]react-dom(?:\/|['"])/,
  /from ['"]payload(?:\/|['"])/,
  /from ['"]@payloadcms\//,
  /consumers\/next/,
  /producers\/payload/,
]

const CONSUMER_NEXT_FORBIDDEN = [/from ['"]payload(?:\/|['"])/, /from ['"]@payloadcms\//]

describe('import graph', () => {
  it('core/* does not import next, payload, react, or adapter layers', () => {
    const coreDir = join(PKG, 'core')
    for (const file of collectTsFiles(coreDir)) {
      assertNoPatterns(file, CORE_FORBIDDEN, 'core')
    }
  })

  it('adapters/* does not import built-in trees or framework runtimes', () => {
    const dir = join(PKG, 'adapters')
    for (const file of collectTsFiles(dir)) {
      assertNoPatterns(file, ADAPTER_FORBIDDEN, 'adapters')
    }
  })

  it('consumers/next/* does not import producers/payload or Payload packages', () => {
    const dir = join(PKG, 'consumers', 'next')
    for (const file of collectSourceFiles(dir)) {
      const text = fileText(file)
      expect(text.includes('producers/payload')).toBe(false)
      for (const pattern of CONSUMER_NEXT_FORBIDDEN) {
        expect(pattern.test(text)).toBe(false)
      }
    }
  })

  it('producers/payload/* does not import consumers/next or next/*', () => {
    const dir = join(PKG, 'producers', 'payload')
    for (const file of collectSourceFiles(dir)) {
      const text = fileText(file)
      expect(text.includes('consumers/next')).toBe(false)
      expect(text.includes('/consumer/')).toBe(false)
      expect(/from ['"]next\//.test(text)).toBe(false)
    }
  })

  it('@payloadcms/ui and react imports stay under producers/payload/admin', () => {
    const adminDir = join(PKG, 'producers/payload/admin')
    const adminPrefix = `${adminDir}/`
    for (const file of collectSourceFiles(join(PKG, 'producers/payload'))) {
      if (file.startsWith(adminPrefix)) continue
      const text = fileText(file)
      expect(/from ['"]@payloadcms\/ui['"]/.test(text)).toBe(false)
      expect(/from ['"]react['"]/.test(text)).toBe(false)
      expect(/from ['"]react-dom['"]/.test(text)).toBe(false)
    }
  })

  it('node:* imports only appear in core/crypto/node.ts or core/session/session-wire.ts', () => {
    const allowed = new Set(['core/crypto/node.ts', 'core/session/session-wire.ts'])
    for (const file of collectSourceFiles(PKG)) {
      const text = fileText(file)
      if (!/from ['"]node:/.test(text)) continue
      expect(allowed.has(relPath(file))).toBe(true)
    }
  })

  it('consumers/next/proxy transitive graph avoids next/headers, route/server, and node crypto', () => {
    const proxyDir = join(PKG, 'consumers/next/proxy')
    const entries = collectTsFiles(proxyDir)
    const merged = new Set<string>()
    for (const entry of entries) {
      for (const file of collectStaticGraph(entry)) merged.add(file)
    }
    for (const file of merged) {
      expect(fileImportsNextHeaders(file)).toBe(false)
      expect(file.includes('/route/')).toBe(false)
      expect(file.includes('/server/')).toBe(false)
      expect(relPath(file)).not.toBe('core/crypto/node.ts')
    }
  })

  it('create-draft-mode static graph avoids next/headers and route/server', () => {
    const graph = collectStaticGraph(join(PKG, 'consumers/next/create-draft.ts'))
    for (const file of graph) {
      expect(fileImportsNextHeaders(file)).toBe(false)
      expect(file.includes('/route/route.ts')).toBe(false)
      expect(file.includes('/server/server.ts')).toBe(false)
    }
  })

  it('index.ts does not static-import route, server, or Next consumer', () => {
    const index = fileText(join(PKG, 'index.ts'))
    expect(index.includes('./route')).toBe(false)
    expect(index.includes('./server')).toBe(false)
    expect(/from ['"].*consumers\/next/.test(index)).toBe(false)
    expect(/export \{[^}]*createDraftProxy/.test(index)).toBe(false)
    expect(/export \{[^}]*createDraft[^P]/.test(index)).toBe(false)
    expect(/export \{[^}]*draftProxy/.test(index)).toBe(false)
    expect(/export \{[^}]*createDraftProxy/.test(index)).toBe(false)
  })

  it('producers/payload/index.ts does not import consumers/next', () => {
    const payload = fileText(join(PKG, 'producers/payload/index.ts'))
    expect(payload.includes('consumers/next')).toBe(false)
  })

  it("'use client' only under producers/payload/admin", () => {
    for (const file of collectSourceFiles(PKG)) {
      const text = fileText(file)
      if (!text.includes("'use client'") && !text.includes('"use client"')) continue
      expect(relPath(file).startsWith('producers/payload/admin/')).toBe(true)
    }
  })

  it('src/consumer/** does not import next, payload, or built-in trees', () => {
    const dir = join(PKG, 'consumer')
    if (!statSync(dir).isDirectory()) return
    for (const file of collectTsFiles(dir)) {
      assertNoPatterns(file, GENERIC_CONSUMER_FORBIDDEN, 'consumer')
    }
  })

  it('core/lifecycle does not contain Next draft-mode cookie constants', () => {
    const lifecycleDir = join(PKG, 'core/lifecycle')
    for (const file of collectTsFiles(lifecycleDir)) {
      const text = fileText(file)
      expect(text.includes('NEXT_DRAFT_BYPASS_COOKIE')).toBe(false)
      expect(text.includes('__prerender_bypass')).toBe(false)
      expect(text.includes('__next_preview_data')).toBe(false)
    }
  })

  it('core/* does not import generic consumer layer', () => {
    const coreDir = join(PKG, 'core')
    for (const file of collectTsFiles(coreDir)) {
      const text = fileText(file)
      expect(text.includes('/consumer/')).toBe(false)
      expect(text.includes("from '../consumer")).toBe(false)
      expect(text.includes("from '../../consumer")).toBe(false)
    }
  })

  it('fake adapter fixtures do not import built-in adapters', () => {
    const fixtures = join(import.meta.dir, '..', 'helpers', 'fakes')
    for (const file of collectTsFiles(fixtures)) {
      const text = fileText(file)
      expect(text.includes('consumers/next')).toBe(false)
      expect(text.includes('producers/payload')).toBe(false)
      expect(text.includes('/core/')).toBe(false)
    }
  })
})
