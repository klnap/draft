import {
  createDraftProducer,
  type DraftProducerAdapter,
  type SignBootstrapClaimsInput,
} from '../../../adapters/producer'
import type { DraftMode, DraftTokenClaims } from '../../../core/config/types'

export type SignDraftTokenInput = SignBootstrapClaimsInput & {
  rootSecret: string
}

function producerFor(input: { rootSecret: string }): DraftProducerAdapter {
  return createDraftProducer({ rootSecret: input.rootSecret })
}

export function signDraftBootstrapToken(
  input: SignDraftTokenInput
): DraftTokenClaims & { token: string } {
  const { rootSecret, ...claimsInput } = input
  return producerFor({ rootSecret }).signBootstrapToken(claimsInput)
}

export function draftBootstrapUrl(frontendOrigin: string, input: SignDraftTokenInput): string {
  const { rootSecret, ...claimsInput } = input
  return producerFor({ rootSecret }).bootstrapUrl(frontendOrigin, claimsInput)
}

export type { DraftMode }
