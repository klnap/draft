import type { DraftAuthScope } from '../../core/config/types'

/** Whether a session auth scope matches a preview surface (resource + optional id). */
export function authScopeMatchesSurface(
  scope: DraftAuthScope,
  input: { resource: string; id?: string }
): boolean {
  if (scope.resource !== input.resource) return false
  if (scope.kind === 'global') return !input.id
  return scope.id === input.id
}
