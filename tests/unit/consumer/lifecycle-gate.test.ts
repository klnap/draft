import { describe, expect, it } from 'bun:test'

import { evaluateSoftLifecycleBypass } from '../../../src/consumer/lifecycle-gate'

describe('evaluateSoftLifecycleBypass', () => {
  it('clears session when lifecycle expired', () => {
    expect(
      evaluateSoftLifecycleBypass({
        nowSec: 2000,
        intentCookie: 'live',
        absExpCookie: '1000',
        surfaceCookie: 'embedded',
        fetchDest: 'iframe',
        pathname: '/draft',
        onDraftHost: false,
        gateQuery: null,
        docPass: false,
        isBlockedPublicDraftPath: true,
      }).action
    ).toBe('clear_session')
  })

  it('allows embedded iframe navigation', () => {
    expect(
      evaluateSoftLifecycleBypass({
        nowSec: 500,
        intentCookie: 'live',
        absExpCookie: '5000',
        surfaceCookie: 'embedded',
        fetchDest: 'iframe',
        pathname: '/draft',
        onDraftHost: false,
        gateQuery: null,
        docPass: false,
        isBlockedPublicDraftPath: true,
      })
    ).toEqual({ action: 'run_base', refreshLifecycle: true })
  })
})
