/**
 * App Router `GET /api/draft?token=…` — re-export from `@klnap/draft/consumers/next`.
 *
 * ```ts
 * await import('@/draft') in instrumentation register()
 * export { GET } from '@klnap/draft/consumers/next'
 * ```
 */

import { createDraftProxy } from '../proxy/create-draft-proxy'

let route: ((req: Request) => Promise<Response>) | undefined

export async function GET(req: Request): Promise<Response> {
  if (!route) {
    const draft = await createDraftProxy()
    route = (request) => draft.route(request)
  }
  return route(req)
}
