import type { PathStrategy } from './config'

/** Query-surface draft: public hits `/draft` are blocked unless a session exists. */
export function createDraftQueryLocalePathStrategy(): PathStrategy {
  return {
    blockPublicDraftPath: (pathname) => pathname === '/draft' || /\/draft(\/|$)/.test(pathname),
  }
}
