import { parseCookieInt, readDraftIntent, readDraftSurface } from './lifecycle'

export type SoftLifecycleBypassInput = {
  nowSec: number
  intentCookie?: string
  absExpCookie?: string
  surfaceCookie?: string
  fetchDest: string | null
  pathname: string
  onDraftHost: boolean
  gateQuery: string | null
  gateCookie?: string
  viewPath?: string
  docPass: boolean
  isBlockedPublicDraftPath: boolean
}

export type SoftLifecycleBypassDecision =
  | { action: 'clear_session' }
  | { action: 'run_base'; refreshLifecycle: true }
  | {
      action: 'accept_gate_redirect'
      pathname: string
      setViewPath: string
      setDocPass: true
      refreshLifecycle: true
    }
  | {
      action: 'run_base'
      refreshLifecycle: true
      clearDocPass: true
      setViewPath: string
    }

function gateMatches(gateQuery: string | null, gateCookie?: string): boolean {
  return Boolean(gateQuery && gateCookie && gateQuery === gateCookie)
}

function topSurfaceDocumentFlow(input: SoftLifecycleBypassInput): SoftLifecycleBypassDecision {
  const { fetchDest: dest, pathname, gateQuery, gateCookie, viewPath, docPass } = input

  if (dest === 'document') {
    if (gateMatches(gateQuery, gateCookie)) {
      return {
        action: 'accept_gate_redirect',
        pathname,
        setViewPath: pathname,
        setDocPass: true,
        refreshLifecycle: true,
      }
    }
    if (docPass) {
      return {
        action: 'run_base',
        refreshLifecycle: true,
        clearDocPass: true,
        setViewPath: pathname,
      }
    }
    if (viewPath && pathname === viewPath) {
      return { action: 'run_base', refreshLifecycle: true }
    }
    return { action: 'clear_session' }
  }

  if (dest === 'empty' && viewPath && pathname === viewPath) {
    return { action: 'run_base', refreshLifecycle: true }
  }

  return { action: 'clear_session' }
}

/** Pure soft-lifecycle decision when framework preview bypass is active. */
export function evaluateSoftLifecycleBypass(
  input: SoftLifecycleBypassInput
): SoftLifecycleBypassDecision {
  const intent = readDraftIntent(input.intentCookie)
  const absExp = parseCookieInt(input.absExpCookie)

  if (!intent || absExp === null || input.nowSec >= absExp) {
    return { action: 'clear_session' }
  }

  const dest = input.fetchDest
  const surface = readDraftSurface(input.surfaceCookie)

  if (surface === 'embedded') {
    if (dest === 'iframe' || dest === 'empty' || dest === null) {
      return { action: 'run_base', refreshLifecycle: true }
    }
    if (intent === 'live' && dest === 'document' && input.isBlockedPublicDraftPath) {
      return { action: 'run_base', refreshLifecycle: true }
    }
    return { action: 'clear_session' }
  }

  if (surface !== 'top') {
    if (dest === 'iframe') {
      return { action: 'run_base', refreshLifecycle: true }
    }
    return { action: 'clear_session' }
  }

  if (intent === 'share' && !input.onDraftHost) {
    if (dest === 'document' && gateMatches(input.gateQuery, input.gateCookie)) {
      return {
        action: 'accept_gate_redirect',
        pathname: input.pathname,
        setViewPath: input.pathname,
        setDocPass: true,
        refreshLifecycle: true,
      }
    }
    if (input.docPass) {
      return {
        action: 'run_base',
        refreshLifecycle: true,
        clearDocPass: true,
        setViewPath: input.pathname,
      }
    }
    if (input.viewPath && input.pathname === input.viewPath) {
      return { action: 'run_base', refreshLifecycle: true }
    }
    return { action: 'clear_session' }
  }

  return topSurfaceDocumentFlow(input)
}
