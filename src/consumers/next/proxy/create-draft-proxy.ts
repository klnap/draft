import { deriveKeysWeb } from '../../../core/crypto/web'
import type { DraftConsumerConfig, DraftModeApi } from '../config'
import {
  definedToConsumerConfig,
  isDraftHostname,
  resolveDraftConsumerConfig,
} from '../config/resolve-config'
import { type DefinedDraft, getDraft, isDefinedDraft } from '../define-draft'
import { createDraftProxy as buildDraftProxyHandler } from './proxy'

function assertSessionCookie(cookie: DraftConsumerConfig['sessionCookie']): void {
  if (cookie?.sameSite === 'none' && cookie.secure === false) {
    throw new Error('sessionCookie: sameSite "none" requires secure: true')
  }
}

function resolveInput(config?: DraftConsumerConfig | DefinedDraft): DraftConsumerConfig {
  if (!config) return definedToConsumerConfig(getDraft())
  if (isDefinedDraft(config)) return definedToConsumerConfig(config)
  return config
}

/**
 * Full Next consumer (edge-safe): soft-session proxy + bootstrap route + isEnabled.
 *
 * Prefer `defineDraft({…})` then `createDraftProxy()` (no args).
 * Return value is callable (= `proxy`) so `defineProxy('draft', await createDraftProxy())` works.
 */
export async function createDraftProxy(
  config?: DraftConsumerConfig | DefinedDraft
): Promise<DraftModeApi> {
  const input = resolveInput(config)
  assertSessionCookie(input.sessionCookie)
  const resolved = resolveDraftConsumerConfig(input)
  const keys = await deriveKeysWeb(resolved.secret)
  const proxyHandler = buildDraftProxyHandler(resolved, keys)

  let routeHandler: ((req: Request) => Promise<Response>) | undefined
  let previewChecker: ((options?: { pathname?: string }) => Promise<boolean>) | undefined

  function proxy(req: Request) {
    return proxyHandler(req as import('next/server').NextRequest)
  }

  return Object.assign(proxy, {
    mode: resolved.mode,
    proxy,
    route(req: Request) {
      if (routeHandler) return routeHandler(req)
      return import('../route/route').then((m) => {
        routeHandler = m.createDraftRouteHandler(resolved)
        return routeHandler!(req)
      })
    },
    isEnabled(options?: { pathname?: string }) {
      if (previewChecker) return previewChecker(options)
      return import('../server/server').then((m) => {
        previewChecker = m.createDraftPreviewChecker(resolved)
        return previewChecker!(options)
      })
    },
    isDraftHost(hostname: string) {
      return isDraftHostname(hostname, resolved.draftHostnames)
    },
  })
}
