import { DEFAULT_BOOTSTRAP_PATH } from '../core/config/constants'
import type { DraftMode, DraftTokenClaims } from '../core/config/types'
import { signToken } from '../core/token/token'
import { liveBucketExp } from '../core/url/url'

export type DraftProducerAdapterConfig = {
  rootSecret: string
  bootstrapPath?: string
}

export type SignBootstrapClaimsInput = {
  mode: DraftMode
  destinationPath: string
  nowSec?: number
  ttl?: number
  refreshOnActivity?: boolean
  /** Issuer override; default live uses `liveBucketExp`, share uses `nowSec + ttl`. */
  exp?: number
}

export type DraftProducerAdapter = {
  signBootstrapToken: (input: SignBootstrapClaimsInput) => DraftTokenClaims & { token: string }
  bootstrapUrl: (frontendOrigin: string, input: SignBootstrapClaimsInput) => string
}

function defaultTtl(mode: DraftMode): number {
  return mode === 'live' ? 3600 : 86_400
}

function buildClaims(input: SignBootstrapClaimsInput): DraftTokenClaims {
  const nowSec = input.nowSec ?? Math.floor(Date.now() / 1000)
  const ttl = input.ttl ?? defaultTtl(input.mode)
  const exp = input.exp ?? (input.mode === 'live' ? liveBucketExp(nowSec, ttl) : nowSec + ttl)
  /** Live: stable signed URL within bucket (spec §9) — iat at bucket start, not wall `now`. */
  const iat = input.mode === 'live' && input.exp === undefined ? exp - ttl : nowSec
  return {
    mode: input.mode,
    destinationPath: input.destinationPath,
    iat,
    exp,
    ttl,
    refreshOnActivity: input.refreshOnActivity ?? true,
  }
}

/** Framework/CMS-neutral issuer surface for custom producer adapters (public API). */
export function createDraftProducer(config: DraftProducerAdapterConfig): DraftProducerAdapter {
  const bootstrapPath = config.bootstrapPath ?? DEFAULT_BOOTSTRAP_PATH

  return {
    signBootstrapToken(input) {
      const claims = buildClaims(input)
      const token = signToken(config.rootSecret, claims)
      return { ...claims, token }
    },
    bootstrapUrl(frontendOrigin, input) {
      const { token } = this.signBootstrapToken(input)
      const url = new URL(bootstrapPath, frontendOrigin.replace(/\/$/, ''))
      url.searchParams.set('token', token)
      return url.toString()
    },
  }
}
