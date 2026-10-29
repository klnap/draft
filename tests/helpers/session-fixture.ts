import type { DraftSessionPayload } from '../../src/core/config/types'

export const TEST_SESSION_BINDING = {
  authScope: { kind: 'collection' as const, resource: 'projects', id: 'doc-1' },
  destinationPathname: '/pl/projekty/alfa',
  entrySlug: 'alfa',
}

export function testSessionPayload(
  partial: Pick<DraftSessionPayload, 'mode' | 'expiresAt' | 'ttl' | 'refreshOnActivity'>,
  binding = TEST_SESSION_BINDING
): DraftSessionPayload {
  return { ...partial, binding }
}
