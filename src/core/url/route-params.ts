import { localeCode } from './preview-path'

export type RouteParamFieldSpec = {
  field: string
  localized?: boolean
}

export type RouteParamMapping = string | RouteParamFieldSpec

export type RouteParamsConfig = Record<string, RouteParamMapping>

const DYNAMIC_SEGMENT = /\[([^\]]+)\]/g

const UNSUPPORTED_TEMPLATE = /\[\[\.\.\.|\[\.\.\.[^\]]*\]|\/\[\](?:\/|$)|\[\[|\]\]|\/\[\.\.\./

const VALID_PARAM_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/

const FORBIDDEN_FIELD_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype'])

/** True when the template uses dynamic segment syntax this package does not support. */
export function templateHasUnsupportedDynamicSyntax(template: string): boolean {
  return UNSUPPORTED_TEMPLATE.test(template)
}

function isSupportedParamName(name: string): boolean {
  if (!VALID_PARAM_NAME.test(name)) return false
  if (name.includes('..')) return false
  return true
}

/** Ordered unique `[paramName]` segments from a pathname template. */
export function extractDynamicSegments(template: string): string[] {
  if (templateHasUnsupportedDynamicSyntax(template)) return []

  const names: string[] = []
  const seen = new Set<string>()
  for (const match of template.matchAll(DYNAMIC_SEGMENT)) {
    const name = match[1]
    if (!name || !isSupportedParamName(name) || seen.has(name)) continue
    seen.add(name)
    names.push(name)
  }
  return names
}

/** Read a nested field from document data; missing paths return `undefined` (never throw). */
export function readValueAtPath(data: Record<string, unknown>, fieldPath: string): unknown {
  if (fieldPath.length === 0) return undefined
  const parts = fieldPath.split('.')
  if (parts.some((part) => part.length === 0 || FORBIDDEN_FIELD_SEGMENTS.has(part))) {
    return undefined
  }

  let current: unknown = data
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    if (Array.isArray(current)) return undefined
    if (!Object.hasOwn(current as object, part)) return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function normalizeMapping(mapping: RouteParamMapping): RouteParamFieldSpec | null {
  if (typeof mapping === 'string') {
    if (mapping.length === 0) return null
    return { field: mapping, localized: false }
  }
  if (typeof mapping.field !== 'string' || mapping.field.length === 0) return null
  return mapping
}

function coerceParamString(raw: unknown, code: string, localized: boolean): string | null {
  if (localized) {
    if (typeof raw === 'string') return raw.length > 0 ? raw : null
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const value = (raw as Record<string, unknown>)[code]
      if (typeof value === 'string' && value.length > 0) return value
    }
    return null
  }
  if (typeof raw === 'string') return raw.length > 0 ? raw : null
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw)
  return null
}

/** Resolve one route parameter from Payload document data and explicit field mapping. */
export function resolveRouteParam(
  paramName: string,
  data: Record<string, unknown>,
  locale: unknown,
  routeParams: RouteParamsConfig | undefined
): string | null {
  const code = localeCode(locale)
  if (!code) return null

  const mapping = routeParams?.[paramName]
  if (mapping === undefined) return null

  const spec = normalizeMapping(mapping)
  if (!spec) return null

  const raw = readValueAtPath(data, spec.field)
  return coerceParamString(raw, code, spec.localized === true)
}

/** Substitute `[paramName]` segments; returns `null` if any required value is missing. */
export function applyDynamicSegments(
  pattern: string,
  data: Record<string, unknown>,
  locale: unknown,
  routeParams: RouteParamsConfig | undefined
): string | null {
  if (templateHasUnsupportedDynamicSyntax(pattern)) return null

  const segments = extractDynamicSegments(pattern)
  if (segments.length === 0 && DYNAMIC_SEGMENT.test(pattern)) return null

  let result = pattern
  for (const name of segments) {
    const value = resolveRouteParam(name, data, locale, routeParams)
    if (!value) return null
    result = result.replaceAll(`[${name}]`, encodeURIComponent(value))
  }
  if (/\[[^\]]+\]/.test(result)) return null
  return result
}
