import { describe, expect, it } from 'bun:test'
import { NextRequest } from 'next/server'

import { createDraft } from '../../../../../src/consumers/next/create-draft'
import { NEXT_DRAFT_BYPASS_COOKIE } from '../../../../../src/consumers/next/lifecycle/next-integration'
import { SESSION_COOKIE_NAME } from '../../../../../src/core/config/constants'
import {
  DRAFT_COOKIE_ABS_EXP,
  DRAFT_COOKIE_INTENT,
  DRAFT_COOKIE_SURFACE,
} from '../../../../../src/core/lifecycle/constants'
import { sealSession } from '../../../../../src/core/session/session'
import { testSessionPayload } from '../../../../helpers/session-fixture'

const SECRET = 'test-root-secret-v1-golden!!'

const pathModeConfig = {
  secret: SECRET,
  preview: { liveUrl: 'http://localhost:3000' },
  secure: false,
}

function liveRequest(
  path: string,
  cookies: Record<string, string>,
  headers?: Record<string, string>
) {
  const req = new NextRequest(`http://localhost:3000${path}`, {
    headers: { host: 'localhost:3000', ...headers },
  })
  for (const [name, value] of Object.entries(cookies)) {
    req.cookies.set(name, value)
  }
  return req
}

describe('createDraftProxy full-page binding', () => {
  it('injects preview header when pathname matches sealed destination', () => {
    const draft = createDraft(pathModeConfig)
    const nowSec = Math.floor(Date.now() / 1000)
    const session = sealSession(
      SECRET,
      testSessionPayload({
        mode: 'live',
        expiresAt: nowSec + 3600,
        ttl: 3600,
        refreshOnActivity: true,
      })
    )
    const res = draft.proxy(
      liveRequest(
        '/pl/projekty/alfa',
        {
          [SESSION_COOKIE_NAME]: session,
          [NEXT_DRAFT_BYPASS_COOKIE]: '1',
          [DRAFT_COOKIE_INTENT]: 'live',
          [DRAFT_COOKIE_ABS_EXP]: String(nowSec + 3600),
          [DRAFT_COOKIE_SURFACE]: 'embedded',
        },
        { 'sec-fetch-dest': 'empty' }
      )
    )
    expect(res.status).toBe(200)
  })

  it('returns 404 when pathname does not match session binding', () => {
    const draft = createDraft(pathModeConfig)
    const nowSec = Math.floor(Date.now() / 1000)
    const session = sealSession(
      SECRET,
      testSessionPayload({
        mode: 'live',
        expiresAt: nowSec + 3600,
        ttl: 3600,
        refreshOnActivity: true,
      })
    )
    const res = draft.proxy(
      liveRequest(
        '/pl/projekty/other',
        { [SESSION_COOKIE_NAME]: session },
        {
          'sec-fetch-dest': 'document',
        }
      )
    )
    expect(res.status).toBe(404)
  })

  it('blocks /draft without session', () => {
    const draft = createDraft(pathModeConfig)
    const res = draft.proxy(liveRequest('/draft', {}))
    expect(res.status).toBe(404)
  })

  it('allows /draft when session binding is query surface', () => {
    const draft = createDraft(pathModeConfig)
    const nowSec = Math.floor(Date.now() / 1000)
    const session = sealSession(
      SECRET,
      testSessionPayload(
        {
          mode: 'live',
          expiresAt: nowSec + 3600,
          ttl: 3600,
          refreshOnActivity: true,
        },
        {
          authScope: { kind: 'collection', resource: 'projects', id: 'doc-1' },
          destinationPathname: '/draft',
          entrySlug: '',
        }
      )
    )
    const res = draft.proxy(
      liveRequest(
        '/draft?resource=projects&id=doc-1',
        {
          [SESSION_COOKIE_NAME]: session,
          [NEXT_DRAFT_BYPASS_COOKIE]: '1',
          [DRAFT_COOKIE_INTENT]: 'live',
          [DRAFT_COOKIE_ABS_EXP]: String(nowSec + 3600),
          [DRAFT_COOKIE_SURFACE]: 'embedded',
        },
        { 'sec-fetch-dest': 'document' }
      )
    )
    expect(res.status).toBe(200)
  })
})
