import type { DraftConsumerConfig } from '../config'
import { createDraftProxy } from './create-draft-proxy'

/** @deprecated Prefer `createDraftProxy(config)` then `.proxy`. */
export async function draftProxy(config: DraftConsumerConfig) {
  const draft = await createDraftProxy(config)
  return draft.proxy
}
