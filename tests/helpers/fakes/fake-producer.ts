/**
 * External-style producer fixture: public adapter API only (no built-in producers).
 */
import {
  createDraftProducer,
  type DraftProducerAdapter,
  type SignBootstrapClaimsInput,
} from '../../../src/index'

export function createFakeProducerAdapter(rootSecret: string): DraftProducerAdapter {
  return createDraftProducer({ rootSecret })
}

export type { SignBootstrapClaimsInput }
