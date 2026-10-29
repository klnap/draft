/** Process-wide `defineDraft` registry (survives duplicate Turbopack module instances). */
const STORE_KEY = Symbol.for('@klnap/draft/defineDraft')

type StoreHost = typeof globalThis & {
  [STORE_KEY]?: unknown
}

function host(): StoreHost {
  return globalThis as StoreHost
}

export function readDraftStore(): unknown {
  return host()[STORE_KEY] ?? null
}

export function writeDraftStore(next: unknown): void {
  host()[STORE_KEY] = next
}

export function clearDraftStore(): void {
  delete host()[STORE_KEY]
}
