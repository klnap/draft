import { describe, expect, test } from 'bun:test'
import { authScopeMatchesSurface } from '../../../src/consumers/next/auth-scope'

describe('authScopeMatchesSurface', () => {
  test('matches global scope when resource matches and id is absent', () => {
    expect(
      authScopeMatchesSurface({ kind: 'global', resource: 'pages' }, { resource: 'pages' })
    ).toBe(true)
    expect(
      authScopeMatchesSurface({ kind: 'global', resource: 'pages' }, { resource: 'pages', id: '1' })
    ).toBe(false)
  })

  test('matches collection scope when resource and id match', () => {
    expect(
      authScopeMatchesSurface(
        { kind: 'collection', resource: 'posts', id: 'abc' },
        { resource: 'posts', id: 'abc' }
      )
    ).toBe(true)
    expect(
      authScopeMatchesSurface(
        { kind: 'collection', resource: 'posts', id: 'abc' },
        { resource: 'posts', id: 'other' }
      )
    ).toBe(false)
    expect(
      authScopeMatchesSurface(
        { kind: 'collection', resource: 'posts', id: 'abc' },
        { resource: 'pages', id: 'abc' }
      )
    ).toBe(false)
  })
})
