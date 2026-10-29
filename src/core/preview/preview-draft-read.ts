/** When preview gate is active, force draft reads; caller `draft: false` cannot bypass. */
export function enforcePreviewDraftReadOptions<T extends { draft?: boolean }>(
  opts: T,
  active: boolean
): T {
  if (!active) {
    if (opts.draft === true) {
      return { ...opts, draft: true }
    }
    return { ...opts, draft: false }
  }
  return { ...opts, draft: true }
}
