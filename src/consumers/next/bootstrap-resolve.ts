/** Host hook: resolve canonical collection document id from route slug (§9.0.1a). */
export type BootstrapResolveCollectionId = (
  resource: string,
  pathSlug: string
) => Promise<string | null> | string | null
